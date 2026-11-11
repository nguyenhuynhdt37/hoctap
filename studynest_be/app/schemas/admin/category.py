import uuid
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class UpdateCategory(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=160)
    parent_id: uuid.UUID | None = None
    order_index: Optional[int] = Field(None, ge=0)


class CreateCategory(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    parent_id: uuid.UUID | None = None
