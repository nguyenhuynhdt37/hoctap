"""R2 object storage with a single canonical upload tree."""

import asyncio
import mimetypes
import re
import unicodedata
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import PurePosixPath
from urllib.parse import quote
from uuid import uuid4

from fastapi import HTTPException
from loguru import logger

from app.core.settings import settings
from app.services.shares.storage_cache import StorageCache


class FileStorageService:
    def __init__(self):
        self.provider = "r2"
        self._r2 = None

    def _client(self):
        if self._r2 is None:
            required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]
            missing = [name for name in required if not getattr(settings, name).strip()]
            if missing:
                raise HTTPException(503, "Chưa cấu hình R2: " + ", ".join(missing))
            if not re.fullmatch(r"[a-fA-F0-9]{32}", settings.R2_ACCOUNT_ID):
                raise HTTPException(503, "R2_ACCOUNT_ID không hợp lệ.")
            import boto3
            from botocore.config import Config

            self._r2 = boto3.client(
                "s3", endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY, region_name="auto",
                verify=settings.R2_CA_BUNDLE or True,
                config=Config(signature_version="s3v4", s3={"addressing_style": "path"},
                              request_checksum_calculation="when_required",
                              response_checksum_validation="when_required",
                              connect_timeout=10, read_timeout=120,
                              retries={"mode": "standard", "max_attempts": 3}),
            )
        return self._r2

    @staticmethod
    def file_category(file_name, mime_type=None):
        mime = mime_type or mimetypes.guess_type(file_name)[0] or ""
        suffix = PurePosixPath(file_name).suffix.lower()
        if mime.startswith("image/"):
            return "images"
        if mime.startswith("video/"):
            return "videos"
        if mime.startswith("audio/"):
            return "audio"
        if suffix in {".zip", ".rar", ".7z", ".gz", ".tar"}:
            return "archives"
        if mime.startswith("text/") or suffix in {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".epub"}:
            return "documents"
        return "other"

    @staticmethod
    def clean_filename(file_name):
        name = str(file_name).replace("\\", "/").rsplit("/", 1)[-1]
        name = re.sub(r"^(?:[a-fA-F0-9-]{32,36}_)+", "", name)
        name = unicodedata.normalize("NFKD", name.replace("đ", "d").replace("Đ", "D"))
        name = name.encode("ascii", "ignore").decode().lower()
        suffix = PurePosixPath(name).suffix
        suffix = suffix if re.fullmatch(r"\.[a-z0-9]{1,10}", suffix) else ""
        stem = name[:-len(suffix)] if suffix else name
        stem = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")[:100] or "file"
        return stem + suffix

    @classmethod
    def object_key(cls, path_parts, file_name, mime_type=None, *, asset_id=None):
        parts = [part for value in path_parts for part in str(value).split("/") if part]
        if not parts or any(not re.fullmatch(r"[\w-]+", part) for part in parts):
            raise ValueError("Invalid upload path")
        category = cls.file_category(file_name, mime_type)
        date = datetime.now(UTC).strftime("%Y/%m")
        if len(parts) == 2 and parts[0] == "avatars":
            prefix = f"public/users/{parts[1]}/avatars"
        elif len(parts) == 3 and parts[0] == "shares":
            prefix = f"public/users/{parts[2]}/editor/{date}/{category}"
        elif len(parts) == 3 and parts[0] == "courses" and parts[2] == "thumbnails":
            prefix = f"public/courses/{parts[1]}/thumbnails"
        elif len(parts) == 5 and parts[0] == "courses" and parts[2] == "lessons" and parts[4] == "resources":
            prefix = f"private/courses/{parts[1]}/lessons/{parts[3]}/resources/{category}"
        elif len(parts) == 2 and parts[0] == "tutor_chat":
            prefix = f"private/users/{parts[1]}/tutor-chat/{date}/{category}"
        elif len(parts) == 3 and parts[0] == "notes":
            prefix = f"private/users/{parts[1]}/lessons/{parts[2]}/notes/attachments/{category}"
        else:
            raise ValueError("Unknown upload purpose; add an explicit storage tree mapping")
        asset_id = asset_id or uuid4().hex
        if not re.fullmatch(r"[a-f0-9]{32}", asset_id):
            raise ValueError("Invalid asset identifier")
        return f"{prefix}/{asset_id}-{cls.clean_filename(file_name)}"

    @staticmethod
    def file_url(key):
        # The frontend proxy forwards its session cookie to the backend. Do not
        # persist an expiring S3 URL or expose a private bucket on r2.dev.
        return f"/api/storage/files/{quote(key, safe='/')}"

    async def upload_file(self, path_parts, file_name, content, mime_type=None):
        if len(content) > settings.STORAGE_MAX_UPLOAD_BYTES:
            raise HTTPException(413, "File vượt quá giới hạn dung lượng upload.")
        key = self.object_key(path_parts, file_name, mime_type)
        url = self.file_url(key)
        client = self._client()
        content_type = mime_type or mimetypes.guess_type(file_name)[0] or "application/octet-stream"
        # User-uploaded HTML/SVG must not execute under the application's origin.
        disposition = "inline" if content_type in {
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "application/pdf",
            "video/mp4", "video/webm", "audio/mpeg", "audio/ogg",
        } else "attachment"
        try:
            await asyncio.to_thread(client.put_object, Bucket=settings.R2_BUCKET_NAME, Key=key,
                                    Body=content, ContentType=content_type,
                                    ContentDisposition=disposition,
                                    CacheControl="private, max-age=300" if key.startswith("private/")
                                    else "public, max-age=86400")
        except Exception as exc:
            logger.error("R2 upload failed ({})", type(exc).__name__)
            raise HTTPException(502, "Không tải được file lên R2. Vui lòng thử lại.") from None
        try:
            await asyncio.to_thread(StorageCache().write, key, [content], content_type)
        except OSError:
            logger.warning("R2 upload succeeded; local cache could not be written")
        return {"id": key, "name": file_name, "provider": "r2", "url": url, "key": key}

    async def cached_download(self, key):
        cache = StorageCache()
        cached = await asyncio.to_thread(cache.get, key)
        if cached is not None:
            return cached

        def fetch():
            result = self._client().get_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
            body = result["Body"]
            try:
                chunks = iter(lambda: body.read(1024 * 1024), b"")
                return cache.write(key, chunks, result.get("ContentType", "application/octet-stream"),
                                   result.get("Metadata", {}).get("sha256"))
            finally:
                body.close()
        try:
            return await asyncio.to_thread(fetch)
        except Exception as exc:
            from botocore.exceptions import ClientError

            if isinstance(exc, ClientError) and str(exc.response.get("Error", {}).get("Code")) in {"NoSuchKey", "404"}:
                raise HTTPException(404, "Không tìm thấy file.") from None
            logger.warning("R2 download unavailable ({})", type(exc).__name__)
            raise HTTPException(502, "Chưa tải được file từ R2. Vui lòng thử lại.") from None

    async def signed_download_url(self, key):
        client = self._client()
        try:
            return await asyncio.to_thread(
                client.generate_presigned_url, "get_object",
                Params={"Bucket": settings.R2_BUCKET_NAME, "Key": key},
                ExpiresIn=max(60, min(settings.R2_SIGNED_URL_TTL_SECONDS, 3600)),
            )
        except Exception as exc:
            logger.error("R2 signing failed ({})", type(exc).__name__)
            raise HTTPException(502, "Không tạo được link tải file.") from None


@lru_cache(maxsize=1)
def get_file_storage_service() -> FileStorageService:
    return FileStorageService()
