"""Keep credentials out of ASGI server logs."""
import logging
import re
from urllib.parse import unquote_plus

_QUERY_PARAMETER = re.compile(r"""([?&])([^?=&\s"'#]+)=([^&\s"'#]*)""")
_AUTHORIZATION = re.compile(r"((?:Bearer\s+|DPoP(?::)?\s+))[A-Za-z0-9._~+/=-]+", re.IGNORECASE)
_SENSITIVE_HEADER = re.compile(
    r"""((?:\b(?:cookie|set-cookie|sec-websocket-protocol|x-auth-internal-refresh)\b)['"]?\s*:\s*)[^\r\n]+""",
    re.IGNORECASE,
)
_GITHUB_CALLBACK_QUERY = re.compile(r"""(/(?:api(?:/v1)?/agent|auth)/github/callback/?)(\?[^\s"'#]*)""",
                                    re.IGNORECASE)
_SECRET_FIELDS = {
    "authorization", "access_token", "refresh_token", "token", "api_key", "key", "dpop",
    "cookie", "set-cookie", "sec-websocket-protocol", "code_verifier", "exchange_code",
    "x-auth-internal-refresh", "handle", "password", "new_password", "otp_code", "credential",
}
_OAUTH_CALLBACK_FIELDS = _SECRET_FIELDS | {"code", "state", "error_description", "handle"}


def _parameter_name(value: str) -> str:
    return unquote_plus(value).casefold()


def _redact_query_parameter(match: re.Match, fields: set[str] = _SECRET_FIELDS) -> str:
    if _parameter_name(match[2]) in fields:
        return f"{match[1]}{match[2]}=[REDACTED]"
    return match[0]


def redact(value):
    if isinstance(value, str):
        value = _GITHUB_CALLBACK_QUERY.sub(
            lambda match: match[1] + _QUERY_PARAMETER.sub(
                lambda parameter: _redact_query_parameter(parameter, _OAUTH_CALLBACK_FIELDS), match[2],
            ),
            value,
        )
        value = _QUERY_PARAMETER.sub(_redact_query_parameter, value)
        value = _SENSITIVE_HEADER.sub(r'\1[REDACTED]', value)
        return _AUTHORIZATION.sub(r'\1[REDACTED]', value)
    if isinstance(value, tuple):
        return tuple(redact(item) for item in value)
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, dict):
        fields = _SECRET_FIELDS | {"code"} if any(
            _parameter_name(str(key)) == "code_verifier" for key in value
        ) else _SECRET_FIELDS
        return {
            key: "[REDACTED]" if _parameter_name(str(key)) in fields else redact(item)
            for key, item in value.items()
        }
    return value


class SecretFilter(logging.Filter):
    def filter(self, record):
        record.msg = redact(record.msg)
        record.args = redact(record.args)
        if record.exc_info:
            record.exc_text = redact(logging.Formatter().formatException(record.exc_info))
        return True


def install_server_log_redaction():
    for name in ('uvicorn.access', 'uvicorn.error', 'uvicorn'):
        logger = logging.getLogger(name)
        if not any(isinstance(item, SecretFilter) for item in logger.filters):
            logger.addFilter(SecretFilter())
