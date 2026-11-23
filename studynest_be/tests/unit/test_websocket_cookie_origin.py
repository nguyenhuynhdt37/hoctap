from types import SimpleNamespace

import pytest

from app.core import deps
from app.core.settings import settings


class _Headers(dict):
    def getlist(self, name):
        value = self.get(name)
        return [value] if value is not None else []


def _ws(cookie=None, origin=None, query=None):
    headers = _Headers()
    if origin:
        headers["origin"] = origin
    return SimpleNamespace(
        scope={"type": "websocket"},
        headers=headers,
        cookies={"access_token": cookie} if cookie else {},
        query_params=query or {},
    )


@pytest.fixture(autouse=True)
def _flags(monkeypatch):
    monkeypatch.setattr(settings, "AUTH_ALLOW_COOKIE_COMPAT", True)
    monkeypatch.setattr(settings, "AUTH_ALLOW_UNBOUND_BEARER", True)
    monkeypatch.setattr(settings, "CORS_ALLOWED_ORIGINS", "https://app.example.com")
    monkeypatch.setattr(settings, "FRONTEND_URL", "")


def test_cookie_handshake_accepted_from_trusted_origin():
    creds = deps._connection_credentials(_ws(cookie="tok", origin="http://localhost:3000"))
    assert creds is not None and creds.scheme == "cookie" and creds.token == "tok"
    creds = deps._connection_credentials(_ws(cookie="tok", origin="https://app.example.com/"))
    assert creds is not None and creds.scheme == "cookie"


@pytest.mark.parametrize("origin", [None, "", "https://evil.example", "http://localhost:3000.evil.example"])
def test_cookie_handshake_rejected_from_foreign_or_missing_origin(origin):
    assert deps._connection_credentials(_ws(cookie="tok", origin=origin)) is None


def test_cookie_handshake_rejected_when_compat_disabled(monkeypatch):
    monkeypatch.setattr(settings, "AUTH_ALLOW_COOKIE_COMPAT", False)
    assert deps._connection_credentials(_ws(cookie="tok", origin="http://localhost:3000")) is None


def test_query_bearer_still_wins_over_cookie():
    creds = deps._connection_credentials(_ws(cookie="c", origin="http://localhost:3000", query={"token": "q"}))
    assert creds is not None and creds.scheme == "bearer" and creds.token == "q"
