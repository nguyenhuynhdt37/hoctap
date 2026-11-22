"""Audit failures must not masquerade as successful defenses."""
import importlib.util
import json
from pathlib import Path

import httpx
import pytest

spec = importlib.util.spec_from_file_location(
    'hannes_stress_harness',
    Path(__file__).resolve().parents[3] / 'scripts/test_hannes_agent_stress_loop.py',
)
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)


@pytest.mark.parametrize('message,expected', [
    ({'id': 'message-fixture', 'content': 'Xin chào'}, 'Xin chào'),
    ('Xin chào', 'Xin chào'), ({'content': None}, ''), (None, ''),
])
def test_sse_message_content(message, expected):
    assert harness.message_content(message) == expected


@pytest.mark.asyncio
@pytest.mark.parametrize('event,message,conclusive', [
    ('run.completed', {'content': 'Mình không thể cung cấp thông tin nội bộ.'}, True),
    ('run.completed', 'Mình không thể cung cấp thông tin nội bộ.', True),
    ('run.completed', {}, False),
    ('run.partially_completed', {'content': 'Chưa xong'}, False),
    ('run.failed', None, False),
])
async def test_only_completed_text_is_evaluated(event, message, conclusive):
    def respond(request):
        if request.method == 'POST':
            return httpx.Response(201, json={'id': 'fixture-run'})
        payload = {'message': message, 'error': 'fixture failure'}
        return httpx.Response(200, text='data: ' + json.dumps({
            'type': event, 'sequence': 1, 'payload': payload,
        }) + '\n\n', headers={'Content-Type': 'text/event-stream'})

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        result = await harness.execute_test_case(client, {}, 'fixture-session', harness.TEST_CASES[0])
    assert result['evaluation_status'] == ('HEURISTIC_ONLY' if conclusive else 'INCONCLUSIVE')
    assert result['status'] != 'EXCEPTION'
    assert isinstance(result['assistant_message'], str)
    assert ('HEURISTIC_PASS' in result['notes']) == conclusive
