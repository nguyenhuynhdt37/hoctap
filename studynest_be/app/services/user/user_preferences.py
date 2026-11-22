from typing import Any

from fastapi import Depends, HTTPException
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embedding import EmbeddingService
from app.db.models.database import User
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.schemas.user.learning_fields import LearningFielsSave


class UserPreferencesService:
    def __init__(
        self,
        db: AsyncSession = Depends(get_session),
        embedding: EmbeddingService = Depends(EmbeddingService),
    ):
        self.db = db
        self.embedding = embedding

    async def save_user_learning_preferences_async(
        self, schema: LearningFielsSave, user: User
    ) -> dict[str, Any]:
        preferences_text = (schema.preferences or "").strip()
        if not preferences_text:
            raise HTTPException(400, "Nội dung sở thích học tập không được để trống.")

        try:
            vec: list[float] | None = None
            try:
                vec = await self.embedding.embed_google_normalized(preferences_text)
            except Exception as embed_err:
                logger.warning(
                    "Skipping preferences embedding generation due to provider error: {}",
                    embed_err,
                )

            user.preferences_str = preferences_text
            if vec is not None:
                user.preferences_embedding = vec
            user.preferences_embedding_date_updated_at = get_now()

            await self.db.commit()
            return {
                "message": "Đã lưu sở thích học tập",
                "updated_at": user.preferences_embedding_date_updated_at,
            }
        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi lưu sở thích học tập: {e}")
