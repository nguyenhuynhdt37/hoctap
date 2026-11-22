from io import BytesIO
from uuid import uuid4
import pytest
from fastapi import HTTPException
from PIL import Image
from app.agent.vision import owned_key, normalize
from app.agent.contracts import CreateRun
from app.core.llm import LLMService
from pydantic import ValidationError


def raster(width=2000, height=1000):
    output=BytesIO();Image.new('RGB',(width,height),'red').save(output,'PNG');return output.getvalue()


def test_normalization_preserves_aspect_and_strips_metadata():
    image=normalize(raster())
    assert (image['width'],image['height']) == (1536,768)
    assert image['mime_type']=='image/jpeg'
    assert len(image['data'])<2*1024*1024
    with Image.open(BytesIO(image['data'])) as decoded:
        assert not decoded.getexif()


@pytest.mark.parametrize('data',[b'',b'not an image',b'<svg></svg>',b'A'*(10*1024*1024+1)])
def test_reject_invalid_or_oversized_images(data):
    with pytest.raises(HTTPException):normalize(data)


def test_private_images_cannot_cross_accounts_or_fetch_arbitrary_urls():
    owner=uuid4();key=f'private/users/{owner}/tutor-chat/2026/11/images/image.jpg'
    assert owned_key(owner,'/api/storage/files/'+key)==key
    for url in ['http://127.0.0.1/secrets','https://evil.invalid/image.jpg','/api/storage/files/'+key.replace(str(owner),str(uuid4())), '/api/storage/files/'+key+'/../x','/api/storage/files/'+key+'%2F..%2Fx']:
        with pytest.raises(HTTPException):owned_key(owner,url)


def test_multimodal_payload_contains_actual_pixels_and_text():
    content=LLMService._multimodal_content('What is shown?', [{'mime_type':'image/jpeg','data':b'actual bytes'}])
    assert content[0]=={'type':'text','text':'What is shown?'}
    assert content[1]['image_url']['url']=='data:image/jpeg;base64,YWN0dWFsIGJ5dGVz'
    assert LLMService._multimodal_content('text only')=='text only'


def test_attachment_count_is_bounded():
    with pytest.raises(ValidationError):
        CreateRun(session_id=uuid4(),message='look',idempotency_key='fixture-key',images=[{'url':'x'}]*4)


def test_transparent_background_is_flattened_without_hiding_dark_text():
    out=BytesIO();Image.new('RGBA',(32,32),(0,0,0,0)).save(out,'PNG')
    data=normalize(out.getvalue())
    with Image.open(BytesIO(data['data'])) as image:
        assert all(channel > 240 for channel in image.getpixel((0,0)))
