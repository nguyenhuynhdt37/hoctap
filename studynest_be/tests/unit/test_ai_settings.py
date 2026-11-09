import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from fastapi import HTTPException

from app.core.settings import settings
from app.services.admin.ai_settings import (
    discover_models,
    get_ai_settings,
    get_chat_model,
    save_ai_settings,
)


class AISettingsTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        config = patch.multiple(
            settings, LLM_PROVIDER="9router", NINEROUTER_AUTO_MODEL="mixed",
            NINEROUTER_API_KEY="test-key", NINEROUTER_BASE_URL="https://router.example/v1",
        )
        config.start()
        self.addCleanup(config.stop)
        self.models = [{"id": "mixed", "kind": "combo"}, {"id": "ag/model", "kind": "model"}]

    async def test_discovery_filters_duplicates_and_separates_combos(self):
        def handler(request):
            self.assertEqual(request.headers["Authorization"], "Bearer test-key")
            return httpx.Response(200, json={"data": [
                {"id": "mixed", "owned_by": "combo"}, {"id": "ag/model"},
                {"id": "ag/model"}, {"id": ""},
            ]})

        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        with patch("app.services.admin.ai_settings.httpx.AsyncClient", return_value=client):
            self.assertEqual(await discover_models(), self.models)

    async def test_auto_and_manual_changes_are_read_for_each_call(self):
        db = AsyncMock()
        db.scalar.side_effect = ["auto", "ag/model"]
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=db)
        context.__aexit__ = AsyncMock(return_value=None)
        with patch("app.services.admin.ai_settings.AsyncSessionLocal", return_value=context):
            self.assertEqual(await get_chat_model(), "mixed")
            self.assertEqual(await get_chat_model(), "ag/model")
        self.assertEqual(db.scalar.await_count, 2)

    async def test_valid_selection_commits_and_tracks_admin(self):
        for selection, effective in [("auto", "mixed"), ("ag/model", "ag/model")]:
            row = SimpleNamespace()
            db = AsyncMock()
            db.scalar.return_value = row
            admin_id = uuid.uuid4()
            with patch("app.services.admin.ai_settings.discover_models", AsyncMock(return_value=self.models)):
                result = await save_ai_settings(db, selection, admin_id)
            self.assertEqual(result["effective_model"], effective)
            self.assertEqual(row.llm_model, selection)
            self.assertEqual(row.updated_by, admin_id)
            db.commit.assert_awaited_once()

    async def test_unknown_model_cannot_be_saved(self):
        db = AsyncMock()
        with (
            patch("app.services.admin.ai_settings.discover_models", AsyncMock(return_value=self.models)),
            self.assertRaises(HTTPException) as error,
        ):
            await save_ai_settings(db, "unknown", uuid.uuid4())
        self.assertEqual(error.exception.status_code, 422)
        db.scalar.assert_not_awaited()
        db.commit.assert_not_awaited()

    async def test_outage_keeps_saved_model_visible_and_prevents_save(self):
        db = AsyncMock()
        db.scalar.return_value = "ag/model"
        with patch("app.services.admin.ai_settings.discover_models", AsyncMock(side_effect=HTTPException(502, "Offline"))):
            result = await get_ai_settings(db)
            with self.assertRaises(HTTPException):
                await save_ai_settings(db, "auto", uuid.uuid4())
        self.assertFalse(result["connected"])
        self.assertEqual(result["selected_model"], "ag/model")
        self.assertEqual(result["connection_error"], "Offline")
        db.commit.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
