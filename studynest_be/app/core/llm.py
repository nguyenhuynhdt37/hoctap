import asyncio
import base64
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


def get_llm_service() -> "LLMService":
    """FastAPI dependency provider cho LLMService (tránh lộ tham số __init__ thành HTTP params)."""
    return LLMService()


class LLMService:
    """Chat service with selectable Gemini and 9Router providers."""

    def __init__(self, *, model_override: str | None = None, provider_override: str | None = None, stream_override: bool | None = None, messages_override: list[dict] | None = None, native_tools: list[dict] | None = None) -> None:
        self.last_native_calls = []
        self.native_tools = native_tools
        self.messages_override = messages_override
        self.model_override = model_override
        self.stream_override = stream_override
        self.last_usage: dict[str, int] = {}
        self.last_model: str | None = None
        self.provider = (provider_override or settings.LLM_PROVIDER).strip().lower()
        if self.provider not in {"gemini", "9router"}:
            raise ValueError("LLM_PROVIDER must be gemini or 9router")
        self.primary_model = (
            settings.NINEROUTER_MODEL
            if self.provider == "9router"
            else (model_override or "models/gemini-3.1-flash-lite")
        )

    @staticmethod
    def _multimodal_content(prompt, images=None):
        if not images:
            return prompt
        return [{"type":"text", "text":prompt}, *[
            {"type":"image_url", "image_url":{"url":"data:" + image['mime_type'] + ";base64," + base64.b64encode(image['data']).decode(), "detail":"high"}}
            for image in images]]

    def _record_usage(self, usage):
        """Provider-reported tokens only; never invent usage when absent."""
        if not isinstance(usage, dict):
            return
        validated = {key:value for key,value in usage.items() if key in {'prompt_tokens','completion_tokens','total_tokens'}
                     and isinstance(value,int) and not isinstance(value,bool) and 0 <= value <= 100_000_000}
        if validated:
            self.last_usage = validated

    async def call_model(
        self,
        prompt: str,
        retries: int = 3,
        mime_type: str = "application/json",
        temperature: float = 0.5,
        max_output_tokens: int = 8000,
        images: list[dict] | None = None,
    ) -> str:
        self.last_usage = {}
        if retries < 1:
            raise ValueError("retries must be at least 1")
        if self.provider == "9router":
            return await self._call_ninerouter(
                prompt, retries, mime_type, temperature, max_output_tokens, images
            )

        import google.generativeai as genai

        genai.configure(api_key=settings.GOOGLE_API_KEY_CHAT or settings.GOOGLE_API_KEY)

        async def _safe_call(model_name: str) -> str:
            def _sync_call():
                model = genai.GenerativeModel(model_name)

                response = model.generate_content(
                    [prompt, *[{"mime_type":image["mime_type"], "data":image["data"]} for image in images]] if images else prompt,
                    generation_config={
                        "response_mime_type": mime_type,
                        "temperature": temperature,
                        "max_output_tokens": max_output_tokens,
                    },
                )

                usage = getattr(response, 'usage_metadata', None)
                self.last_model = model_name
                if usage:
                    self._record_usage({'prompt_tokens':getattr(usage,'prompt_token_count',None),
                        'completion_tokens':getattr(usage,'candidates_token_count',None),
                        'total_tokens':getattr(usage,'total_token_count',None)})
                # SDK mới: dùng .text không còn chắc chắn → dùng .candidates
                try:
                    text = response.text.strip()
                except Exception:
                    text = response.candidates[0].content.parts[0].text.strip()

                if not text:
                    return "⚠️ Mô hình không sinh được nội dung."

                if mime_type == "application/json" and text.startswith("```") and text.endswith("```"):
                    text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

                if self.native_tools is not None:
                    try:
                        parsed = json.loads(text)
                    except json.JSONDecodeError:
                        return json.dumps({"message": text, "tool_calls": [], "done": True}, ensure_ascii=False)
                    if isinstance(parsed, dict):
                        cleaned = {k: v for k, v in parsed.items() if k in {"message", "plan", "tool_calls", "done", "memories"}}
                        if isinstance(cleaned.get("tool_calls"), list):
                            norm_calls = []
                            for tc in cleaned["tool_calls"]:
                                if isinstance(tc, dict) and isinstance(tc.get("name"), str):
                                    tname = tc["name"].replace("__", ".")
                                    targs = tc.get("arguments") if isinstance(tc.get("arguments"), dict) else {}
                                    for meta in ("reason", "reasoning"):
                                        targs.pop(meta, None)
                                    norm_calls.append({"name": tname, "arguments": targs})
                            cleaned["tool_calls"] = norm_calls
                        return json.dumps(cleaned, ensure_ascii=False)

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
                return "🚫 Dịch vụ AI chưa được cấp quyền hoặc chưa bật billing."

            except InvalidArgument as e:
                logger.error("Gemini rejected request arguments")
                return "⚠️ Dịch vụ AI chưa xử lý được yêu cầu này."

            except Exception as e:
                last_error = e
                logger.warning("Gemini temporary failure attempt=%s/%s error=%s", attempt, retries, type(e).__name__)
                if attempt < retries:
                    await asyncio.sleep(2)

        # Nếu chạy hết số lần retry mà vẫn lỗi thì trả về thông báo lỗi chi tiết
        err_msg = f"❌ Dịch vụ AI chưa hoàn tất sau {retries} lần thử. Vui lòng thử lại sau."
        logger.error(err_msg)
        return err_msg

    async def _call_ninerouter(
        self,
        prompt: str,
        retries: int,
        mime_type: str,
        temperature: float,
        max_output_tokens: int,
        images: list[dict] | None = None,
    ) -> str:
        if not settings.NINEROUTER_API_KEY:
            raise ValueError("NINEROUTER_API_KEY is required for 9router")

        if (settings.NINEROUTER_STREAM if self.stream_override is None else self.stream_override) and not images and self.messages_override is None and self.native_tools is None:
            chunks = [chunk async for chunk in self.stream_model(
                prompt, retries=retries, mime_type=mime_type,
                temperature=temperature, max_output_tokens=max_output_tokens, images=images,
            )]
            content = "".join(chunks).strip()
            if mime_type == "application/json":
                if content.startswith("```") and content.endswith("```"):
                    content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                json.loads(content)
            return content

        from app.services.admin.ai_settings import get_chat_model

        model = self.model_override or await get_chat_model()
        self.last_model = model

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
        messages.append({"role": "user", "content": self._multimodal_content(prompt, images)})
        if self.messages_override is not None:
            messages = self.messages_override
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_output_tokens,
            "stream": False,
        }
        if self.native_tools:
            payload["tools"] = self.native_tools
            payload["tool_choice"] = "auto"
        endpoint = settings.NINEROUTER_BASE_URL.rstrip("/") + "/chat/completions"
        async with httpx.AsyncClient(
            timeout=settings.NINEROUTER_TIMEOUT_SECONDS,
            headers={"Authorization": f"Bearer {settings.NINEROUTER_API_KEY}"},
        ) as client:
            for attempt in range(1, retries + 1):
                try:
                    response = await client.post(endpoint, json=payload)
                    response.raise_for_status()
                    body = response.json()
                    self._record_usage(body.get("usage"))
                    choice = body["choices"][0]
                    if choice.get("finish_reason") == "length":
                        raise ValueError("9Router response exceeded the output token limit")
                    native_calls = choice["message"].get("tool_calls") or []
                    if native_calls:
                        calls = []
                        cleaned_calls = []
                        for call in native_calls:
                            function = call["function"]
                            arguments = json.loads(function.get("arguments") or "{}")
                            schema = next((t['function']['parameters'] for t in (self.native_tools or []) if t['function']['name'] == function['name']), {})
                            if isinstance(arguments, dict):
                                for metadata in ('reason', 'reasoning'):
                                    if metadata not in schema.get('properties', {}):
                                        arguments.pop(metadata, None)
                            calls.append({"name": function["name"].replace("__", "."), "arguments": arguments})
                            cleaned_calls.append({**call, 'function':{**function,'arguments':json.dumps(arguments,ensure_ascii=False)}})
                        self.last_native_calls = cleaned_calls
                        # Agent contract stays stable for policy validation/events.
                        return json.dumps({"message":"", "tool_calls":calls, "done":False}, ensure_ascii=False)
                    content = choice["message"]["content"]
                    if isinstance(content, list):
                        content = "".join(
                            part.get("text", "") for part in content
                            if isinstance(part, dict) and part.get("type") == "text"
                        )
                    if not isinstance(content, str) or not content.strip():
                        raise ValueError("9Router returned an empty response")
                    content = content.strip()
                    if mime_type == "application/json" and content.startswith("```") and content.endswith("```"):
                        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                    if self.native_tools is not None:
                        try:
                            parsed = json.loads(content)
                        except json.JSONDecodeError:
                            # Native function mode also permits an ordinary final answer.
                            return json.dumps({"message":content,"tool_calls":[],"done":True},ensure_ascii=False)
                        if isinstance(parsed, dict):
                            # Discard unsolicited reasoning/protocol metadata, never persist it.
                            parsed = {k:v for k,v in parsed.items() if k in {'message','plan','tool_calls','done','memories'}}
                            return json.dumps(parsed,ensure_ascii=False)
                    if mime_type == "application/json":
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
        temperature: float = 0.5, max_output_tokens: int = 8000, images: list[dict] | None = None,
    ):
        """Yield upstream tokens; never retry after any content was emitted."""
        if self.provider != "9router" or not (settings.NINEROUTER_STREAM if self.stream_override is None else self.stream_override):
            yield await self.call_model(prompt, retries, mime_type, temperature, max_output_tokens, images=images)
            return
        if retries < 1 or not settings.NINEROUTER_API_KEY:
            raise ValueError("9Router streaming requires a key and retries >= 1")
        from app.services.admin.ai_settings import get_chat_model

        messages = []
        if mime_type == "application/json":
            messages.append({"role": "system", "content": "Return only valid JSON matching the requested structure, without Markdown fences. Objects and arrays are allowed."})
        messages.append({"role": "user", "content": self._multimodal_content(prompt, images)})
        payload = {"model": self.model_override or await get_chat_model(), "messages": messages,
                   "temperature": temperature, "max_tokens": max_output_tokens, "stream": True,
                   "stream_options": {"include_usage": True}}
        self.last_model = payload["model"]
        self.last_usage = {}
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
                            self._record_usage(event.get("usage"))
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
