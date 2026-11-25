from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from pydantic import ValidationError
from app.agent import mcp_server
from app.agent.github_access import github_access_token

from app.agent.tools import GithubRepositories






def test_pagination_and_identity_cannot_be_injected():
    for args in [{'user_id':'other'}, {'token':'secret'}, {'per_page':500}, {'page':0}, {'ownership':'everyone'}]:
        with pytest.raises(ValidationError):
            GithubRepositories(**args)


@pytest.mark.asyncio
async def test_list_requires_account_token(monkeypatch):
    binding = github_access_token.set(None)
    network = AsyncMock()
    monkeypatch.setattr(mcp_server, 'github', network)
    try:
        with pytest.raises(ValueError):
            await mcp_server.github_list_repositories()
        network.assert_not_awaited()
    finally:
        github_access_token.reset(binding)




@pytest.mark.asyncio
async def test_concurrent_accounts_do_not_share_token(monkeypatch):
    import asyncio
    async def network(*args):
        token = github_access_token.get()
        await asyncio.sleep(0)
        assert github_access_token.get() == token
        return [{'full_name':token+'/project'}]
    monkeypatch.setattr(mcp_server, 'github', network)
    async def read(account):
        binding = github_access_token.set(account)
        try:
            return await mcp_server.github_list_repositories()
        finally:
            github_access_token.reset(binding)
    first, second = await asyncio.gather(read('first'), read('second'))
    assert first['items'][0]['full_name'] == 'first/project'
    assert second['items'][0]['full_name'] == 'second/project'
