import base64
import hashlib
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import Request

from app.core import security
from app.core.settings import settings


URL = "https://api.example/api/v1/auth/me"


def b64(value):
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def public_jwk(key):
    coordinates = key.public_key().public_numbers()
    return {
        "kty": "EC", "crv": "P-256",
        "x": b64(coordinates.x.to_bytes(32, "big")),
        "y": b64(coordinates.y.to_bytes(32, "big")),
    }


@pytest.fixture
def key():
    return ec.generate_private_key(ec.SECP256R1())


def test_valid_proof_uses_configured_origin_and_rfc7638_thumbprint(key, monkeypatch):
    monkeypatch.setattr(settings, "PUBLIC_API_URL", "https://api.example")
    request = Request({
        "type": "http", "method": "GET", "scheme": "http",
        "path": "/api/v1/auth/me", "raw_path": b"/api/v1/auth/me",
        "headers": [(b"host", b"attacker.invalid"), (b"x-forwarded-host", b"attacker.invalid")],
    })
    jwk = public_jwk(key)
    proof = jwt.encode({
        "htm": "GET", "htu": "https://API.Example:443/api/v1/auth/%6de",
        "iat": int(time.time()), "jti": "0123456789abcdef",
    }, key, algorithm="ES256", headers={"typ": "dpop+jwt", "jwk": jwk})
    canonical = f'{{"crv":"P-256","kty":"EC","x":"{jwk["x"]}","y":"{jwk["y"]}"}}'
    assert security.verify_dpop_proof(
        proof, method=request.method, target=security.dpop_target(request),
    ).jkt == b64(hashlib.sha256(canonical.encode()).digest())


@pytest.mark.parametrize("case", [
    "method", "uri", "query", "old", "future", "short_jti", "private_key",
    "wrong_key", "wrong_typ", "none", "HS256", "ath", "rth",
])
def test_rejects_invalid_proof(key, case):
    algorithm = "ES256"
    signing_key = key
    header = {"typ": "dpop+jwt", "jwk": public_jwk(key)}
    claims = {"htm": "GET", "htu": URL, "iat": int(time.time()), "jti": "0123456789abcdef"}
    options = {}
    if case == "method":
        claims["htm"] = "POST"
    elif case == "uri":
        claims["htu"] = URL.replace("api.example", "other.example")
    elif case == "query":
        claims["htu"] += "?x=1"
    elif case == "old":
        claims["iat"] -= 61
    elif case == "future":
        claims["iat"] += 62
    elif case == "short_jti":
        claims["jti"] = "short"
    elif case == "private_key":
        header["jwk"]["d"] = b64(b"x" * 32)
    elif case == "wrong_key":
        signing_key = ec.generate_private_key(ec.SECP256R1())
    elif case == "wrong_typ":
        header["typ"] = "JWT"
    elif case in {"none", "HS256"}:
        algorithm = case
        signing_key = "" if case == "none" else "x" * 32
    elif case in {"ath", "rth"}:
        claims[case] = b64(hashlib.sha256(b"other token").digest())
        options = {"hash_claim": case, "token": "test token"}

    proof = jwt.encode(claims, signing_key, algorithm=algorithm, headers=header)
    with pytest.raises(ValueError):
        security.verify_dpop_proof(proof, method="GET", target=URL, **options)


def test_stripped_proxy_path_uses_explicit_public_prefix(monkeypatch):
    monkeypatch.setattr(settings, "PUBLIC_API_URL", "https://api.example")
    monkeypatch.setattr(settings, "DPOP_STRIPPED_PUBLIC_PATH_PREFIX", "/edge")
    request = Request({
        "type": "http", "path": "/api/v1/auth/me", "raw_path": b"/api/v1/auth/%6de",
        "root_path": "/unrelated", "headers": [(b"x-forwarded-prefix", b"/untrusted")],
    })
    assert security.dpop_target(request) == "https://api.example/edge/api/v1/auth/%6de"
    monkeypatch.setattr(settings, "DPOP_STRIPPED_PUBLIC_PATH_PREFIX", "")
    assert security.dpop_target(request) == "https://api.example/api/v1/auth/%6de"
