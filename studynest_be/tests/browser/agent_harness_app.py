"""Isolated browser verification: real domain/runtime/UI/runner; scripted planner only.

Never use this entry point for deployment. The DB name must explicitly indicate a
throwaway test clone. Uvicorn must run with --lifespan off to avoid schedulers.
"""
import json
import os
import re
from urllib.parse import urlsplit

from app.core.settings import settings

if os.getenv('AGENT_BROWSER_SCRIPTED_MODEL') != '1':
    raise RuntimeError('Browser fixture requires explicit scripted-model opt-in')
database_name = urlsplit(settings.DATABASE_ASYNC_URL).path.lower()
if not any(marker in database_name for marker in ('test', 'agent')):
    raise RuntimeError('Browser fixture requires an isolated test database')

from app.main import app
from app.core.llm import LLMService


def decision(name=None, arguments=None, message='Đã nhận kết quả đã xác minh từ các công cụ.'):
    return json.dumps({'message': '' if name else message,
        'plan': ['Đọc phiên bản đang mở', 'Đề xuất thay đổi để bạn xem lại', 'Áp dụng sau xác nhận và chạy test mẫu'] if name and name.startswith('editor.') else [],
        'tool_calls': [{'name': name, 'arguments': arguments or {}}] if name else [], 'done': not bool(name)}, ensure_ascii=False)


async def scripted_model(self, prompt, **kwargs):
    # Runtime's final JSON envelope is parsed structurally, not by tool output text.
    start = prompt.rfind('\n{"user_request":')
    if start < 0:
        raise RuntimeError('Scripted browser fixture accepts only Agent Harness prompts')
    data = json.loads(prompt[start + 1:])
    request, context, outputs = data['user_request'], data['context'], data['tool_results']
    successful = {item['name']: item['result'] for item in outputs if item.get('ok', True) and 'result' in item}
    screen = context['screen']
    if '[E2E_NOTES]' in request:
        return decision() if 'ui.switch_tab' in successful else decision('ui.switch_tab', {'tab': 'notes'})
    undo = re.search(r'\[E2E_UNDO:([a-f0-9-]{36})\]', request)
    if undo:
        return decision(message='Đã xác minh hoàn tác buffer. Code chưa tự động được lưu.') if 'editor.undo_patch' in successful else decision('editor.undo_patch', {'exercise_id': screen['exercise_id'], 'base_revision': screen['editor']['revision'], 'patch_id': undo[1]})
    if '[E2E_CODE]' not in request:
        return decision(message='Đây là fixture planner xác định, chỉ dùng cho kịch bản E2E đã ghi nhãn; không đánh giá chất lượng model thật.')
    if 'editor.get_state' not in successful:
        return decision('editor.get_state')
    if 'editor.read_file' not in successful:
        state = successful['editor.get_state']
        files = state.get('files') or []
        main = next((file for file in files if file.get('is_main')), files[0] if files else None)
        if not main:
            return decision(message='NOT VERIFIED: editor chưa có file có thể đọc.')
        return decision('editor.read_file', {'file_id': main.get('id') or main['file_id']})
    read = successful['editor.read_file']
    expected = os.getenv('AGENT_BROWSER_EXPECTED_TEXT', 'print(0)')
    replacement = os.getenv('AGENT_BROWSER_REPLACEMENT_TEXT', 'print(42)')
    offset = read.get('content', '').find(expected)
    if offset < 0:
        return decision(message='NOT VERIFIED: buffer không chứa đoạn fixture cần sửa.')
    args = {'exercise_id': screen['exercise_id'], 'base_revision': read['revision'],
        'patches': [{'file_id': read['file_id'], 'start': offset, 'end': offset + len(expected), 'expected_text': expected, 'replacement': replacement}]}
    if 'editor.propose_patch' not in successful:
        return decision('editor.propose_patch', args)
    if 'editor.apply_patch' not in successful:
        return decision('editor.apply_patch', args)
    if 'code.run_sample_tests' not in successful:
        return decision('code.run_sample_tests')
    result = successful['code.run_sample_tests']
    return decision(message=f"Đã áp dụng bản sửa có xác nhận và nhận kết quả test thật: {result.get('passed')}/{result.get('total')}. Chỉ test mẫu; code chưa tự động được lưu.")

LLMService.call_model = scripted_model

@app.get('/api/v1/agent-browser-fixture', include_in_schema=False)
async def browser_fixture_identity():
    return {'fixture': 'agent_harness_scripted_planner', 'isolated_database': True,
            'tool_outputs': 'real', 'planner': 'scripted'}
