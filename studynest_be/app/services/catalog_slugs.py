"""Stable public addresses; explicit root IDs distinguish revisions from new products."""

import re
import unicodedata
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError


def slugify(value):
    value = unicodedata.normalize("NFKD", value.lower().replace("đ", "d"))
    value = value.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")[:160].rstrip("-") or "noi-dung"


async def create_slugged(db, model, source_title, requested="", **values):
    max_length = min(160, (model.__table__.c.slug.type.length or 180) - 9)
    base = slugify(requested or source_title)[:max_length].rstrip("-")
    if base.startswith(("demo-", "seed-shop-")):
        raise HTTPException(422, "Đường dẫn này đã được dành cho dữ liệu lưu trữ")
    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:scope, 0))"),
        {"scope": f"slug:{model.__tablename__}:{base}"},
    )
    slug = base
    for _ in range(5):
        if await db.scalar(select(model.id).where(model.slug == slug)):
            slug = f"{base}-{uuid4().hex[:8]}"
            continue
        try:
            async with db.begin_nested():
                row = model(slug=slug, **values)
                db.add(row)
                await db.flush()
            return row
        except IntegrityError as error:
            constraint = getattr(
                getattr(error.orig, "__cause__", None), "constraint_name", ""
            )
            if getattr(error.orig, "sqlstate", None) != "23505" or (
                constraint and "slug" not in constraint
            ):
                raise
            slug = f"{base}-{uuid4().hex[:8]}"
    raise HTTPException(409, "Chưa tạo được đường dẫn duy nhất, vui lòng thử lại")
