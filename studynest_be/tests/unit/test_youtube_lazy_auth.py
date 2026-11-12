"""Code-language reads must not depend on an authenticated YouTube account."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI, HTTPException

from app.api.v1.lecturer.lesson import router
from app.core.deps import AuthorizationService
from app.core.embedding import get_embedding_service
from app.db.sesson import get_session
from app.services.shares import youtube_uploader
from app.services.shares.file_storage import get_file_storage_service


@pytest.mark.asyncio
async def test_youtube_dependency_does_not_authenticate_on_creation(
    monkeypatch, tmp_path
):
    monkeypatch.setattr(
        youtube_uploader, "TOKEN_PATH", str(tmp_path / "missing-token.json")
    )
    monkeypatch.setattr(youtube_uploader, "_youtube_service", None)
    service = await youtube_uploader.get_youtube_service()
    assert service._access_token is None
    assert (
        await service.extract_youtube_id("https://youtu.be/abc123XYZ89")
        == "abc123XYZ89"
    )
    with pytest.raises(HTTPException) as error:
        await service._load_token()
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_existing_youtube_token_can_still_be_loaded(monkeypatch, tmp_path):
    token = tmp_path / "token.json"
    token.write_text('{"token": "local-test-only"}')
    monkeypatch.setattr(youtube_uploader, "TOKEN_PATH", str(token))
    assert await youtube_uploader.YouTubeAsyncService()._load_token() == {
        "token": "local-test-only"
    }


@pytest.mark.asyncio
async def test_code_languages_without_youtube_token(monkeypatch, tmp_path):
    monkeypatch.setattr(
        youtube_uploader, "TOKEN_PATH", str(tmp_path / "missing-token.json")
    )
    monkeypatch.setattr(youtube_uploader, "_youtube_service", None)
    language = SimpleNamespace(
        id=uuid4(), name="python", version="3.10.0", is_active=True
    )
    db = AsyncMock()
    db.scalars.return_value = Mock(all=Mock(return_value=[language]))

    async def session():
        yield db

    authorization = SimpleNamespace(
        require_role=AsyncMock(return_value=SimpleNamespace(id=uuid4()))
    )
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_session] = session
    app.dependency_overrides[AuthorizationService] = lambda: authorization
    app.dependency_overrides[get_file_storage_service] = lambda: object()
    app.dependency_overrides[get_embedding_service] = lambda: object()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/lecturer/lessons/code_languages")
    assert response.status_code == 200
    assert response.json()[0]["name"] == "python"
    authorization.require_role.assert_awaited_once_with(["LECTURER"])
    db.scalars.assert_awaited_once()
