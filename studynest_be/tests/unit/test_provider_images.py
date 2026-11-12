from io import BytesIO
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from app.services.provider_images import normalize_image, upload_provider_image
from app.services.shares.file_storage import FileStorageService


def png(size=(64, 64)):
    out = BytesIO()
    Image.new("RGB", size, "blue").save(out, "PNG")
    return out.getvalue()


def test_normalize_decodes_and_downsizes_instead_of_trusting_filename():
    content = normalize_image(png((1600, 1200)), "avatar")
    with Image.open(BytesIO(content)) as image:
        assert image.format == "WEBP"
        assert image.size == (512, 512)
        assert not image.getexif()


def test_white_logo_has_contrast_and_empty_transparent_logo_is_rejected():
    output = BytesIO()
    logo = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    from PIL import ImageDraw

    ImageDraw.Draw(logo).rectangle((32, 48, 96, 80), fill="white")
    logo.save(output, "PNG")
    image = Image.open(BytesIO(normalize_image(output.getvalue(), "avatar"))).convert(
        "RGB"
    )
    assert image.size == (512, 512)
    assert max(image.getpixel((0, 0))) < 230
    blank = BytesIO()
    Image.new("RGBA", (64, 64), (0, 0, 0, 0)).save(blank, "PNG")
    with pytest.raises(HTTPException):
        normalize_image(blank.getvalue(), "avatar")


@pytest.mark.parametrize(
    "content", [b"<svg onload='alert(1)'/>", b"not an image", png((1, 1))]
)
def test_rejects_invalid_or_tiny_images(content):
    with pytest.raises(HTTPException) as error:
        normalize_image(content, "avatar")
    assert error.value.status_code == 422


@pytest.mark.asyncio
async def test_provider_upload_uses_r2_tree_and_normalized_image():
    storage = AsyncMock()
    await upload_provider_image(
        UploadFile(filename="fake.html", file=BytesIO(png())), "avatar", storage
    )
    args = storage.upload_file.call_args.args
    assert args[:2] == (["providers", "catalog", "avatars"], "avatar.webp")
    assert args[3] == "image/webp"
    with Image.open(BytesIO(args[2])) as image:
        assert image.format == "WEBP"
    key = FileStorageService.object_key(args[0], args[1], args[3])
    assert key.startswith("public/providers/catalog/avatars/")


@pytest.mark.asyncio
async def test_provider_upload_rejects_large_file_before_storage():
    storage = AsyncMock()
    with pytest.raises(HTTPException) as error:
        await upload_provider_image(
            UploadFile(filename="x.png", file=BytesIO(b"x" * (5 * 1024 * 1024 + 1))),
            "avatar",
            storage,
        )
    assert error.value.status_code == 413
    storage.upload_file.assert_not_called()
