"""Discover 9Router models and persist the model used by all chat calls."""

import uuid

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.db.models.database import PlatformSettings
from app.db.sesson import AsyncSessionLocal
from app.libs.formats.datetime import now


def resolve_model(selection: str) -> str:
    return settings.NINEROUTER_AUTO_MODEL if selection == "auto" else selection


async def get_chat_model() -> str:
    # Read for each call so saved changes also reach long-lived service instances
    # and other backend workers without a process restart.
    async with AsyncSessionLocal() as db:
        selection = await db.scalar(select(PlatformSettings.llm_model))
    return resolve_model(selection) if selection else settings.NINEROUTER_MODEL


async def discover_models() -> list[dict]:
    if not settings.NINEROUTER_API_KEY:
        raise HTTPException(503, "Chưa cấu hình API key 9Router trên backend.")
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                settings.NINEROUTER_BASE_URL.rstrip("/") + "/models",
                headers={"Authorization": f"Bearer {settings.NINEROUTER_API_KEY}"},
            )
            response.raise_for_status()
            models = response.json()["data"]
            if not isinstance(models, list):
                raise TypeError("Invalid model list")
            result = {}
            for model in models:
                if not isinstance(model, dict):
                    raise TypeError("Invalid model")
                model_id = model.get("id")
                if isinstance(model_id, str) and model_id.strip() and model_id != "auto":
                    result[model_id] = {
                        "id": model_id,
                        "kind": "combo" if model.get("owned_by") == "combo" else "model",
                    }
            return list(result.values())
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            502, f"9Router từ chối kết nối (HTTP {exc.response.status_code})."
        ) from None
    except (httpx.RequestError, ValueError, KeyError, TypeError):
        raise HTTPException(502, "Không tải được danh sách model từ 9Router. Thử kết nối lại.") from None


async def get_ai_settings(db: AsyncSession) -> dict:
    selection = await db.scalar(select(PlatformSettings.llm_model))
    selection = selection or settings.NINEROUTER_MODEL
    result = {
        "provider": settings.LLM_PROVIDER,
        "base_url": settings.NINEROUTER_BASE_URL,
        "selected_model": selection,
        "effective_model": resolve_model(selection),
        "auto_model": settings.NINEROUTER_AUTO_MODEL,
        "models": [],
        "connected": False,
        "connection_error": None,
        "embedding_provider": settings.EMBEDDING_PROVIDER,
        "embedding_model": settings.EMBEDDING_MODEL,
        "embedding_dimensions": settings.EMBEDDING_DIMENSIONS,
        "chat_streaming": settings.NINEROUTER_STREAM,
    }
    try:
        result["models"] = await discover_models()
        result["connected"] = True
    except HTTPException as exc:
        result["connection_error"] = exc.detail
    return result


async def save_ai_settings(db: AsyncSession, model: str, admin_id: uuid.UUID) -> dict:
    if settings.LLM_PROVIDER != "9router":
        raise HTTPException(409, "Cần bật provider 9router trong cấu hình backend.")
    models = await discover_models()
    if resolve_model(model) not in {item["id"] for item in models}:
        raise HTTPException(422, "Model đã chọn không còn có trong danh sách 9Router. Hãy tải lại.")
    row = await db.scalar(select(PlatformSettings).with_for_update())
    if row is None:
        raise HTTPException(503, "Chưa có cài đặt hệ thống trong database.")
    row.llm_model = model
    row.updated_by = admin_id
    row.updated_at = now()
    await db.commit()
    return {"selected_model": model, "effective_model": resolve_model(model)}
