"""Validated, metadata-free provider images stored using canonical R2 keys."""

import asyncio
import warnings
from io import BytesIO

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, ImageStat, UnidentifiedImageError

from app.services.shares.file_storage import FileStorageService

MAX_IMAGE_BYTES = 5 * 1024 * 1024


def normalize_image(content: bytes, kind: str) -> bytes:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                if image.format not in {"JPEG", "PNG", "WEBP"}:
                    raise ValueError("unsupported image")
                if image.width * image.height > 20_000_000 or min(image.size) < 32:
                    raise ValueError("image dimensions")
                image.load()
                image = ImageOps.exif_transpose(image).convert("RGBA")
                if kind == "avatar":
                    bounds = image.getchannel("A").getbbox()
                    if not bounds:
                        raise ValueError("empty transparent logo")
                    image = ImageOps.contain(
                        image.crop(bounds), (512, 512), Image.Resampling.LANCZOS
                    )
                    means = ImageStat.Stat(
                        image.convert("RGB"), mask=image.getchannel("A")
                    ).mean
                    # White brand marks need contrast on the application's light cards.
                    background = (
                        (53, 111, 167, 255) if min(means) > 235 else (0, 0, 0, 0)
                    )
                    canvas = Image.new("RGBA", (512, 512), background)
                    canvas.alpha_composite(
                        image, ((512 - image.width) // 2, (512 - image.height) // 2)
                    )
                    image = canvas
                else:
                    image.thumbnail((2400, 1200))
                output = BytesIO()
                image.save(output, "WEBP", quality=88)
                return output.getvalue()
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        raise HTTPException(
            422,
            "Ảnh phải là JPEG, PNG hoặc WebP hợp lệ, tối thiểu 32px và tối đa 20 megapixel",
        ) from None


async def upload_provider_image(
    file: UploadFile, kind: str, storage: FileStorageService
):
    content = await file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Ảnh đơn vị tối đa 5 MB")
    normalized = await asyncio.to_thread(normalize_image, content, kind)
    # Admin-managed catalog assets can be uploaded before the provider exists.
    return await storage.upload_file(
        ["providers", "catalog", "avatars" if kind == "avatar" else "banners"],
        f"{kind}.webp",
        normalized,
        "image/webp",
    )
