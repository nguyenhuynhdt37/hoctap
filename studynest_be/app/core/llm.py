import asyncio
import logging

import google.generativeai as genai
from google.api_core.exceptions import (
    InvalidArgument,
    PermissionDenied,
    ResourceExhausted,
)

from app.core.settings import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Dịch vụ gọi Gemini LLM (chuẩn API mới, ổn định, retry + fallback)."""

    def __init__(self) -> None:
        genai.configure(api_key=settings.GOOGLE_API_KEY_CHAT)

        # === Model MỚI CHÍNH XÁC NHẤT CHO generate_content ===
        self.primary_model = "models/gemini-3.1-flash-lite"

    async def call_model(
        self,
        prompt: str,
        retries: int = 3,
        mime_type: str = "application/json",
        temperature: float = 0.5,
        max_output_tokens: int = 8000,
    ) -> str:

        async def _safe_call(model_name: str) -> str:
            def _sync_call():
                model = genai.GenerativeModel(model_name)

                response = model.generate_content(
                    prompt,
                    generation_config={
                        "response_mime_type": mime_type,
                        "temperature": temperature,
                        "max_output_tokens": max_output_tokens,
                    },
                )

                # SDK mới: dùng .text không còn chắc chắn → dùng .candidates
                try:
                    text = response.text.strip()
                except Exception:
                    text = response.candidates[0].content.parts[0].text.strip()

                if not text:
                    return "⚠️ Mô hình không sinh được nội dung."

                return text

            return await asyncio.to_thread(_sync_call)

        # ===== Gọi model chính (retry nếu gặp lỗi tạm thời hoặc quota) =====
        last_error = None
        for attempt in range(1, retries + 1):
            try:
                return await _safe_call(self.primary_model)

            except ResourceExhausted as e:
                last_error = e
                wait_time = 2 * attempt
                logger.warning(
                    f"⚠️ Quota bị giới hạn (attempt {attempt}/{retries}), đợi {wait_time}s..."
                )
                if attempt < retries:
                    await asyncio.sleep(wait_time)

            except PermissionDenied as e:
                logger.error("🚫 API key sai hoặc chưa bật billing.")
                return f"🚫 Lỗi bảo mật: API key không hợp lệ hoặc chưa bật billing. Chi tiết: {e}"

            except InvalidArgument as e:
                logger.error(f"❌ Lỗi tham số: {e}")
                return f"⚠️ Lỗi cú pháp/tham số prompt: {e}"

            except Exception as e:
                last_error = e
                logger.warning(f"⚠️ Lỗi tạm thời từ Gemini (attempt {attempt}/{retries}): {e}")
                if attempt < retries:
                    await asyncio.sleep(2)

        # Nếu chạy hết số lần retry mà vẫn lỗi thì trả về thông báo lỗi chi tiết
        err_msg = f"❌ Gọi Gemini thất bại sau {retries} lần thử. Lỗi cuối: {last_error}"
        logger.error(err_msg)
        return err_msg
