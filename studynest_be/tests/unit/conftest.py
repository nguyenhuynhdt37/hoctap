import base64
import hashlib
import json
import time
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import Request

from app.core import security
from app.core.settings import settings


@pytest.fixture
def dpop_login(monkeypatch):
    origin = "https://api.example.test"
    monkeypatch.setattr(settings, "PUBLIC_API_URL", origin)
    monkeypatch.setattr(settings, "DPOP_STRIPPED_PUBLIC_PATH_PREFIX", "")
    monkeypatch.setattr(settings, "AUTH_ALLOW_COOKIE_COMPAT", False)
    monkeypatch.setattr(settings, "AUTH_ALLOW_UNBOUND_BEARER", False)

    claimed_jtis = set()

    async def claim_jti(key, value, *, nx, ex):
        assert nx and ex > 0 and key.startswith("auth:dpop:jti:")
        if key in claimed_jtis:
            return False
        claimed_jtis.add(key)
        return True

    monkeypatch.setattr(security, "get_redis", lambda: SimpleNamespace(set=claim_jti))
    signer = ec.generate_private_key(ec.SECP256R1())
    jwk = jwt.algorithms.ECAlgorithm.to_jwk(signer.public_key(), as_dict=True)
    public_members = {name: jwk[name] for name in ("crv", "kty", "x", "y")}
    canonical = json.dumps(public_members, separators=(",", ":")).encode("ascii")
    jkt = base64.urlsafe_b64encode(hashlib.sha256(canonical).digest()).rstrip(b"=").decode("ascii")

    def request(endpoint):
        path = f"/api/v1/auth/{endpoint}"
        proof = jwt.encode(
            {"htm": "POST", "htu": origin + path, "iat": int(time.time()), "jti": uuid4().hex},
            signer, algorithm="ES256", headers={"typ": "dpop+jwt", "jwk": jwk},
        )
        return Request({
            "type": "http", "method": "POST", "path": path,
            "headers": [(b"dpop", proof.encode("ascii"))], "client": ("192.0.2.10", 12345),
        })

    return SimpleNamespace(request=request, jkt=jkt)
