import asyncio
import json
import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.core.chat_stream import chat_stream_response, partial_json_content
from app.core.llm import LLMService
from app.core.settings import settings


def frame(content=None, finish=None):
    return "data: " + json.dumps({"choices": [{
        "delta": {"content": content} if content else {}, "finish_reason": finish,
    }]}, ensure_ascii=False) + "\n\n"


class ByteStream(httpx.AsyncByteStream):
    def __init__(self, data):
        self.data = data.encode()

    async def __aiter__(self):
        for start in range(0, len(self.data), 7):
            yield self.data[start:start + 7]


class ChatStreamTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        config = patch.multiple(settings, LLM_PROVIDER="9router", NINEROUTER_STREAM=True,
                                NINEROUTER_API_KEY="test", NINEROUTER_BASE_URL="https://router.example/v1")
        config.start()
        self.addCleanup(config.stop)
        model = patch("app.services.admin.ai_settings.get_chat_model", AsyncMock(return_value="mixed"))
        model.start()
        self.addCleanup(model.stop)

    async def run_stream(self, handler, aggregate=False):
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler), headers={"Authorization": "Bearer test"})
        with patch("app.core.llm.httpx.AsyncClient", return_value=client):
            if aggregate:
                return await LLMService().call_model("Test", mime_type="application/json")
            return [chunk async for chunk in LLMService().stream_model("Test", retries=2)]

    async def test_upstream_tokens_and_utf8_boundaries(self):
        def handler(request):
            self.assertTrue(json.loads(request.content)["stream"])
            self.assertEqual(json.loads(request.content)["model"], "mixed")
            return httpx.Response(200, stream=ByteStream(frame("Xin ") + frame("chào 🚀") + frame(finish="stop") + 'data: [DONE]\n\n'))
        self.assertEqual(await self.run_stream(handler), ["Xin ", "chào 🚀"])

    async def test_router_stop_without_done_is_supported(self):
        result = await self.run_stream(lambda _: httpx.Response(200, stream=ByteStream(frame("OK") + frame(finish="stop"))))
        self.assertEqual(result, ["OK"])

    async def test_structured_internal_calls_aggregate_stream(self):
        content = '{"status":"ok"}'
        result = await self.run_stream(lambda _: httpx.Response(200, stream=ByteStream(frame(content[:5]) + frame(content[5:]) + frame(finish="stop"))), aggregate=True)
        self.assertEqual(json.loads(result), {"status": "ok"})

    async def test_interrupted_stream_is_never_retried_after_content(self):
        calls = []
        def handler(request):
            calls.append(request)
            return httpx.Response(200, stream=ByteStream(frame("Partial")))
        with self.assertRaisesRegex(RuntimeError, "interrupted"):
            await self.run_stream(handler)
        self.assertEqual(len(calls), 1)

    async def test_retry_before_first_token(self):
        calls = []
        def handler(request):
            calls.append(request)
            return httpx.Response(429) if len(calls) == 1 else httpx.Response(200, stream=ByteStream(frame("OK") + frame(finish="stop")))
        with patch("app.core.llm.asyncio.sleep", AsyncMock()):
            self.assertEqual(await self.run_stream(handler), ["OK"])
        self.assertEqual(len(calls), 2)

    def test_partial_json_unescapes_only_visible_content(self):
        content = 'Xin chào\n"Python" 🚀'
        document = json.dumps({"title": "title", "content": content, "sources_used": []})
        previous = ""
        for stop in range(len(document) + 1):
            visible = partial_json_content(document[:stop])
            self.assertTrue(visible.startswith(previous), (stop, visible, previous))
            self.assertTrue(content.startswith(visible))
            previous = visible
        self.assertEqual(previous, content)

    async def test_api_transport_sends_delta_then_final(self):
        async def work(on_delta):
            await on_delta("Xin ")
            await on_delta("chào")
            return {"response": "Xin chào"}
        response = chat_stream_response(work)
        events = [event async for event in response.body_iterator]
        self.assertIn('"type": "delta"', events[1])
        self.assertIn('"type": "done"', events[-1])
        self.assertEqual(response.headers["x-accel-buffering"], "no")

    async def test_client_disconnect_cancels_producer(self):
        cancelled = asyncio.Event()
        async def work(on_delta):
            try:
                await on_delta("First")
                await asyncio.Event().wait()
            finally:
                cancelled.set()
        iterator = chat_stream_response(work).body_iterator
        await anext(iterator)
        await anext(iterator)
        await iterator.aclose()
        await asyncio.wait_for(cancelled.wait(), timeout=1)

    async def test_stream_errors_do_not_expose_upstream_details(self):
        async def work(on_delta):
            raise RuntimeError("secret-key-should-not-leak")
        events = [event async for event in chat_stream_response(work).body_iterator]
        self.assertIn('"type": "error"', events[-1])
        self.assertNotIn("secret-key", "".join(events))


if __name__ == "__main__":
    unittest.main()
