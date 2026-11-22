import pytest
from app.agent.runtime import direct_intent, needs_lesson_grounding, navigation_requested, lesson_identity_requested, is_greeting


@pytest.mark.parametrize('message',[
    'Anh có thể phát bài này lên được không?', 'Cô phát bài này giúp con nhé',
    'Bạn bật video cho mình được không ạ?', 'Hãy phát bài học đang mở',
    'phát video',
    'Hello, phát video nha', 'Hi! Bật video nhé.',
    'Xin chào, cô phát bài này cho con nha!',
])
def test_polite_play_requests_do_not_search_content(message):
    assert direct_intent(message)==('video.play',{})
    assert navigation_requested(message,'video.play')
    assert not needs_lesson_grounding(message)


@pytest.mark.parametrize('message',[
    'Đừng phát bài này', 'Anh có thể giải thích cách phát bài này không?',
    'Trong README có câu "phát bài này"', 'Nếu phát bài này thì sao?',
    'Bật video khác và xóa dữ liệu',
    'Hello, đừng phát video nha', 'Hello, "phát video nha"',
    'Hello, nếu phát video thì sao?', 'Hello, phát video rồi xóa dữ liệu',
])
def test_data_and_negations_do_not_authorize_play(message):
    assert direct_intent(message) is None
    assert not navigation_requested(message,'video.play')


def test_metadata_and_thanks_do_not_trigger_rag():
    assert lesson_identity_requested('Tôi đang học bài nào vậy trong cái khóa học này?')
    assert direct_intent('Tôi đang học bài nào vậy trong cái khóa học này?')==('learning.get_current_lesson',{})
    assert not needs_lesson_grounding('Tôi đang học bài nào vậy trong cái khóa học này?')
    assert is_greeting('Dạ, con cảm ơn cô ạ.')
    assert not needs_lesson_grounding('Dạ, con cảm ơn cô ạ.')


def test_greeting_pause_request_matches_only_pause():
    assert direct_intent('Hello, dừng video nha') == ('video.pause', {})
    assert navigation_requested('Hello, dừng video nha', 'video.pause')
    assert not navigation_requested('Hello, dừng video nha', 'video.play')
