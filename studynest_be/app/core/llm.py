import asyncio
import json
import logging

import httpx
from google.api_core.exceptions import (
    InvalidArgument,
    PermissionDenied,
    ResourceExhausted,
)

from app.core.settings import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Chat service with selectable Gemini and 9Router providers."""

    def __init__(self) -> None:
        self.provider = settings.LLM_PROVIDER.strip().lower()
        if self.provider not in {"gemini", "9router"}:
            raise ValueError("LLM_PROVIDER must be gemini or 9router")
        self.primary_model = (
            settings.NINEROUTER_MODEL
            if self.provider == "9router"
            else "models/gemini-3.1-flash-lite"
        )

    async def call_model(
        self,
        prompt: str,
        retries: int = 3,
        mime_type: str = "application/json",
        temperature: float = 0.5,
        max_output_tokens: int = 8000,
    ) -> str:
        if retries < 1:
            raise ValueError("retries must be at least 1")
        if self.provider == "9router":
            return await self._call_ninerouter(
                prompt, retries, mime_type, temperature, max_output_tokens
            )

        import google.generativeai as genai

        genai.configure(api_key=settings.GOOGLE_API_KEY_CHAT)

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

    async def _call_ninerouter(
        self,
        prompt: str,
        retries: int,
        mime_type: str,
        temperature: float,
        max_output_tokens: int,
    ) -> str:
        if not settings.NINEROUTER_API_KEY:
            raise ValueError("NINEROUTER_API_KEY is required for 9router")

        if settings.NINEROUTER_STREAM:
            chunks = [chunk async for chunk in self.stream_model(
                prompt, retries=retries, mime_type=mime_type,
                temperature=temperature, max_output_tokens=max_output_tokens,
            )]
            content = "".join(chunks).strip()
            if mime_type == "application/json":
                if content.startswith("```") and content.endswith("```"):
                    content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                json.loads(content)
            return content

        from app.services.admin.ai_settings import get_chat_model

        model = await get_chat_model()

        messages = []
        if mime_type == "application/json":
            # Several existing callers require a top-level JSON array. OpenAI's
            # json_object mode would force those responses into the wrong shape.
            messages.append({
                "role": "system",
                "content": (
                    "Return only valid JSON matching the user's requested structure. "
                    "A top-level object or array is allowed. Do not use Markdown fences."
                ),
            })
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_output_tokens,
            "stream": False,
        }
        endpoint = settings.NINEROUTER_BASE_URL.rstrip("/") + "/chat/completions"
        async with httpx.AsyncClient(
            timeout=settings.NINEROUTER_TIMEOUT_SECONDS,
            headers={"Authorization": f"Bearer {settings.NINEROUTER_API_KEY}"},
        ) as client:
            for attempt in range(1, retries + 1):
                try:
                    response = await client.post(endpoint, json=payload)
                    response.raise_for_status()
                    choice = response.json()["choices"][0]
                    if choice.get("finish_reason") == "length":
                        raise ValueError("9Router response exceeded the output token limit")
                    content = choice["message"]["content"]
                    if isinstance(content, list):
                        content = "".join(
                            part.get("text", "") for part in content
                            if isinstance(part, dict) and part.get("type") == "text"
                        )
                    if not isinstance(content, str) or not content.strip():
                        raise ValueError("9Router returned an empty response")
                    content = content.strip()
                    if mime_type == "application/json":
                        if content.startswith("```") and content.endswith("```"):
                            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                        json.loads(content)
                    return content
                except httpx.HTTPStatusError as exc:
                    status = exc.response.status_code
                    # Do not expose upstream response bodies, prompts, or credentials.
                    if status not in {408, 429} and status < 500:
                        raise RuntimeError(f"9Router request rejected (HTTP {status})") from None
                    error = f"HTTP {status}"
                except httpx.RequestError:
                    error = "connection or timeout error"
                except (ValueError, KeyError, IndexError, TypeError):
                    error = "invalid, incomplete, or empty response"
                logger.warning("9Router attempt %s/%s failed: %s", attempt, retries, error)
                if attempt < retries:
                    await asyncio.sleep(min(2 * attempt, 6))
        raise RuntimeError(f"9Router failed after {retries} attempts: {error}")

    async def stream_model(
        self, prompt: str, retries: int = 3, mime_type: str = "text/plain",
        temperature: float = 0.5, max_output_tokens: int = 8000,
    ):
        """Yield upstream tokens; never retry after any content was emitted."""
        if self.provider != "9router" or not settings.NINEROUTER_STREAM:
            yield await self.call_model(prompt, retries, mime_type, temperature, max_output_tokens)
            return
        if retries < 1 or not settings.NINEROUTER_API_KEY:
            raise ValueError("9Router streaming requires a key and retries >= 1")
        from app.services.admin.ai_settings import get_chat_model

        messages = []
        if mime_type == "application/json":
            messages.append({"role": "system", "content": "Return only valid JSON matching the requested structure, without Markdown fences. Objects and arrays are allowed."})
        messages.append({"role": "user", "content": prompt})
        payload = {"model": await get_chat_model(), "messages": messages,
                   "temperature": temperature, "max_tokens": max_output_tokens, "stream": True}
        emitted = False
        error = "incomplete response"
        async with httpx.AsyncClient(timeout=settings.NINEROUTER_TIMEOUT_SECONDS,
                                     headers={"Authorization": f"Bearer {settings.NINEROUTER_API_KEY}"}) as client:
            for attempt in range(retries):
                try:
                    async with client.stream("POST", settings.NINEROUTER_BASE_URL.rstrip("/") + "/chat/completions", json=payload) as response:
                        response.raise_for_status()
                        completed = False
                        data_lines = []
                        async for line in response.aiter_lines():
                            if line.startswith("data:"):
                                data_lines.append(line[5:].lstrip())
                                continue
                            if line or not data_lines:
                                continue
                            data = "\n".join(data_lines)
                            data_lines = []
                            if data == "[DONE]":
                                completed = True
                                break
                            event = json.loads(data)
                            if event.get("error"):
                                raise ValueError("Upstream stream error")
                            choices = event.get("choices") or []
                            if not choices:
                                continue  # usage-only frames
                            choice = choices[0]
                            if choice.get("finish_reason") in {"length", "content_filter"}:
                                raise ValueError("Incomplete model output")
                            if choice.get("finish_reason") == "stop":
                                completed = True
                            content = choice.get("delta", {}).get("content")
                            if content:
                                if not isinstance(content, str):
                                    raise TypeError("Invalid content chunk")
                                emitted = True
                                yield content
                        if completed and emitted:
                            return
                        raise ValueError("9Router stream ended before completion")
                except httpx.HTTPStatusError as exc:
                    status = exc.response.status_code
                    if status not in {408, 429} and status < 500:
                        raise RuntimeError(f"9Router request rejected (HTTP {status})") from None
                    error = f"HTTP {status}"
                except httpx.RequestError:
                    error = "connection or timeout error"
                except (ValueError, TypeError, KeyError, IndexError):
                    error = "invalid or interrupted stream"
                if emitted:
                    raise RuntimeError("9Router stream was interrupted. Please retry.") from None
                if attempt + 1 < retries:
                    await asyncio.sleep(min(2 * (attempt + 1), 6))
        raise RuntimeError(f"9Router streaming failed: {error}")
