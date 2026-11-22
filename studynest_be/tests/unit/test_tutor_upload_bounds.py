from io import BytesIO
from unittest.mock import AsyncMock,Mock
from uuid import uuid4
import pytest
from fastapi import HTTPException,UploadFile
from starlette.datastructures import Headers
from pydantic import ValidationError
from PIL import Image
from app.schemas.chat.user.tutor_chat import SendMessageSchema,ChatImageSchema
from app.services.user.tutor_chat_message import TutorChatMessageService


def service():
    return TutorChatMessageService(db=AsyncMock(),thread_service=AsyncMock(),embedding_service=AsyncMock(),
        storage_service=Mock(upload_file=AsyncMock(return_value={'url':'/image.png','id':'key'})),
        ocr_service=Mock(extract_text_from_image=Mock(return_value='Recognized text')))


def upload(content,mime='image/png'):
    return UploadFile(BytesIO(content),filename='image.png',headers=Headers({'content-type':mime}))


@pytest.mark.asyncio
async def test_oversized_upload_rejected_before_storage_or_ocr():
    svc=service()
    with pytest.raises(HTTPException) as exc:
        await svc.upload_and_ocr_images(uuid4(),[upload(b'x'*(10*1024*1024+1))])
    assert exc.value.status_code==413
    svc.storage_service.upload_file.assert_not_awaited();svc.ocr_service.extract_text_from_image.assert_not_called()


@pytest.mark.asyncio
async def test_nonimage_bytes_and_svg_cannot_reach_storage_or_ocr():
    for data,mime in [(b'not a PNG','image/png'),(b'<svg onload="alert(1)"/>','image/svg+xml')]:
        svc=service()
        with pytest.raises(HTTPException):await svc.upload_and_ocr_images(uuid4(),[upload(data,mime)])
        svc.storage_service.upload_file.assert_not_awaited();svc.ocr_service.extract_text_from_image.assert_not_called()


@pytest.mark.asyncio
async def test_valid_raster_uses_actual_size_and_bounded_ocr_result():
    image=BytesIO();Image.new('RGB',(2,2)).save(image,format='PNG');data=image.getvalue()
    svc=service();svc.ocr_service.extract_text_from_image.return_value='x'*13000
    result=await svc.upload_and_ocr_images(uuid4(),[upload(data)])
    assert result[0]['file_size']==len(data) and len(result[0]['ocr_text'])==12000
    svc.storage_service.upload_file.assert_awaited_once()


def test_text_image_and_ocr_payload_limits_are_enforced_at_http_schema():
    with pytest.raises(ValidationError):SendMessageSchema(message='x'*12001)
    with pytest.raises(ValidationError):ChatImageSchema(url='/x',ocr_text='x'*12001)
    with pytest.raises(ValidationError):SendMessageSchema(message='',images=[ChatImageSchema(url='/x')]*6)


@pytest.mark.asyncio
async def test_excessive_pixels_rejected_before_decode_or_storage():
    from unittest.mock import patch
    svc=service();raster=Mock(format='PNG',width=4001,height=4000)
    opened=Mock();opened.__enter__=Mock(return_value=raster);opened.__exit__=Mock(return_value=False)
    with patch('PIL.Image.open',return_value=opened),pytest.raises(HTTPException) as exc:
        await svc.upload_and_ocr_images(uuid4(),[upload(b'fixture')])
    assert exc.value.status_code==422
    raster.verify.assert_not_called();svc.storage_service.upload_file.assert_not_awaited()


@pytest.mark.asyncio
async def test_cancelled_request_does_not_release_ocr_slot_while_thread_runs():
    import asyncio
    import threading
    from unittest.mock import patch
    entered,release=threading.Event(),threading.Event()
    def blocking_ocr(_content):
        entered.set();release.wait(2);return 'text'
    svc=service();svc.ocr_service.extract_text_from_image.side_effect=blocking_ocr
    slot=asyncio.Semaphore(1)
    with patch('app.services.user.tutor_chat_message._OCR_SLOT',slot):
        request=asyncio.create_task(svc._extract_ocr_bounded_async(b'fixture'))
        try:
            assert await asyncio.to_thread(entered.wait,1)
            request.cancel()
            with pytest.raises(asyncio.CancelledError):await request
            assert slot.locked()
        finally:
            release.set()
        await asyncio.wait_for(slot.acquire(),1)
        slot.release()
