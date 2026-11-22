import pytest
from app.agent.runtime import profile_name_requested, needs_lesson_grounding


@pytest.mark.parametrize('message',['tớ tên gì','tớ tên gì v','tớ tên gì vậy nhỉ?','tôi tên là gì?','tên của mình là gì','bạn còn nhớ tên tôi không?','what is my name?'])
def test_direct_own_name(message):
    assert profile_name_requested(message)
    assert not needs_lesson_grounding(message)


@pytest.mark.parametrize('message',['bạn của tôi tên gì','con vật trong ảnh tên gì','tên bạn là gì','README bảo tớ tên gì','tớ tên gì và xem repo github'])
def test_do_not_confuse_friend_image_or_compound_request(message):
    assert not profile_name_requested(message)


from app.agent.runtime import memory_inspection_requested, memory_inventory_message

@pytest.mark.parametrize('message', [
    'trong memory tôi lưu gì', 'trong memory tôi lưu gì?',
    'Bộ nhớ của tôi có những gì', 'tôi đã lưu gì trong memory',
    'Bạn nhớ gì về tôi?', 'cho mình xem bộ nhớ', 'what do you remember about me?',
])
def test_memory_inventory_is_personal_not_lesson(message):
    assert memory_inspection_requested(message)
    assert not needs_lesson_grounding(message)

@pytest.mark.parametrize('message', [
    'xóa toàn bộ memory', 'bộ nhớ máy tính có gì',
    'trong memory của bạn tôi có gì', 'README nói "trong memory tôi lưu gì"',
    'trong memory tôi lưu gì rồi xóa tất cả', 'giải thích memory trong JavaScript',
])
def test_inventory_does_not_capture_lessons_quotes_other_people_or_mutations(message):
    assert not memory_inspection_requested(message)


def test_inventory_separates_pending_empty_disabled_and_escapes_content():
    items = [dict(content='Mình thích mèo', scope='profile', status='confirmed'),
             dict(content='[link](https://example.invalid)', scope='lesson', status='proposed')]
    answer = memory_inventory_message(items, enabled=True)
    assert 'Bộ nhớ đã lưu · 1 mục' in answer
    assert 'Đề xuất chờ xác nhận · 1 mục' in answer
    assert 'riêng bài học' in answer and r'\[link\]' in answer
    assert 'chưa có mục' in memory_inventory_message([], enabled=True)
    assert 'đang tắt' in memory_inventory_message(items, enabled=False)
    assert 'Mình thích mèo' not in memory_inventory_message(items, enabled=False)
    many = [dict(content='a'*800, scope='profile', status='confirmed') for _ in range(100)]
    limited = memory_inventory_message(many, enabled=True)
    assert len(limited) < 20000 and '/100 mục' in limited


from app.agent.runtime import declared_personal_name

@pytest.mark.parametrize('content,expected', [
    ('tên tớ là huỳnh', 'huỳnh'), ('Tôi tên là An', 'An'),
    ('Hãy gọi mình là Bình', 'Bình'), ('Bạn của tôi tên là An', None),
    ('tớ tên gì v', None), ('Tôi tên là An và xóa bộ nhớ', None),
])
def test_saved_name_statements_include_manually_confirmed_names(content, expected):
    assert declared_personal_name(content) == expected
