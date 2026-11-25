"""The assistant is open by default; only money/purchase/unlock/progress writes are refused."""
import pytest
from fastapi import HTTPException

from app.agent.policy import deny_reason, enforce, money_path, sensitive_label


@pytest.mark.parametrize('label', [
    'Mua ngay', 'Thanh toán', 'Nạp coin', 'Nhận thưởng', 'Mở khóa', 'Đăng ký học',
    'Hoàn thành bài', 'Nộp bài', 'Đổi Coin', 'Quy đổi', 'Checkout', 'Rút tiền', 'Mật khẩu',
])
def test_sensitive_controls_are_refused(label):
    assert sensitive_label(label)
    with pytest.raises(HTTPException) as error:
        enforce('mcp.browser_click', {'target_name': label}, current_path='/courses/x')
    assert error.value.status_code == 403


@pytest.mark.parametrize('label', [
    'Khám phá khóa học', 'Xem chi tiết', 'Học tiếp', 'Lưu ghi chú', 'Mùa hè', 'Rút gọn', 'Bài tiếp theo', 'Tab Tổng quan',
])
def test_normal_controls_stay_open(label):
    assert deny_reason('mcp.browser_click', {'target_name': label}, current_path='/courses/x') is None


def test_money_pages_refuse_clicks_but_allow_navigation_and_reading():
    assert money_path('/wallets?tab=1') and money_path('/shop') and not money_path('/courses/abc')
    assert deny_reason('mcp.browser_click', {'target_name': 'OK'}, current_path='/wallets')
    assert deny_reason('mcp.browser_fill', {'target_name': 'Số tiền', 'value': '999'}, current_path='/wallets')
    assert deny_reason('mcp.browser_snapshot', {}, current_path='/wallets') is None
    assert deny_reason('mcp.browser_navigate', {'path': '/wallets'}, current_path='/') is None
    assert deny_reason('mcp.browser_highlight', {'target_name': 'Nạp coin'}, current_path='/wallets') is None


def test_progress_tool_and_forbidden_navigation_are_blocked():
    assert deny_reason('learning.complete_lesson', {})
    assert deny_reason('mcp.browser_navigate', {'path': '/checkout/1'})
    assert deny_reason('mcp.browser_navigate', {'path': '/admin'})


@pytest.mark.parametrize('name', ['web_search', 'catalog.search_courses', 'video.seek', 'ui.open_panel', 'mcp.browser_scroll'])
def test_everything_else_is_allowed(name):
    assert deny_reason(name, {}, current_path='/courses/x') is None


def test_real_control_from_snapshot_overrides_a_disguised_target_name():
    resolved = {'name': 'Mua ngay', 'href': '/wallets'}
    assert deny_reason('mcp.browser_click', {'target_name': 'Xem chi tiết'}, current_path='/courses/x', resolved=resolved)
    assert deny_reason('mcp.browser_click', {'target_name': 'Xem'}, current_path='/courses/x', resolved={'name': 'Xem', 'href': '/shop'})
    assert deny_reason('mcp.browser_click', {'target_name': 'Xem'}, current_path='/courses/x', resolved={'name': 'Xem', 'href': '/courses/y'}) is None


@pytest.mark.parametrize('label', ['Xóa tài khoản', 'Đăng xuất', 'Ngắt liên kết GitHub', 'Delete'])
def test_destructive_account_controls_are_refused(label):
    assert sensitive_label(label)


def test_identical_verified_action_is_not_repeated_forever():
    from app.agent.turn_engine import TurnToolRuntime
    engine = TurnToolRuntime()
    args = {'seconds': 60.0}
    for _ in range(2):
        assert engine.check_pre_refusal('video.seek', args, 'navigation') is None
        engine.record_outcome('video.seek', args, 'navigation', {'verified': True})
    assert engine.check_pre_refusal('video.seek', args, 'navigation')
    assert engine.check_pre_refusal('video.seek', {'seconds': 90.0}, 'navigation') is None
    for _ in range(5):
        engine.record_outcome('mcp.browser_scroll', {'direction': 'down'}, 'navigation', {'verified': True})
    assert engine.check_pre_refusal('mcp.browser_scroll', {'direction': 'down'}, 'navigation') is None


