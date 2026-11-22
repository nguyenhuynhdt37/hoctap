import json
from pathlib import Path
import pytest
from app.agent.routing import route_request, tool_relevant
from app.agent.runtime import needs_lesson_grounding

CASES = json.loads((Path(__file__).parents[1] / 'evals/assistant_routing_cases.json').read_text())

@pytest.mark.parametrize('case', CASES, ids=lambda c:c['id'])
def test_tool_relevance_and_grounding_matrix(case):
    images = case.get('images', False)
    assert tool_relevant('knowledge.search_lesson', case['message'], has_images=images) == case['search']
    if 'ground' in case:
        assert needs_lesson_grounding(case['message'], has_images=images) == case['ground']
    if not case['search']:
        assert not needs_lesson_grounding(case['message'], has_images=images)

@pytest.mark.parametrize('message', ['Giải thích bài học này', 'tớ tên gì v', 'Mỗi khi học mình thích sơ đồ', 'GitHub MCP là gì?'])
def test_unicode_and_case_normalization_preserves_domain(message):
    import unicodedata
    expected=route_request(message)
    assert route_request('  '+unicodedata.normalize('NFD',message.upper())+'  ')==expected


@pytest.mark.parametrize('previous,allowed', [
    ('Tóm tắt bài học này',True), ('Tôi làm kế toán',False),
    ('Mình thích con vật gì?',False), ('Closure là gì?',False),
    ('Trong bài này giảng viên nói gì?',True), ('list github',False),
])
def test_followup_inherits_previous_task_instead_of_current_page(previous,allowed):
    route=route_request('Giải thích kỹ hơn',previous_route=route_request(previous))
    assert route.search_lesson==allowed and not route.ground_lesson
