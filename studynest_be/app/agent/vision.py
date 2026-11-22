"""Private, account-bound image inputs. Never fetch model/client supplied URLs."""
import asyncio
import re
from io import BytesIO
from urllib.parse import unquote
from fastapi import HTTPException
from PIL import Image, ImageOps
from sqlalchemy import select
from app.db.models.database import TutorChatImages, TutorChatMessages
from app.services.shares.file_storage import get_file_storage_service

MAX_IMAGES = 3
MAX_BYTES = 10 * 1024 * 1024


def owned_key(user_id, url):
    prefix = '/api/storage/files/'
    if not isinstance(url, str) or not url.startswith(prefix):
        raise HTTPException(403, 'Chỉ dùng ảnh bạn đã tải lên tài khoản này.')
    key = unquote(url[len(prefix):])
    if not key.startswith(f'private/users/{user_id}/tutor-chat/') or any(
        not re.fullmatch(r'[\w.()-]+', part) or part in {'.','..'} for part in key.split('/')):
        raise HTTPException(403, 'Ảnh không thuộc tài khoản hiện tại.')
    return key


def normalize(content):
    if not content or len(content) > MAX_BYTES:
        raise HTTPException(413, 'Ảnh vượt giới hạn 10 MB.')
    try:
        with Image.open(BytesIO(content)) as source:
            if source.format not in {'PNG','JPEG','WEBP','GIF'} or source.width*source.height > 16_000_000:
                raise ValueError('Unsupported raster')
            oriented = ImageOps.exif_transpose(source)
            if oriented.mode in {'RGBA','LA','P'}:
                rgba = oriented.convert('RGBA')
                image = Image.new('RGB', rgba.size, 'white')
                image.paste(rgba, mask=rgba.getchannel('A'))
            else:
                image = oriented.convert('RGB')
            image.thumbnail((1536,1536))
            output = BytesIO()
            image.save(output, 'JPEG', quality=85, optimize=True)
            return {'data':output.getvalue(), 'mime_type':'image/jpeg', 'width':image.width, 'height':image.height}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, 'Ảnh không hợp lệ hoặc độ phân giải quá lớn.') from None


async def read_owned(user_id, url):
    key = owned_key(user_id, url)
    cached = await get_file_storage_service().cached_download(key)
    if cached.size > MAX_BYTES:
        raise HTTPException(413, 'Ảnh vượt giới hạn dung lượng.')
    content = await asyncio.to_thread(cached.path.read_bytes)
    return await asyncio.to_thread(normalize, content)


async def validate_attachments(user_id, images):
    result = []
    for image in images:
        data = await read_owned(user_id, image.url)
        result.append({'url':image.url, 'file_size':len(data['data']), 'mime_type':data['mime_type'], 'ocr_text':''})
    return result


async def thread_images(db, user_id, thread_id, *, message_id=None, before=None, include_history=True):
    query = select(TutorChatImages).join(TutorChatMessages, TutorChatMessages.id == TutorChatImages.message_id).where(
        TutorChatImages.user_id == user_id, TutorChatMessages.user_id == user_id,
        TutorChatMessages.thread_id == thread_id)
    if message_id:
        exact = (await db.scalars(query.where(TutorChatImages.message_id == message_id).limit(MAX_IMAGES))).all()
        if exact:
            rows = exact
        else:
            rows = None
    else:
        rows = None
    if rows is None and not include_history:
        return []
    if rows is None:
        if before is not None:
            query = query.where(TutorChatMessages.created_at <= before)
        latest = await db.scalar(query.order_by(TutorChatMessages.created_at.desc(), TutorChatMessages.id.desc(), TutorChatImages.id).limit(1))
        rows = (await db.scalars(query.where(TutorChatImages.message_id == latest.message_id).order_by(TutorChatImages.id).limit(MAX_IMAGES))).all() if latest else []
    images = []
    for row in rows:
        images.append({**await read_owned(user_id, row.url), 'message_id':str(row.message_id)})
    return images


async def thread_image_metadata(db, user_id, thread_id, *, before=None):
    """Offer prior image references without loading pixels into unrelated turns."""
    query = select(TutorChatImages.message_id, TutorChatImages.mime_type).join(
        TutorChatMessages, TutorChatMessages.id == TutorChatImages.message_id).where(
        TutorChatImages.user_id == user_id, TutorChatMessages.user_id == user_id,
        TutorChatMessages.thread_id == thread_id)
    if before is not None:
        query = query.where(TutorChatMessages.created_at <= before)
    rows = (await db.execute(query.order_by(TutorChatMessages.created_at.desc()).limit(MAX_IMAGES))).all()
    return [{'message_id': str(row.message_id), 'mime_type': row.mime_type} for row in rows]
