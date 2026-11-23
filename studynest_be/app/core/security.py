import base64
import binascii
import hashlib
import hmac
import json
import re
import secrets
import time
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Dict, Literal
from urllib.parse import quote, urlsplit

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from loguru import logger
from redis.exceptions import RedisError
from starlette.requests import HTTPConnection

import bcrypt
import jwt

from app.core.redis import get_redis
from app.core.settings import settings
from app.libs.formats.datetime import now_tzinfo


class SecurityService:
    def __init__(self):
        self.secret_key = settings.JWT_SECRET or settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = float(settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # ✅ Hỗ trợ async context (dùng được async with)
    async def __aenter__(self):
        # Có thể mở resource async ở đây, ví dụ Redis, httpx.AsyncClient, v.v.
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Dọn dẹp tài nguyên async (VD: await client.aclose())
        return False  # Không nuốt exception

    # 🔐 JWT
    async def create_access_token(self, sub: str, sid: str, jkt: str | None = None) -> str:
        expire = now_tzinfo() + timedelta(minutes=self.access_token_expire_minutes)
        payload: Dict[str, Any] = {
            "sub": sub,
            "sid": sid,
            "iat": now_tzinfo(),
            "exp": expire
        }
        if jkt is not None:
            payload["cnf"] = {"jkt": jkt}
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return str(token)

    async def decode_access_token(self, token: str, *, verify_exp: bool = True) -> Dict[str, Any]:
        try:
            return jwt.decode(
                token, self.secret_key, algorithms=[self.algorithm],
                options={"require": ["exp", "sub", "sid"], "verify_exp": verify_exp},
            )
        except jwt.ExpiredSignatureError:
            raise ValueError("Token expired") from None
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token") from None

    # 🔑 REFRESH TOKEN & SESSIONS
    @staticmethod
    async def generate_refresh_token() -> str:
        return secrets.token_urlsafe(64)

    @staticmethod
    async def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    # 🔑 PASSWORD
    @staticmethod
    async def hash_password(plain: str) -> str:
        return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    async def verify_password(plain: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False

    # 🔢 OTP
    @staticmethod
    async def generate_otp() -> str:
        return str(secrets.randbelow(10**6)).zfill(6)


class AuthError(HTTPException):
    def __init__(self, code: str, *, use_dpop_proof: bool = False, clear_cookies: bool = True):
        detail = {
            "invalid_token": "Thông tin xác thực không hợp lệ.",
            "invalid_dpop_proof": "DPoP proof không hợp lệ hoặc bị thiếu.",
            "session_revoked": "Phiên đăng nhập đã bị thu hồi.",
            "token_expired": "Access token đã hết hạn.",
        }[code]
        error = "use_dpop_proof" if use_dpop_proof else (
            "invalid_dpop_proof" if code == "invalid_dpop_proof" else "invalid_token"
        )
        super().__init__(401, detail, headers={
            "WWW-Authenticate": f'DPoP error="{error}"',
            "Cache-Control": "no-store",
        })
        self.code = code
        self.clear_cookies = clear_cookies


def auth_error_response(request: Request, exc: AuthError) -> JSONResponse:
    return JSONResponse({"detail": exc.detail, "code": exc.code}, 401, headers=exc.headers)


def require_active_account(user) -> None:
    if user is None or user.deleted_at is not None:
        raise AuthError("session_revoked")
    if user.is_banned:
        until = user.banned_until
        raise HTTPException(403, detail={
            "error_code": "ACCOUNT_BANNED_TEMPORARY" if until else "ACCOUNT_BANNED_PERMANENT",
            "message": "Tài khoản bị khóa",
            "banned_until": until.isoformat() if until else None,
            "reason": user.banned_reason,
            "is_permanent": until is None,
        }, headers={"Cache-Control": "no-store"})


def secret_matches(value: object, expected: object) -> bool:
    if not isinstance(value, str) or not isinstance(expected, str):
        return False
    try:
        return hmac.compare_digest(value.encode("ascii"), expected.encode("ascii"))
    except UnicodeEncodeError:
        return False


_UNRESERVED = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
_PERCENT_ESCAPE = re.compile(r"%([a-fA-F0-9]{2})")
_BASE64URL = re.compile(r"[A-Za-z0-9_-]+")


def _normalize_dpop_uri(uri: str, *, allow_websocket: bool = False) -> tuple[str, str, int, str]:
    if (
        not isinstance(uri, str) or not uri.isascii()
        or any(ord(c) <= 32 or ord(c) == 127 for c in uri)
        or any(c in uri for c in ("?", "#", "\\"))
    ):
        raise ValueError("Invalid DPoP URI")
    parts = urlsplit(uri)
    scheme = {"ws": "http", "wss": "https"}.get(parts.scheme, parts.scheme) if allow_websocket else parts.scheme
    host = parts.hostname
    if scheme not in {"http", "https"} or not host or "@" in parts.netloc:
        raise ValueError("Invalid DPoP URI")
    port = parts.port if parts.port is not None else (443 if scheme == "https" else 80)

    def normalize_escape(match: re.Match) -> str:
        char = chr(int(match[1], 16))
        return char if char in _UNRESERVED else "%" + match[1].upper()

    path = parts.path or "/"
    if re.search(r"%(?![a-fA-F0-9]{2})", path):
        raise ValueError("Invalid DPoP URI")
    return scheme, host, port, _PERCENT_ESCAPE.sub(normalize_escape, path)


def dpop_target(connection: HTTPConnection) -> str:
    # Proxy and Host headers are client input. Pin the external origin in server config.
    origin = (settings.PUBLIC_API_URL or settings.BACKEND_URL).rstrip("/")
    if _normalize_dpop_uri(origin, allow_websocket=True)[3] != "/":
        raise ValueError("DPoP API URL must be an origin")
    raw_path = connection.scope.get("raw_path")
    path = raw_path.decode("ascii") if raw_path is not None else quote(
        connection.scope["path"], safe="/:@!$&'()*+,;=-._~"
    )
    if not path.startswith("/"):
        raise ValueError("Invalid request path")
    return origin + settings.DPOP_STRIPPED_PUBLIC_PATH_PREFIX + path


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode_b64url(value: str) -> bytes:
    if not isinstance(value, str) or not _BASE64URL.fullmatch(value):
        raise ValueError("Invalid base64url")
    decoded = base64.b64decode(value + "=" * (-len(value) % 4), altchars=b"-_", validate=True)
    if _b64url(decoded) != value:
        raise ValueError("Invalid base64url")
    return decoded


def _unique_object(pairs: list[tuple[str, Any]]) -> dict:
    result = dict(pairs)
    if len(result) != len(pairs):
        raise ValueError("Duplicate JWT members")
    return result


@dataclass(frozen=True)
class DPoPProof:
    jkt: str
    jti: str


def verify_dpop_proof(
    proof: str, *, method: str, target: str,
    hash_claim: Literal["ath", "rth"] | None = None, token: str | None = None,
) -> DPoPProof:
    try:
        if not isinstance(proof, str) or len(proof) > 4096:
            raise ValueError
        header_segment, payload_segment, signature_segment = proof.split(".")
        header = json.loads(_decode_b64url(header_segment).decode("utf-8"), object_pairs_hook=_unique_object)
        if not isinstance(header, dict) or header.get("typ") != "dpop+jwt" or header.get("alg") != "ES256":
            raise ValueError
        if "crit" in header or "b64" in header:
            raise ValueError

        jwk = header.get("jwk")
        if not isinstance(jwk, dict) or jwk.get("kty") != "EC" or jwk.get("crv") != "P-256" or "d" in jwk:
            raise ValueError
        x, y = _decode_b64url(jwk.get("x")), _decode_b64url(jwk.get("y"))
        signature = _decode_b64url(signature_segment)
        if len(x) != 32 or len(y) != 32 or len(signature) != 64:
            raise ValueError
        key = ec.EllipticCurvePublicNumbers(
            int.from_bytes(x, "big"), int.from_bytes(y, "big"), ec.SECP256R1(),
        ).public_key()
        key.verify(
            encode_dss_signature(int.from_bytes(signature[:32], "big"), int.from_bytes(signature[32:], "big")),
            f"{header_segment}.{payload_segment}".encode("ascii"), ec.ECDSA(hashes.SHA256()),
        )

        claims = json.loads(_decode_b64url(payload_segment).decode("utf-8"), object_pairs_hook=_unique_object)
        if not isinstance(claims, dict) or claims.get("htm") != method:
            raise ValueError
        if _normalize_dpop_uri(claims.get("htu")) != _normalize_dpop_uri(target, allow_websocket=True):
            raise ValueError
        iat, jti = claims.get("iat"), claims.get("jti")
        if type(iat) is not int or abs(time.time() - iat) > settings.DPOP_IAT_LEEWAY_SECONDS:
            raise ValueError
        if not isinstance(jti, str) or len(jti) < 16:
            raise ValueError
        jti.encode("utf-8")  # Reject invalid Unicode before a Redis command is built.
        if any(name in claims for name in {"ath", "rth"} - {hash_claim}):
            raise ValueError
        if hash_claim and (
            not token or not secret_matches(claims.get(hash_claim), _b64url(hashlib.sha256(token.encode()).digest()))
        ):
            raise ValueError

        public_members = {name: jwk[name] for name in ("crv", "kty", "x", "y")}
        canonical = json.dumps(public_members, sort_keys=True, separators=(",", ":")).encode("ascii")
        return DPoPProof(jkt=_b64url(hashlib.sha256(canonical).digest()), jti=jti)
    except (ValueError, InvalidSignature, OverflowError, RecursionError, binascii.Error):
        raise ValueError("Invalid DPoP proof") from None


def dpop_header(connection: HTTPConnection) -> str | None:
    proofs = connection.headers.getlist("dpop")
    if len(proofs) > 1:
        raise AuthError("invalid_dpop_proof")
    return proofs[0] if proofs else None


async def authenticate_dpop(
    connection: HTTPConnection, proof: str | None, *,
    hash_claim: Literal["ath", "rth"] | None = None, token: str | None = None,
    expected_jkt: str | None = None, allow_read_fallback: bool = False,
) -> str:
    if proof is None:
        raise AuthError("invalid_dpop_proof", use_dpop_proof=True)
    method = connection.scope.get("method", "GET")
    try:
        verified = verify_dpop_proof(
            proof, method=method, target=dpop_target(connection), hash_claim=hash_claim, token=token,
        )
    except ValueError:
        raise AuthError("invalid_dpop_proof") from None
    if expected_jkt is not None and not secret_matches(verified.jkt, expected_jkt):
        raise AuthError("invalid_dpop_proof")

    # A proof issued at the far end of the leeway can remain valid for twice the leeway.
    ttl = max(settings.DPOP_JTI_TTL_SECONDS, 2 * settings.DPOP_IAT_LEEWAY_SECONDS)
    try:
        accepted = await get_redis().set(f"auth:dpop:jti:{verified.jti}", "1", nx=True, ex=ttl)
    except RedisError:
        if (allow_read_fallback and connection.scope["type"] == "http" and method == "GET"
                and settings.DPOP_JTI_FAIL_OPEN_ON_GET):
            logger.warning("DPoP replay store unavailable; permitted configured HTTP GET fallback")
            return verified.jkt
        raise HTTPException(503, "Chưa thể xác thực yêu cầu.", headers={"Cache-Control": "no-store"}) from None
    if not accepted:
        raise AuthError("invalid_dpop_proof")
    return verified.jkt
