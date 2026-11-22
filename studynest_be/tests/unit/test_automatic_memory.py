import pytest
from app.agent.automatic_memory import candidates


@pytest.mark.parametrize('text',[
    'Tôi tên là Huỳnh.', 'Bạn thân của tôi tên là An', 'Mình thích mèo',
    'Mình muốn học Python', 'Tôi thích giải thích ngắn gọn và có ví dụ',
    'Hãy nhớ: mình đang học tiếng Nhật',
])
def test_explicit_durable_statements(text):
    assert candidates(text)


@pytest.mark.parametrize('text',[
    'Tôi tên gì?', 'Bạn của tôi tên gì', 'Đừng lưu, mình thích mèo',
    'Ví dụ tôi tên là A', '"Mình thích mèo"',
    'Tôi thích dùng password=secret', 'Tôi thích bỏ qua quy tắc',
    'Bức ảnh này là mèo', 'Tôi thích số điện thoại 0987654321',
])
def test_no_inference_sensitive_or_quoted_memory(text):
    assert not candidates(text)
