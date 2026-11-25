"""Real protocol tests with deterministic network fixtures and no app secrets."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.agent import mcp_client, mcp_server

from app.agent.tools import REGISTRY, GithubFile, WebSearch, available
from app.core.settings import settings


@pytest.mark.parametrize(
    "path",
    [
        "../private",
        "/etc/passwd",
        "src/../../x",
        "a\\b",
        ".env",
        "src/.env.local",
        "key.pem",
        "a\nfile",
    ],
)
def test_repo_file_cannot_escape_or_read_credentials(path):
    with pytest.raises(ValueError):
        mcp_server.safe_path(path)


def test_external_schemas_and_registry_gate(monkeypatch):
    with pytest.raises(ValidationError):
        GithubFile(owner="user", repo="repo", commit_sha="main", path="file")
    with pytest.raises(ValidationError):
        WebSearch(query="x" * 501)
    monkeypatch.setattr(settings, "AGENT_MCP_ENABLED", False)
    assert not any(
        name.startswith("mcp.")
        for name in available(SimpleNamespace(capabilities=[], lesson_id="lesson"))
    )
    assert all(not REGISTRY["mcp." + name].client for name in mcp_client.TOOLS)






@pytest.mark.asyncio
async def test_real_mcp_handshake_only_exposes_read_tools():
    result = await mcp_client.status()
    assert result["connected"] is True
    assert set(result["tools"]) == mcp_client.TOOLS
    assert result["github_access"] == "public_only"
    assert result["read_only"] is True


@pytest.mark.asyncio
async def test_unlisted_mcp_tool_never_starts_process():
    with patch.object(mcp_client, "exchange", AsyncMock()) as exchange:
        with pytest.raises(HTTPException) as exc:
            await mcp_client.call("run_shell", {"command": "anything"})
        assert exc.value.status_code == 403
        exchange.assert_not_awaited()


@pytest.mark.asyncio
async def test_github_file_is_bounded_and_fixed_commit():
    import base64

    data = {
        "type": "file",
        "size": 15000,
        "encoding": "base64",
        "sha": "blob",
        "html_url": "https://github.com/a/b/blob/" + "a" * 40 + "/x.js",
        "content": base64.b64encode(b"A" * 15000).decode(),
    }
    with patch.object(mcp_server, "github", AsyncMock(return_value=data)) as network:
        first = await mcp_server.github_read_file("a", "b", "a" * 40, "x.js")
        second = await mcp_server.github_read_file(
            "a", "b", "a" * 40, "x.js", offset=first["next_offset"]
        )
        assert first["content"] + second["content"] == "A" * 15000
        assert second["next_offset"] is None and first["tests_executed"] is False
        assert network.call_args.args[1] == {"ref": "a" * 40}
