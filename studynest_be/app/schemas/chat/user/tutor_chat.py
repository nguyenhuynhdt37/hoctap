from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ChatImageSchema(BaseModel):
    url: str = Field(max_length=2048)
    file_size: int = Field(default=0,ge=0,le=10*1024*1024)
    mime_type: Optional[str] = Field(default=None,max_length=100)
    ocr_text: str = Field(default="",max_length=12000)
    storage_id: Optional[str] = Field(default=None,max_length=2048)


class SendMessageSchema(BaseModel):
    message: str = Field(max_length=12000)
    thread_id: Optional[UUID] = None
    images: Optional[List[ChatImageSchema]] = Field(default=None,max_length=5)
    stream: bool = False
