"""Never let legacy query-string credentials reach ASGI server logs."""
import logging
import re

_QUERY_SECRET = re.compile(r'([?&](?:access_token|refresh_token|token|api_key|key)=)[^\s&"\']+', re.IGNORECASE)
_BEARER = re.compile(r'(Bearer\s+)[A-Za-z0-9._~+/=-]+', re.IGNORECASE)


def redact(value):
    if isinstance(value, str):
        return _BEARER.sub(r'\1[REDACTED]', _QUERY_SECRET.sub(r'\1[REDACTED]', value))
    if isinstance(value, tuple): return tuple(redact(x) for x in value)
    if isinstance(value, dict): return {k: '[REDACTED]' if str(k).lower() in {'authorization','access_token','refresh_token','token','api_key'} else redact(v) for k,v in value.items()}
    return value


class SecretFilter(logging.Filter):
    def filter(self, record):
        record.msg = redact(record.msg)
        record.args = redact(record.args)
        return True


def install_server_log_redaction():
    for name in ('uvicorn.access','uvicorn.error','uvicorn'):
        logger=logging.getLogger(name)
        if not any(isinstance(x,SecretFilter) for x in logger.filters):logger.addFilter(SecretFilter())
