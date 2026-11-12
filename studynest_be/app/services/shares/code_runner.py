from typing import Any

import httpx
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.db.models.database import SupportedLanguages
from app.libs.formats.datetime import now as get_now
from app.libs.formats.datetime import to_utc_naive


class PistonService:
    """Service gọi đến Piston API: run code (1 hoặc nhiều file) + sync runtime."""

    def __init__(self):
        self.base_url = settings.PISTON_URL.rstrip("/")
        self.headers = (
            {"Authorization": f"Bearer {settings.PISTON_API_KEY}"}
            if settings.PISTON_API_KEY
            else {}
        )

    # =========================================================
    # 🧠 1️⃣ RUN CODE — TỰ ĐỘNG PHÂN BIỆT 1 FILE / NHIỀU FILE
    # =========================================================
    async def run_code(
        self,
        language: str,
        files: list[dict[str, str]],
        version: str | None = None,
        stdin: str | None = None,
    ) -> dict[str, Any]:
        """
        Chạy code qua Piston API.
        - Nếu files có 1 phần tử → chạy đơn
        - Nếu có nhiều → chạy nhiều file
        files: [{ "name": optional, "content": "..."}]
        """
        if not files or not isinstance(files, list):
            raise ValueError("files phải là mảng chứa ít nhất 1 phần tử")

        # Nếu chỉ 1 file mà không có 'name', thêm mặc định
        if len(files) == 1 and "name" not in files[0]:
            files[0]["name"] = "main"

        url = f"{self.base_url}/api/v2/execute"
        payload = {
            "language": language,
            "version": version,
            "files": files,
        }
        if stdin:
            payload["stdin"] = stdin

        async with httpx.AsyncClient(timeout=20, headers=self.headers) as client:
            try:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                logger.info(
                    f"✅ Piston run ok: {language} ({len(files)} file{'s' if len(files)>1 else ''})"
                )
                return data
            except httpx.HTTPStatusError as e:
                logger.error(f"❌ HTTP {e.response.status_code}: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"❌ Lỗi gọi piston: {e}")
                raise

    # =========================================================
    # 🔁 2️⃣ SYNC RUNTIMES — ĐỒNG BỘ DANH SÁCH HỖ TRỢ
    # =========================================================
    async def sync_supported_languages(self, db: AsyncSession) -> int:
        url = f"{self.base_url}/api/v2/runtimes"

        async with httpx.AsyncClient(timeout=15, headers=self.headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            runtimes = resp.json()

        inserted = 0
        for rt in runtimes:
            name = rt.get("language")
            version = rt.get("version")
            aliases = rt.get("aliases", [])
            runtime = rt.get("runtime")

            # Kiểm tra tồn tại (name + version)
            exists = await db.scalar(
                select(SupportedLanguages)
                .where(SupportedLanguages.name == name)
                .where(SupportedLanguages.version == version)
            )

            if exists:
                continue

            lang = SupportedLanguages(
                name=name,
                version=version,
                aliases=aliases,
                runtime=runtime,
                is_active=True,
                last_sync=await to_utc_naive(get_now()),
            )
            db.add(lang)
            inserted += 1

        await db.commit()
        logger.info(f"✅ Đồng bộ xong {inserted} runtime mới từ Piston")
        return inserted
