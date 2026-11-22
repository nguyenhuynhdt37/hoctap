import logging
from app.core.log_redaction import SecretFilter,redact


def test_server_url_and_bearer_tokens_are_redacted_preserving_nonsecret_context():
    record=logging.LogRecord('uvicorn.error',logging.INFO,'',1,'WebSocket %s [accepted]',('/ws?access_token=secret.jwt&role_name=USER',),None)
    assert SecretFilter().filter(record)
    assert 'secret.jwt' not in record.getMessage() and 'role_name=USER' in record.getMessage()
    assert 'abcd' not in redact('Authorization: Bearer abcd')
    assert redact({'token':'abcd','path':'/learning'})=={'token':'[REDACTED]','path':'/learning'}
