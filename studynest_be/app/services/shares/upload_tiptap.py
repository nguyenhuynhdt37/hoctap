import asyncio
import io
import os
import uuid

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.services.shares.file_storage import FileStorageService

MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB đầu vào tối đa
MAX_GIF_UPLOAD_BYTES = 4 * 1024 * 1024     # 4 MB cho ảnh GIF động
MAX_IMAGE_DIMENSION = 1600                 # Giới hạn tối đa cạnh dài ở server
ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
}


def optimize_uploaded_image(
    raw: bytes,
    filename: str | None,
    content_type: str | None,
) -> tuple[bytes, str, str]:
    """Validate và nén/resize ảnh an toàn trên server (chống ảnh quá nặng & xóa EXIF)."""
    if not raw:
        raise HTTPException(status_code=400, detail="File ảnh trống.")

    if len(raw) > MAX_IMAGE_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Ảnh vượt quá giới hạn 10MB. Vui lòng chọn ảnh nhẹ hơn.",
        )

    normalized_mime = (content_type or "").split(";")[0].strip().lower()
    if normalized_mime and normalized_mime not in ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Chỉ hỗ trợ định dạng ảnh JPG, PNG, WebP, AVIF hoặc GIF.",
        )

    safe_stem = os.path.splitext(os.path.basename(filename or "image"))[0].strip() or "image"

    try:
        with Image.open(io.BytesIO(raw)) as opened:
            fmt = (opened.format or "").upper()
            if fmt not in {"JPEG", "PNG", "WEBP", "GIF", "AVIF"}:
                raise HTTPException(
                    status_code=400,
                    detail="Định dạng ảnh không được hỗ trợ.",
                )

            # Giữ nguyên GIF để bảo toàn chuyển động nếu trong ngưỡng dung lượng cho phép
            if fmt == "GIF":
                if len(raw) > MAX_GIF_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="Ảnh GIF vượt quá giới hạn 4MB.",
                    )
                return raw, f"{safe_stem}.gif", "image/gif"

            img = ImageOps.exif_transpose(opened)
            width, height = img.size
            needs_resize = width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION
            if needs_resize:
                img.thumbnail(
                    (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION),
                    Image.Resampling.LANCZOS,
                )

            has_alpha = img.mode in ("RGBA", "LA") or (
                img.mode == "P" and "transparency" in img.info
            )
            converted = img.convert("RGBA" if has_alpha else "RGB")

            out = io.BytesIO()
            converted.save(out, format="WEBP", quality=82, method=4)
            optimized_bytes = out.getvalue()

            # Nếu ảnh gốc đã là WebP nhỏ hơn và không cần resize/xoay thì giữ bản nhẹ hơn
            if (
                fmt == "WEBP"
                and not needs_resize
                and len(raw) <= len(optimized_bytes)
                and not opened.getexif()
            ):
                return raw, f"{safe_stem}.webp", "image/webp"

            return optimized_bytes, f"{safe_stem}.webp", "image/webp"
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Không thể đọc file ảnh. File có thể bị hỏng hoặc không đúng định dạng ảnh.",
        )


class UploadTiptapService:
    def __init__(self):
        pass

    async def upload_image_async(
        self,
        user_id: uuid.UUID,
        file: UploadFile,
        storage_service: FileStorageService,
        role: str,
    ):
        raw = await file.read()
        optimized_bytes, optimized_name, optimized_mime = await asyncio.to_thread(
            optimize_uploaded_image,
            raw,
            file.filename,
            file.content_type,
        )
        try:
            file_url = await storage_service.upload_file(
                [f"shares/{role}", str(object=user_id)],
                optimized_name,
                optimized_bytes,
                optimized_mime,
            )
            return file_url["url"]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"error {e}")
