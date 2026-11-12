import json
import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.core.llm import LLMService
from app.core.settings import settings


class NineRouterTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.config = patch.multiple(
            settings,
            LLM_PROVIDER="9router",
            NINEROUTER_BASE_URL="https://router.example/v1/",
            NINEROUTER_API_KEY="test-key",
            NINEROUTER_MODEL="gemini",
            NINEROUTER_STREAM=False,
        )
        self.config.start()
        self.addCleanup(self.config.stop)
        model = patch(
            "app.services.admin.ai_settings.get_chat_model",
            new_callable=AsyncMock,
            return_value="gemini",
        )
        self.model = model.start()
        self.addCleanup(model.stop)

    async def invoke(self, handler, **kwargs):
        client = httpx.AsyncClient(
            transport=httpx.MockTransport(handler),
            headers={"Authorization": "Bearer test-key"},
        )
        with patch("app.core.llm.httpx.AsyncClient", return_value=client):
            return await LLMService().call_model("Test prompt", **kwargs)

    @staticmethod
    def completion(content, finish_reason="stop"):
        return httpx.Response(200, json={"choices": [{
            "message": {"content": content}, "finish_reason": finish_reason,
        }]})

    async def test_json_arrays_and_fences_preserve_existing_callers(self):
        def handler(request):
            self.assertEqual(str(request.url), "https://router.example/v1/chat/completions")
            self.assertEqual(request.headers["Authorization"], "Bearer test-key")
            body = json.loads(request.content)
            self.assertEqual(body["model"], "gemini")
            self.assertEqual(body["max_tokens"], 8000)
            self.assertFalse(body["stream"])
            self.assertNotIn("response_format", body)
            return self.completion('```json\n[{"ok":true}]\n```')

        result = await self.invoke(handler)
        self.assertEqual(json.loads(result), [{"ok": True}])

    async def test_plain_text_does_not_force_json(self):
        def handler(request):
            body = json.loads(request.content)
            self.assertEqual(len(body["messages"]), 1)
            return self.completion("Xin chào")

        self.assertEqual(await self.invoke(handler, mime_type="text/plain"), "Xin chào")

    async def test_rate_limit_retries_then_succeeds(self):
        calls = []

        def handler(request):
            calls.append(request)
            return httpx.Response(429) if len(calls) == 1 else self.completion('{"ok":true}')

        with patch("app.core.llm.asyncio.sleep", new_callable=AsyncMock):
            self.assertEqual(json.loads(await self.invoke(handler)), {"ok": True})
        self.assertEqual(len(calls), 2)

    async def test_auth_failure_is_not_retried_or_exposed(self):
        calls = []

        def handler(request):
            calls.append(request)
            return httpx.Response(401, text="test-key confidential upstream detail")

        with self.assertRaisesRegex(RuntimeError, r"^9Router request rejected \(HTTP 401\)$"):
            await self.invoke(handler)
        self.assertEqual(len(calls), 1)

    async def test_malformed_and_truncated_outputs_fail(self):
        for content, finish in [("not JSON", "stop"), ('{"cut":', "length"), (None, "stop")]:
            with (
                self.subTest(content=content, finish=finish),
                self.assertRaisesRegex(RuntimeError, "invalid, incomplete, or empty response"),
            ):
                await self.invoke(
                    lambda _, text=content, reason=finish: self.completion(text, reason),
                    retries=1,
                )

    async def test_missing_key_fails_before_network(self):
        with (
            patch.object(settings, "NINEROUTER_API_KEY", ""),
            self.assertRaisesRegex(ValueError, "NINEROUTER_API_KEY"),
        ):
            await LLMService().call_model("Test")

    async def test_server_model_override_does_not_change_global_selection(self):
        def handler(request):
            self.assertEqual(json.loads(request.content)['model'], 'ag/fast-tutor')
            return self.completion('{"ok":true}')
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        with patch('app.core.llm.httpx.AsyncClient', return_value=client):
            result = await LLMService(model_override='ag/fast-tutor').call_model('Test')
        self.assertEqual(json.loads(result), {'ok': True})
        self.model.assert_not_awaited()

    def test_unknown_provider_is_rejected(self):
        with (
            patch.object(settings, "LLM_PROVIDER", "typo"),
            self.assertRaisesRegex(ValueError, "LLM_PROVIDER"),
        ):
            LLMService()


if __name__ == "__main__":
    unittest.main()
