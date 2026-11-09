"""Verify R2 credentials with a tiny temporary object; never print secrets/URLs."""

import asyncio
import sys
from pathlib import Path
from uuid import uuid4

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.settings import settings
from app.services.shares.file_storage import FileStorageService


async def main():
    storage = FileStorageService()
    client = storage._client()
    key = f"private/verification/{uuid4().hex}.txt"
    payload = b"StudyNest R2 connection check"
    uploaded = False
    try:
        await asyncio.to_thread(client.put_object, Bucket=settings.R2_BUCKET_NAME,
                                Key=key, Body=payload, ContentType="text/plain")
        uploaded = True
        url = await storage.signed_download_url(key)
        async with httpx.AsyncClient(timeout=30) as http:
            response = await http.get(url)
            response.raise_for_status()
            if response.content != payload:
                raise RuntimeError("Downloaded object does not match")
        print("PASS: R2 upload, signed download, and byte integrity")
    finally:
        if uploaded:
            await asyncio.to_thread(client.delete_object, Bucket=settings.R2_BUCKET_NAME, Key=key)
            print("Removed temporary verification object")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"R2 check failed ({type(exc).__name__}). Check bucket, credentials, and token permissions.")
        sys.exit(1)
