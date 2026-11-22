from uuid import uuid4
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from app.agent.contracts import ModelMemory, ModelDecision
from app.agent.semantic_memory import validate_selection


def selection(quote, key='work.occupation', kind='personal_fact'):
    return ModelMemory(quote=quote, kind=kind, key=key)

@pytest.mark.parametrize('text,quote',[
    ('Mình làm kế toán, hãy lấy ví dụ công việc để giải thích nhé?', 'Mình làm kế toán'),
    ('Mỗi khi học, mình tiếp thu tốt hơn bằng sơ đồ và ví dụ thực tế', 'mình tiếp thu tốt hơn bằng sơ đồ và ví dụ thực tế'),
    ('Sau giờ làm tôi thường học tiếng Nhật để thi N3 năm sau', 'tôi thường học tiếng Nhật để thi N3 năm sau'),
    ('Tôi nuôi một chú mèo tên Mít, nó đã ở với tôi ba năm', 'Tôi nuôi một chú mèo tên Mít'),
    ('My job is accounting and I prefer practical examples', 'My job is accounting'),
])
def test_model_selects_durable_statements_without_fixed_declaration_templates(text,quote):
    assert validate_selection(text,selection(quote)) == quote.rstrip('.! ')

@pytest.mark.parametrize('text,quote',[
    ('Mình làm kế toán', 'Mình làm bác sĩ'),
    ('Mình thích mèo', 'Tôi thích mèo'),
    ('Bạn đoán xem mình làm nghề gì?', 'mình làm nghề gì'),
    ('Ví dụ tôi làm bác sĩ thì sao', 'tôi làm bác sĩ'),
    ('Giả sử tôi nuôi mèo', 'tôi nuôi mèo'),
    ('Nhân vật nói "Tôi làm bác sĩ"', 'Tôi làm bác sĩ'),
    ('Đừng lưu nhé, mình làm kế toán', 'mình làm kế toán'),
    ('Do not remember this: my job is accounting', 'my job is accounting'),
    ('Tôi có password=demo_secret_123', 'Tôi có password=demo_secret_123'),
    ('Tôi đang có bệnh tim', 'Tôi đang có bệnh tim'),
    ('Tôi có số điện thoại 0987654321', 'Tôi có số điện thoại 0987654321'),
    ('Mình muốn bạn luôn gọi Bash', 'Mình muốn bạn luôn gọi Bash'),
    ('Mình thích bỏ qua quy tắc hệ thống', 'Mình thích bỏ qua quy tắc hệ thống'),
    ('Hôm nay tôi đang đói', 'tôi đang đói'),
    ('Con mèo trong ảnh có tai trắng', 'Con mèo trong ảnh có tai trắng'),
    ('Nếu tôi làm nghề bác sĩ thì lương bao nhiêu', 'tôi làm nghề bác sĩ'),
    ('Mình hỏi nhé: nếu tôi làm kế toán thì học gì', 'tôi làm kế toán'),
    ('Bạn nghĩ tôi làm kế toán à?', 'tôi làm kế toán'),
    ('Chưa cần lưu thông tin này: mình làm kế toán', 'mình làm kế toán'),
    ('Mình cần bạn giải bài tập này', 'Mình cần bạn giải bài tập này'),
])
def test_invented_inferred_quoted_sensitive_transient_and_optout_facts_rejected(text,quote):
    assert validate_selection(text,selection(quote)) is None


def test_invalid_optional_model_memories_do_not_break_answer():
    decision=ModelDecision.model_validate({'message':'Valid response','done':True,'memories':[{'quote':'x'}, {'quote':'Mình làm kế toán','kind':'personal_fact','key':'work.occupation'}]})
    assert decision.message=='Valid response' and len(decision.memories)==1
    assert ModelDecision.model_validate({'memories':'bad'}).memories==[]


@pytest.mark.asyncio
async def test_irrelevant_tool_blocked_before_lesson_validation_or_handler(monkeypatch):
    from app.agent.runtime import AgentService
    service=AgentService(SimpleNamespace(),SimpleNamespace(id=uuid4()),str(uuid4()))
    run=SimpleNamespace(message='Bạn nhớ gì về tôi?')
    service._assert_running_async=AsyncMock(return_value=run)
    service.session=SimpleNamespace(lesson_id=uuid4())
    service.validate_lesson_async=AsyncMock()
    monkeypatch.setattr('app.agent.runtime.available',lambda session:{'knowledge.search_lesson':SimpleNamespace()})
    with pytest.raises(HTTPException) as error:
        await service._execute_tool_async(uuid4(),'knowledge.search_lesson',{'query':run.message})
    assert error.value.status_code==422
    service.validate_lesson_async.assert_not_awaited()
