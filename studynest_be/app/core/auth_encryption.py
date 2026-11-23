"""Authenticated encryption for short-lived auth results stored outside the worker."""
import base64
import binascii
import json
import secrets

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from app.core.settings import settings


def _cipher() -> AESGCM:
    secret = settings.SECRET_KEY or settings.JWT_SECRET
    if not secret:
        raise RuntimeError("Auth storage encryption requires a server secret")
    key = HKDF(
        algorithm=hashes.SHA256(), length=32, salt=None, info=b"maymay:auth-storage:v1",
    ).derive(secret.encode())
    return AESGCM(key)


def seal_auth_payload(payload: dict, binding: str) -> str:
    nonce = secrets.token_bytes(12)
    ciphertext = _cipher().encrypt(nonce, json.dumps(payload).encode(), binding.encode())
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def open_auth_payload(value: str | bytes | None, binding: str) -> dict | None:
    if not value:
        return None
    try:
        data = base64.b64decode(value, altchars=b"-_", validate=True)
        payload = json.loads(_cipher().decrypt(data[:12], data[12:], binding.encode()))
        return payload if isinstance(payload, dict) else None
    except (InvalidTag, ValueError, TypeError, binascii.Error):
        return None
