"""Allowlisted MCP transport, deliberately isolated from app credentials."""

import asyncio
import json
import os
import sys
from pathlib import Path

from fastapi import HTTPException
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

TOOLS = {"web_search", "github_list_repositories", "github_repository", "github_tree", "github_read_file"}
ROOT = Path(__file__).resolve().parents[2]


async def exchange(name=None, arguments=None):
    # Never inherit DB credentials, JWT keys or developer GitHub credentials.
    env = {"PYTHONPATH": str(ROOT), "PYTHONUNBUFFERED": "1"}
    for key in ("SSL_CERT_FILE", "SSL_CERT_DIR"):
        if os.getenv(key):
            env[key] = os.environ[key]
    params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "app.agent.mcp_server"],
        env=env,
        cwd=str(ROOT),
    )
    async with (
        stdio_client(params) as (read, write),
        ClientSession(read, write) as session,
    ):
        await session.initialize()
        if name is None:
            result = await session.list_tools()
            return {
                "connected": True,
                "server": "maymay-public-research",
                "tools": [tool.name for tool in result.tools if tool.name in TOOLS],
                "github_access": "public_only",
                "read_only": True,
            }
        result = await session.call_tool(name, arguments or {})
        if result.isError:
            raise ValueError("External MCP tool failed")
        data = result.structuredContent
        if data is None:
            data = json.loads(
                "".join(item.text for item in result.content if item.type == "text")
            )
        if len(json.dumps(data, ensure_ascii=False)) > 60000:
            raise ValueError("External result exceeds context limit")
        return data


async def call(name, arguments):
    if name not in TOOLS:
        raise HTTPException(403, "Công cụ MCP không được cấp phép")
    try:
        async with asyncio.timeout(28):
            return await exchange(name, arguments)
    except asyncio.CancelledError:
        raise
    except Exception:  # noqa: BLE001 -- MCP task groups wrap provider failures; do not expose payloads.
        raise HTTPException(
            502,
            "MCP chưa trả được dữ liệu. Có thể do mạng, giới hạn dịch vụ hoặc repo không công khai; chưa có kết quả được xác minh.",
        ) from None


async def status():
    try:
        async with asyncio.timeout(10):
            return await exchange()
    except Exception:  # noqa: BLE001 -- MCP task groups wrap provider failures; do not expose payloads.
        return {
            "connected": False,
            "tools": [],
            "github_access": "public_only",
            "read_only": True,
        }
