import logging
from app.core.log_redaction import SecretFilter,redact


def test_server_url_and_bearer_tokens_are_redacted_preserving_nonsecret_context():
    record=logging.LogRecord('uvicorn.error',logging.INFO,'',1,'WebSocket %s [accepted]',('/ws?access_token=secret.jwt&role_name=USER',),None)
    assert SecretFilter().filter(record)
    assert 'secret.jwt' not in record.getMessage() and 'role_name=USER' in record.getMessage()
    assert 'abcd' not in redact('Authorization: Bearer abcd')
    assert redact({'token':'abcd','path':'/learning'})=={'token':'[REDACTED]','path':'/learning'}


def test_dpop_authorization_and_proof_are_redacted():
    assert redact("Authorization: DPoP access.jwt.value") == "Authorization: DPoP [REDACTED]"
    assert redact({"DPoP": "proof.jwt.value", "refresh_token": "refresh"}) == {
        "DPoP": "[REDACTED]", "refresh_token": "[REDACTED]",
    }


def test_google_login_credential_is_redacted():
    assert redact({"credential": "id.jwt.token"}) == {"credential": "[REDACTED]"}


def test_encoded_query_aliases_and_sensitive_headers_are_redacted():
    assert redact("/ws?%61ccess%5Ftoken=private&role_name=USER&%74oken=other") == (
        "/ws?%61ccess%5Ftoken=[REDACTED]&role_name=USER&%74oken=[REDACTED]"
    )
    assert redact("GET /api/v1/agent/github/callback?%63ode=provider-code&state=private HTTP/1.1") == (
        "GET /api/v1/agent/github/callback?%63ode=[REDACTED]&state=[REDACTED] HTTP/1.1"
    )
    assert "private" not in redact("Cookie: access_token=private")
    assert "private" not in redact("Sec-WebSocket-Protocol: ticket.private")


def test_exception_rendering_redacts_query_credentials():
    import sys

    try:
        raise ValueError("/ws?%74oken=private")
    except ValueError:
        record = logging.LogRecord("uvicorn.error", logging.ERROR, "", 1, "request failed", (), sys.exc_info())
    assert SecretFilter().filter(record)
    assert "/ws?%74oken=private" not in logging.Formatter().format(record)
