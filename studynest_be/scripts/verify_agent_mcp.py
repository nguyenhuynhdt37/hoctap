"""Verify bundled MCP transport; --live also reads public web/GitHub, never writes."""
import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agent.mcp_client import call, status


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = {'mcp': await status()}
    if not result['mcp']['connected']:
        raise RuntimeError('MCP handshake failed')
    if args.live:
        repo = await call('github_repository', {'owner': 'octocat', 'repo': 'Hello-World'})
        params = {'owner': 'octocat', 'repo': 'Hello-World', 'commit_sha': repo['commit_sha']}
        tree = await call('github_tree', params)
        path = next(item['path'] for item in tree['items'] if item['type'] == 'blob')
        file = await call('github_read_file', {**params, 'path': path})
        web = await call('web_search', {'query': 'MDN JavaScript Array map', 'limit': 2})
        result.update(github={'repository': repo['repository'], 'commit_sha': repo['commit_sha'],
            'file': path, 'read_characters': len(file['content']), 'tests_executed': False},
            web={'results': len(web['items']), 'urls': [row['url'] for row in web['items']]})
    encoded = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded + '\n')
    print(encoded)


if __name__ == '__main__':
    asyncio.run(main())
