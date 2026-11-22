from types import SimpleNamespace
from unittest.mock import MagicMock
import json
import pytest
from fastapi import HTTPException
from app.agent.contracts import CreateSession
from app.agent.runtime import build_prompt
from app.agent.tools import REGISTRY, available, DiscoverTools, discover_tools, CatalogSearch, WebSearch
from app.core.settings import settings


@pytest.mark.asyncio
async def test_discovery_only_returns_session_grants(monkeypatch):
    monkeypatch.setattr(settings, 'AGENT_MCP_ENABLED', False)
    ctx = SimpleNamespace(session=SimpleNamespace(lesson_id=None, capabilities=[]))
    result = await discover_tools(ctx, DiscoverTools(names=['catalog.get_course', 'video.play', 'mcp.web_search', 'fake.tool']))
    assert [t['name'] for t in result['tools']] == ['catalog.get_course']
    assert set(result['unavailable']) == {'video.play', 'mcp.web_search', 'fake.tool'}
    assert result['tools'][0]['input_schema']['properties']['course_id']['format'] == 'uuid'


def test_complete_manifest_survives_schema_paging(monkeypatch):
    monkeypatch.setattr(settings, 'AGENT_MCP_ENABLED', True)
    granted = available(SimpleNamespace(lesson_id='fixture', capabilities=[]))
    context = {'tools': [{'name':t.name, 'description':t.description, 'input_schema':t.input_model.model_json_schema()} for t in granted.values()]}
    prompt = build_prompt('Tin công nghệ hôm nay?', context, [])
    payload = json.loads(prompt[prompt.index('{"user_request":'):])['context']
    assert {t['name'] for t in payload['tool_catalog']} == set(granted)
    assert 'tools.discover' in [t['name'] for t in payload['tools']]
    assert len(payload['tools']) == len(granted)  # No schema clipping below the model-window trigger.


def test_catalog_can_browse_without_inventing_search_keywords():
    assert CatalogSearch().query == ''
    assert CatalogSearch(query='').query == ''


@pytest.mark.asyncio
async def test_news_search_preserves_freshness_metadata(monkeypatch):
    from app.agent import mcp_server
    engine = MagicMock()
    engine.news.return_value = [{'title':'Tin mới', 'url':'https://example.org/news', 'body':'Tóm tắt', 'date':'2026-11-13', 'source':'Example'}]
    monkeypatch.setattr(mcp_server, 'DDGS', lambda **kw: engine)
    args = WebSearch(query='NVIDIA 13/11/2026', category='news', timelimit='d')
    result = await mcp_server.web_search(**args.model_dump())
    assert result['items'][0]['published_at'] == '2026-11-13'
    assert result['items'][0]['publisher'] == 'Example'
    engine.news.assert_called_once()
    assert engine.news.call_args.kwargs['timelimit'] == 'd'
    engine.text.assert_not_called()
