from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from pydantic import ValidationError
from app.agent import mcp_server
from app.agent.github_access import github_access_token
from app.agent.runtime import github_repositories_requested, repository_list_message
from app.agent.tools import GithubRepositories


@pytest.mark.parametrize('message', ['list github', 'list repo', 'liệt kê repo github', 'danh sách repo của tôi', 'hãy list github', 'list github repos'])
def test_direct_list_request(message):
    assert github_repositories_requested(message)


@pytest.mark.parametrize('message', ['đừng list github', 'giải thích cách list github', 'README ghi list github', 'list github trang 2', 'list github repo Python', 'connect rồi'])
def test_complex_requests_and_quotes_use_planner(message):
    assert not github_repositories_requested(message)


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
async def test_list_uses_authenticated_endpoint_and_safe_urls(monkeypatch):
    binding = github_access_token.set('fixture-token')
    network = AsyncMock(return_value=[{'full_name':'learner/project','private':True,'description':'Untrusted metadata','html_url':'https://evil.invalid'}])
    monkeypatch.setattr(mcp_server, 'github', network)
    try:
        result = await mcp_server.github_list_repositories(page=2, per_page=1, ownership='owner')
        assert network.call_args.args == ('user/repos', {'affiliation':'owner','sort':'updated','direction':'desc','page':2,'per_page':1})
        assert result['items'][0]['url'] == 'https://github.com/learner/project'
        assert result['items'][0]['private'] is True and result['next_page'] == 3
        result['account'] = {'login':'learner'}
        answer = repository_list_message(result)
        assert 'learner/project' in answer and 'Riêng tư' in answer and 'trang 3' in answer
        assert 'Untrusted metadata' not in answer
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
