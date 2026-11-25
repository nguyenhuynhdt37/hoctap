"""One generic door to the application's own API, so new features need no new agent tool.

The assistant discovers operations from the live OpenAPI schema (every route added to the app shows up
automatically) and calls them in-process as the signed-in user. Sensitive writes are refused by
`policy.deny_api` before anything is sent.
"""
import json
import re
from urllib.parse import quote, urlencode

from fastapi import HTTPException

from app.agent import policy

API_PREFIX = '/api/v1'
MAX_RESPONSE_CHARS = 30_000


def _schema():
    from app.main import app
    return app.openapi()


def _resolve(schema, node, depth=0):
    """Compact view of a JSON schema (property names + types) so the model can build a request body."""
    if not isinstance(node, dict) or depth > 3:
        return {}
    if '$ref' in node:
        name = node['$ref'].rsplit('/', 1)[-1]
        return _resolve(schema, schema.get('components', {}).get('schemas', {}).get(name, {}), depth + 1)
    if 'properties' in node:
        required = set(node.get('required', []))
        return {key: {'type': value.get('type') or ('ref' if '$ref' in value else 'any'),
                      **({'required': True} if key in required else {}),
                      **({'enum': value['enum']} if 'enum' in value else {})}
                for key, value in list(node['properties'].items())[:40]}
    if node.get('type') == 'array':
        return {'array_of': _resolve(schema, node.get('items', {}), depth + 1)}
    return {'type': node.get('type', 'any')}


def search_operations(query, limit=12):
    schema = _schema()
    words = [w[:-1] if w.endswith('s') and len(w) > 3 else w for w in re.split(r'[\W_]+', policy.fold(query)) if len(w) > 1]
    found = []
    for path, methods in schema.get('paths', {}).items():
        for method, op in methods.items():
            if method.upper() not in {'GET', 'POST', 'PUT', 'PATCH', 'DELETE'}:
                continue
            reason = policy.deny_api(method.upper(), API_PREFIX + path)
            if reason is not None and policy.api_hidden(API_PREFIX + path):
                continue
            haystack = policy.fold(' '.join([path.replace('_', ' '), op.get('summary', ''), op.get('description', '')[:200],
                                             ' '.join(op.get('tags', [])), op.get('operationId', '')]))
            score = sum(haystack.count(w) for w in words)
            if words and not score:
                continue
            body = (op.get('requestBody', {}).get('content', {}).get('application/json', {}) or {}).get('schema')
            found.append((score, {
                'method': method.upper(), 'path': path, 'summary': op.get('summary', ''),
                'parameters': [{'name': p['name'], 'in': p['in'], **({'required': True} if p.get('required') else {})}
                               for p in op.get('parameters', [])][:12],
                **({'body': _resolve(schema, body)} if body else {}),
                **({'blocked': reason} if reason else {}),
            }))
    found.sort(key=lambda item: -item[0])
    return [row for _, row in found[:limit]]


def _clean_path(path):
    path = (path or '').strip()
    if path.startswith(API_PREFIX):
        path = path[len(API_PREFIX):]
    if not path.startswith('/') or '..' in path or '\\' in path or '//' in path or re.search(r'%2e|%2f|%5c|[\r\n\s]', path, re.I):
        raise HTTPException(422, 'Đường dẫn API không hợp lệ')
    return path


async def call_api(principal, method, path, query=None, body=None):
    method = method.upper()
    path = _clean_path(path)
    full = API_PREFIX + path
    policy.enforce_api(method, full, body)
    from app.main import app
    qs = urlencode({k: v for k, v in (query or {}).items() if v is not None}, doseq=True)
    payload = json.dumps(body).encode() if body is not None and method != 'GET' else b''
    headers = [(b'host', b'localhost'), (b'accept', b'application/json'), (b'user-agent', b'maymay-agent')]
    if payload:
        headers += [(b'content-type', b'application/json'), (b'content-length', str(len(payload)).encode())]
    scope = {'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1', 'method': method, 'scheme': 'http',
             'path': quote(full, safe='/'), 'raw_path': quote(full, safe='/').encode(), 'root_path': '',
             'query_string': qs.encode(), 'headers': headers, 'client': ('127.0.0.1', 0), 'server': ('localhost', 80),
             'maymay_agent_principal': principal}
    sent, chunks, status = False, [], 500

    async def receive():
        nonlocal sent
        if sent:
            return {'type': 'http.disconnect'}
        sent = True
        return {'type': 'http.request', 'body': payload, 'more_body': False}

    async def send(message):
        nonlocal status
        if message['type'] == 'http.response.start':
            status = message['status']
        elif message['type'] == 'http.response.body':
            chunks.append(message.get('body', b''))

    await app(scope, receive, send)
    raw = b''.join(chunks)[:MAX_RESPONSE_CHARS * 4].decode('utf-8', 'replace')
    try:
        data = json.loads(raw) if raw else None
    except ValueError:
        data = raw[:MAX_RESPONSE_CHARS]
    text = json.dumps(data, ensure_ascii=False, default=str)
    if len(text) > MAX_RESPONSE_CHARS:
        data, truncated = text[:MAX_RESPONSE_CHARS], True
    else:
        truncated = False
    return {'status': status, 'ok': 200 <= status < 300, 'data': data, 'truncated': truncated}
