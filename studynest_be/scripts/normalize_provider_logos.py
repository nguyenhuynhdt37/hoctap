"""Reframe only proven crawler-owned pending logos; immutable replacement R2 keys."""

import argparse
import asyncio
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException
from sqlalchemy import or_, select

from app.core.settings import settings
from app.db.models.catalog import Provider
from app.db.sesson import AsyncSessionLocal, engine
from app.services.provider_images import normalize_image
from app.services.shares.file_storage import FileStorageService
from app.services.shares.storage_cache import StorageCache

DATA = Path(__file__).resolve().parents[2] / "data/providers"


async def main(apply=False):
    ownership = set()
    for path in DATA.glob("logo-crawl-*.json"):
        for item in json.loads(path.read_text()).get("items", []):
            if item.get("logo_url"):
                ownership.add((item["provider_id"], item["logo_url"]))
    async with AsyncSessionLocal() as db:
        rows = (
            await db.scalars(
                select(Provider).where(
                    Provider.source_key.is_not(None),
                    Provider.logo_url.is_not(None),
                    Provider.verification_status == "pending",
                )
            )
        ).all()
    storage = FileStorageService()
    semaphore = asyncio.Semaphore(5)
    report = []

    async def normalize(row):
        async with semaphore:
            metadata = (row.source_snapshot or {}).get("logo", {})
            if metadata.get("normalization_version") == 2:
                return
            if (
                metadata.get("asset_url") != row.logo_url
                and (str(row.id), row.logo_url) not in ownership
            ):
                report.append(
                    {"provider_id": str(row.id), "status": "ownership_requires_review"}
                )
                return
            old_url = row.logo_url
            key = old_url.removeprefix("/api/storage/files/")
            cached = StorageCache().get(key) or await storage.cached_download(key)
            content = await asyncio.to_thread(
                normalize_image, cached.path.read_bytes(), "avatar"
            )
            if not apply:
                report.append({"provider_id": str(row.id), "status": "ready"})
                return
            uploaded = await storage.upload_file(
                ["providers", "catalog", "avatars"],
                "avatar.webp",
                content,
                "image/webp",
            )
            async with AsyncSessionLocal() as db:
                current = await db.scalar(
                    select(Provider).where(Provider.id == row.id).with_for_update()
                )
                if (
                    current.logo_url != old_url
                    or current.verification_status != "pending"
                ):
                    report.append(
                        {
                            "provider_id": str(row.id),
                            "status": "concurrent_admin_change_preserved",
                        }
                    )
                    await asyncio.to_thread(
                        storage._client().delete_object,
                        Bucket=settings.R2_BUCKET_NAME,
                        Key=uploaded["key"],
                    )
                    return
                current.logo_url = uploaded["url"]
                current.source_snapshot = {
                    **current.source_snapshot,
                    "logo": {
                        **metadata,
                        "asset_url": uploaded["url"],
                        "normalization_version": 2,
                        "normalized_at": datetime.now(UTC).isoformat(),
                        "previous_asset_url": old_url,
                    },
                }
                await db.commit()
                if not await db.scalar(
                    select(Provider.id)
                    .where(
                        or_(
                            Provider.logo_url == old_url, Provider.banner_url == old_url
                        )
                    )
                    .limit(1)
                ):
                    await asyncio.to_thread(
                        storage._client().delete_object,
                        Bucket=settings.R2_BUCKET_NAME,
                        Key=key,
                    )
            report.append(
                {
                    "provider_id": str(row.id),
                    "status": "normalized",
                    "logo_url": uploaded["url"],
                }
            )

    async def process(row):
        try:
            await normalize(row)
        except (HTTPException, BotoCoreError, ClientError, OSError) as error:
            report.append(
                {
                    "provider_id": str(row.id),
                    "status": "retry_required",
                    "error": type(error).__name__,
                }
            )
        finally:
            (DATA / "logo-normalization-report.json").write_text(
                json.dumps(report, ensure_ascii=False, indent=2) + "\n"
            )

    await asyncio.gather(*(process(row) for row in rows))
    (DATA / "logo-normalization-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )
    from collections import Counter

    print(dict(Counter(item["status"] for item in report)))
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    asyncio.run(main(parser.parse_args().apply))
