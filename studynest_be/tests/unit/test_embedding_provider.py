import json
import unittest
from unittest.mock import patch

import httpx
import numpy as np
from fastapi import HTTPException

from app.core.embedding import EmbeddingService
from app.core.settings import settings


class EmbeddingProviderTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.service = EmbeddingService.__new__(EmbeddingService)
        self.service.EMBED_DIM = 1536
        self.service.EMBED_MODEL = "models/gemini-embedding-001"
        config = patch.multiple(settings, EMBEDDING_PROVIDER="gemini",
                                EMBEDDING_MODEL="gemini-embedding-001", GOOGLE_API_KEY="test-google")
        config.start()
        self.addCleanup(config.stop)

    async def invoke(self, handler, texts):
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        with patch("app.core.embedding.httpx.AsyncClient", return_value=client):
            return await self.service.embed_texts(texts)

    async def test_batches_preserve_order_and_normalize(self):
        vector = [2.0] + [0.0] * 1535

        def handler(request):
            self.assertEqual(str(request.url), "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents")
            self.assertEqual(request.headers["x-goog-api-key"], "test-google")
            self.assertNotIn("Authorization", request.headers)
            self.assertEqual(json.loads(request.content)["requests"][0]["taskType"], "RETRIEVAL_DOCUMENT")
            return httpx.Response(200, json={"embeddings": [
                {"values": vector}, {"values": [-value for value in vector]},
            ]})

        vectors = await self.invoke(handler, ["Xin chào", "Tạm biệt"])
        self.assertEqual(vectors[0][0], 1.0)
        self.assertEqual(vectors[1][0], -1.0)
        self.assertEqual(len(vectors[0]), 1536)

    async def test_search_query_uses_retrieval_query_task(self):
        def handler(request):
            payload = json.loads(request.content)["requests"][0]
            self.assertEqual(payload["taskType"], "RETRIEVAL_QUERY")
            self.assertEqual(payload["outputDimensionality"], 1536)
            return httpx.Response(200, json={"embeddings": [{"values": [1.0] * 1536}]})

        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        with patch("app.core.embedding.httpx.AsyncClient", return_value=client):
            vector = await self.service.embed_query("Các loại dây đàn?")
        self.assertEqual(len(vector), 1536)

    async def test_rejects_zero_vectors_and_wrong_dimensions(self):
        for vector in [[0.0] * 1536, [1.0] * 384]:
            with self.assertRaises(HTTPException) as error:
                await self.invoke(lambda _, vector=vector: httpx.Response(200, json={
                    "embeddings": [{"values": vector}]}), ["Test"])
            self.assertEqual(error.exception.status_code, 502)

    async def test_wrong_batch_size_is_rejected(self):
        with self.assertRaises(HTTPException):
            await self.invoke(lambda _: httpx.Response(200, json={"embeddings": []}), ["Test"])

    async def test_upstream_credentials_error_is_not_a_fake_embedding(self):
        with self.assertRaises(HTTPException) as error:
            await self.invoke(lambda _: httpx.Response(400, text="credential details"), ["Test"])
        self.assertEqual(error.exception.status_code, 503)
        self.assertNotIn("credential details", error.exception.detail)

    async def test_gemini_without_key_fails_explicitly(self):
        with (
            patch.multiple(settings, EMBEDDING_PROVIDER="gemini", GOOGLE_API_KEY=""),
            self.assertRaises(HTTPException) as error,
        ):
            await self.service.embed_google_normalized("Test")
        self.assertEqual(error.exception.status_code, 503)

    def test_nonfinite_values_are_rejected(self):
        for value in [np.nan, np.inf]:
            with self.assertRaises(ValueError):
                self.service._normalize_embedding([value] + [1.0] * 1535)


if __name__ == "__main__":
    unittest.main()
