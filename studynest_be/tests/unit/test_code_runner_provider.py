from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import httpx
import pytest

from app.core.settings import settings
from app.services.shares.code_runner import PistonService
from app.services.user.learning import LearningService


@pytest.mark.asyncio
@pytest.mark.parametrize("key", ["", "private-test-key"])
async def test_execute_auth_is_optional_and_payload_preserves_stdin(key):
    original_client = httpx.AsyncClient

    def handle(request):
        assert str(request.url) == "https://runner.example/api/v2/execute"
        assert request.headers.get("Authorization") == (
            "Bearer " + key if key else None
        )
        assert b'"stdin":"2 3\\n"' in request.content
        return httpx.Response(200, json={"run": {"stdout": "5\n", "code": 0}})

    def client(**kwargs):
        return original_client(transport=httpx.MockTransport(handle), **kwargs)

    with (
        patch.multiple(
            settings, PISTON_URL="https://runner.example/", PISTON_API_KEY=key
        ),
        patch("app.services.shares.code_runner.httpx.AsyncClient", side_effect=client),
    ):
        response = await PistonService().run_code(
            "python", [{"name": "main.py", "content": "print(5)"}], "3.11.0", "2 3\n"
        )
    assert response["run"]["stdout"] == "5\n"


@pytest.mark.asyncio
async def test_runtime_sync_uses_the_same_private_authentication():
    original_client = httpx.AsyncClient

    def handle(request):
        assert str(request.url) == "https://runner.example/api/v2/runtimes"
        assert request.headers["Authorization"] == "Bearer private-test-key"
        return httpx.Response(
            200, json=[{"language": "python", "version": "3.11.0", "aliases": ["py"]}]
        )

    def client(**kwargs):
        return original_client(transport=httpx.MockTransport(handle), **kwargs)

    db = AsyncMock()
    db.scalar.return_value = object()  # Existing runtime must not be duplicated.
    with (
        patch.multiple(
            settings,
            PISTON_URL="https://runner.example",
            PISTON_API_KEY="private-test-key",
        ),
        patch("app.services.shares.code_runner.httpx.AsyncClient", side_effect=client),
    ):
        assert await PistonService().sync_supported_languages(db) == 0
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("response", "verdict"),
    [
        (
            {
                "run": {
                    "code": None,
                    "status": "TO",
                    "signal": "SIGKILL",
                    "cpu_time": None,
                    "memory": None,
                }
            },
            "time_limit_exceeded",
        ),
        ({"run": {"code": None, "status": "SG", "signal": "SIGKILL"}}, "runtime_error"),
        (
            {"compile": {"code": 1, "stderr": "Compilation failed", "status": "RE"}},
            "runtime_error",
        ),
        ({"run": {"code": 0, "stdout": "wrong", "cpu_time": 1}}, "failed"),
    ],
)
async def test_grader_handles_timeout_and_compile_failure(response, verdict):
    language = SimpleNamespace(name="python", version="3.11.0")
    testcase = SimpleNamespace(
        id=uuid4(), input="", expected_output="42", order_index=0, is_sample=False
    )
    exercise = SimpleNamespace(
        id=uuid4(),
        lesson_code_testcases=[testcase],
        time_limit=500,
        memory_limit=256000000,
    )
    db = AsyncMock()
    db.scalar.side_effect = [language, exercise]
    runner = SimpleNamespace(run_code=AsyncMock(return_value=response))
    payload = SimpleNamespace(
        language_id=uuid4(),
        files=[SimpleNamespace(filename="main.py", content="print(42)", is_main=True)],
    )
    result = await LearningService(db=db, piston=runner).test_user_code_async(
        payload, SimpleNamespace(id=uuid4()), exercise.id
    )
    assert result["details"][0]["result"] == verdict
    assert result["saved"] is False
    db.commit.assert_not_awaited()