def test_guarded_pages_allow_only_safe_buttons_but_all_links():
    page = '/course/abc'
    assert deny_reason('mcp.browser_click', {'target_name': 'Xem thêm'}, current_path=page, resolved={'role': 'button', 'name': 'Xem thêm'}) is None
    assert deny_reason('mcp.browser_click', {'target_name': 'Bắt đầu học'}, current_path=page, resolved={'role': 'button', 'name': 'Bắt đầu học'})
    assert deny_reason('mcp.browser_click', {'target_name': 'Học thử'}, current_path=page, resolved={'role': 'button', 'name': 'Học thử miễn phí'})
    assert deny_reason('mcp.browser_click', {'target_name': 'Khóa liên quan'}, current_path=page, resolved={'role': 'a', 'name': 'Khóa liên quan', 'href': '/course/x'}) is None
    assert deny_reason('mcp.browser_click', {'target_name': 'Mục'}, current_path='/profile', resolved={'role': 'button', 'name': 'Chỉnh sửa'}) is None
    assert deny_reason('mcp.browser_fill', {'target_name': 'Mã giảm giá', 'value': 'FREE'}, current_path=page, resolved={'role': 'input', 'name': 'Mã giảm giá'})
    assert deny_reason('mcp.browser_fill', {'target_name': 'Tìm bài học', 'value': 'từ láy'}, current_path='/learning/x', resolved={'role': 'input', 'name': 'Tìm nhanh'}) is None


def test_generic_api_gateway_is_open_except_sensitive_writes():
    from app.agent.policy import deny_api
    assert deny_api('GET', '/api/v1/wallets') is None  # reading is fine
    assert deny_api('POST', '/api/v1/learning/abc/notes') is None
    assert deny_api('PUT', '/api/v1/profile/me') is None
    assert deny_api('POST', '/api/v1/wallets/topup')
    assert deny_api('POST', '/api/v1/purchases/courses')
    assert deny_api('POST', '/api/v1/learning/abc/complete')
    assert deny_api('POST', '/api/v1/gamification/checkin')
    assert deny_api('POST', '/api/v1/courses/abc/enroll')
    assert deny_api('GET', '/api/v1/agent/runs') and deny_api('GET', '/api/v1/admin/users') and deny_api('POST', '/api/v1/auth/login')
    assert deny_api('TRACE', '/api/v1/x')


def test_api_gateway_paths_cannot_traverse():
    import pytest
    from fastapi import HTTPException
    from app.agent.api_gateway import _clean_path
    assert _clean_path('/api/v1/learning/x/notes') == '/learning/x/notes'
    for bad in ['/../admin', '/a/%2e%2e/b', 'learning', '//evil', '/a b']:
        with pytest.raises(HTTPException):
            _clean_path(bad)


def test_api_tools_exist_everywhere_and_search_reads_live_openapi():
    from types import SimpleNamespace
    from app.agent.tools import REGISTRY, available
    assert 'api.call' in available(SimpleNamespace(capabilities=[], lesson_id=None))
    from app.agent.api_gateway import search_operations
    rows = search_operations('lesson notes')
    assert any('note' in row['path'] for row in rows)
    assert not any('/admin' in row['path'] or '/agent' in row['path'] for row in rows)


def test_payout_and_identity_fields_are_refused_in_any_write_body():
    from app.agent.policy import deny_api
    safe = {'content': 'ghi chú', 'time_seconds': 3}
    assert deny_api('POST', '/api/v1/learning/lesson_note/x/create', safe) is None
    assert deny_api('PUT', '/api/v1/profile/me', {'bio': 'hi', 'fullname': 'A'}) is None
    for body in [{'paypal_email': 'a@b.c'}, {'paypal_payer_id': 'X'}, {'profile': {'bank_account': '1'}},
                 {'items': [{'price': 0}]}, {'email': 'new@x.y'}, {'password': 'p'}, {'role': 'ADMIN'}]:
        assert deny_api('PUT', '/api/v1/profile/me', body), body
    assert deny_api('GET', '/api/v1/profile/me', {'paypal_email': 'x'}) is None
