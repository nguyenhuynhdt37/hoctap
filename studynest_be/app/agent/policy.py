"""Single choke point for what the assistant may never do.

Everything else (reading, answering, navigating, pointing, clicking, searching)
is open. Only writes that move money, buy/enroll, unlock content or change
learning progress are refused, because a prompt-injected or malicious request
("buy this course for free", "top up unlimited coins") must not succeed.
The browser enforces the same rules on the real DOM; this module is the
server-side authority that the model cannot talk its way around.
"""
import re
import unicodedata
from fastapi import HTTPException

# Tools that write money / purchase / unlock / progress state. Refused outright.
BLOCKED_TOOLS = {
    'learning.complete_lesson',
}

# Label of a UI control that spends/earns money, buys, enrolls, unlocks or
# changes progress. Matched on a normalized (accent-folded, lower-cased) label.
SENSITIVE_LABEL = re.compile(
    r'thanh toan|mua (?:ngay|khoa|combo|goi|hang|them|lo trinh|bundle)|nap (?:coin|tien|xu|them|ngay)|rut (?:tien|coin|xu)|'
    r'doi (?:coin|xu|qua|thuong|diem|voucher)|quy doi|chuyen (?:coin|tien|xu)|\btang (?:coin|xu|qua|khoa)|'
    r'dang ky (?:hoc|khoa|ngay|mien phi)|ghi danh|vao hoc ngay|nhan (?:thuong|qua|coin|xu)|diem danh|'
    r'mo khoa|unlock|claim|redeem|enroll|checkout|payment|purchase|\bbuy\b|\bpay\b|top.?up|withdraw|transfer|gift|subscribe|'
    r'nang cap|gia han|hoan tien|refund|ap dung ma|coupon|'
    r'hoan thanh bai|danh dau (?:da )?hoan thanh|hoan thanh khoa|nop bai|nop quiz|nop code|\bsubmit\b|'
    r'\bxoa\b|delete|remove|dang xuat|log.?out|ngat lien ket|disconnect|oauth|'
    r'mat khau|password|\btoken\b|api.?key|secret|\bcvv\b|\botp\b|the tin dung|credit card'
)

# Pages whose controls handle money. Clicking buttons/filling fields there is refused;
# plain links (navigation) stay open.
MONEY_PATH = re.compile(r'^/(?:wallets?|coins?|shop|gifts|vouchers|refunds|checkout|payment|combo/(?:don-hang|orders|thanh-toan)|lecturer/(?:wallet|withdraw))(?:/|$)')

# Pages that hold buy / enroll / unlock / complete-lesson buttons. There, plain buttons (not links) are
# an allowlist: only view/toggle/navigation-style controls are clicked, whatever the model says they are.
GUARDED_PATH = re.compile(r'^/(?:course|combo|learning-paths|lo-trinh|learning)(?:/|$)')
SAFE_BUTTON = re.compile(
    r'^(?:xem|mo|dong|thu gon|mo rong|tiep|truoc|sau|tim|loc|sap xep|chia se|phat|dung|tam dung|toc do|toan man hinh|'
    r'bai tiep|bai truoc|muc luc|ghi chu|tong quan|cong cu|bai giang|hien|an|chi tiet|doc them|quay lai|tro lai|'
    r'yeu thich|hoi may|tai them|thu lai|tab|chuong|danh sach|noi dung|tai lieu|binh luan|danh gia|cuon)\b')
SAFE_FIELD = re.compile(r'tim|search|ghi chu|note|binh luan|comment|tin nhan|message|hoi')

# Where the assistant never navigates the browser itself.
FORBIDDEN_NAV = re.compile(r'^/(?:admin|login|register|auth|checkout|payment)(?:/|$)')

REFUSAL = ('Thao tác này liên quan đến tiền, mua/đăng ký khóa học, mở khóa hoặc tiến độ học nên Mây Mây không tự thực hiện. '
           'Mình có thể mở đúng trang và chỉ chỗ cần bấm để bạn tự xác nhận.')


def fold(text):
    text = unicodedata.normalize('NFD', (text or '').casefold().replace('đ', 'd'))
    return re.sub(r'\s+', ' ', ''.join(c for c in text if unicodedata.category(c) != 'Mn')).strip()


def sensitive_label(label):
    return bool(SENSITIVE_LABEL.search(fold(label)))


def money_path(path):
    return bool(MONEY_PATH.match((path or '').split('?', 1)[0]))


def deny_reason(name, arguments, *, current_path=None, resolved=None):
    """Return a refusal message for a sensitive tool call, or None when allowed.

    `resolved` is the real control ({name, href}) looked up from the snapshot the
    client actually returned, so a model-supplied target_name cannot disguise it.
    """
    if name in BLOCKED_TOOLS:
        return REFUSAL
    if name in {'mcp.browser_click', 'mcp.browser_fill'}:
        if sensitive_label(arguments.get('target_name', '')):
            return REFUSAL
        if resolved and (sensitive_label(resolved.get('name', '')) or money_path(resolved.get('href', ''))):
            return REFUSAL
        if GUARDED_PATH.match((current_path or '').split('?', 1)[0]) and resolved is not None:
            role = (resolved.get('role') or '').lower()
            label = fold(resolved.get('name', ''))
            if name == 'mcp.browser_click' and role in {'button', 'input'} and not SAFE_BUTTON.match(label):
                return REFUSAL
            if name == 'mcp.browser_fill' and not SAFE_FIELD.search(label):
                return REFUSAL
        if money_path(current_path or ''):
            return REFUSAL
        if name == 'mcp.browser_fill' and sensitive_label(str(arguments.get('value', ''))[:80]) and money_path(current_path or ''):
            return REFUSAL
    if name == 'mcp.browser_navigate' and FORBIDDEN_NAV.match(arguments.get('path', '')):
        return 'Mây Mây không tự điều hướng tới trang thanh toán, đăng nhập hoặc quản trị.'
    return None


def enforce(name, arguments, *, current_path=None, resolved=None):
    reason = deny_reason(name, arguments, current_path=current_path, resolved=resolved)
    if reason:
        raise HTTPException(403, reason)


# ---- Generic API gateway (api.call) -----------------------------------------------------------------
# Never reachable by the assistant, any method: the assistant itself, auth/session secrets, admin area.
HIDDEN_API = re.compile(r'/(?:agent|auth|admin)(?:/|$)|token|password|secret|oauth|dpop|/sessions?(?:/|$)')
# Writes touching money, purchase/enroll, rewards, unlock or learning progress. Reads stay open.
SENSITIVE_WRITE_API = re.compile(
    r'wallet|\bcoins?\b|payment|paypal|purchase|\border|checkout|enroll|refund|withdraw|payout|\bearnings?\b|transfer|\bgift|'
    r'voucher|coupon|discount|reward|check-?in|mission|streak|\bxp\b|inventory|\bshop|\bbundle|\bcombo|learning-paths?|lo-trinh|'
    r'\bcomplete|\bprogress|\bquiz|\battempt|\bsubmit|unlock|subscri|\bpric|balance|\bbank|invoice|billing|mastery|'
    r'leaderboard|\bban(?:ned)?\b|\brole|permission|delete-account|deactivate')
# Body keys that move money or take over an account, wherever the route lives (e.g. a profile update
# carrying a payout destination). Matched on every key, at any depth, of a write body.
SENSITIVE_BODY_KEY = re.compile(
    r'paypal|payer|payout|bank|iban|swift|routing|account_?number|card|cvv|price|amount|balance|coin|wallet|'
    r'currency|password|token|secret|otp|email|phone|role|permission|is_?admin|is_?banned|verified')
API_METHODS = {'GET', 'POST', 'PUT', 'PATCH', 'DELETE'}


def api_hidden(path):
    return bool(HIDDEN_API.search(fold(path)))


def _sensitive_body(value, depth=0):
    if depth > 6:
        return True
    if isinstance(value, dict):
        return any(SENSITIVE_BODY_KEY.search(fold(str(key))) or _sensitive_body(item, depth + 1) for key, item in value.items())
    if isinstance(value, list):
        return any(_sensitive_body(item, depth + 1) for item in value[:200])
    return False


def deny_api(method, path, body=None):
    """Refusal for an API call the assistant must not make, else None."""
    method = (method or '').upper()
    if method not in API_METHODS:
        return 'Phương thức không được hỗ trợ'
    if api_hidden(path):
        return 'Mây Mây không truy cập khu vực này của hệ thống.'
    if method != 'GET' and SENSITIVE_WRITE_API.search(fold(path)):
        return REFUSAL
    if method != 'GET' and _sensitive_body(body):
        return REFUSAL
    return None


def enforce_api(method, path, body=None):
    reason = deny_api(method, path, body)
    if reason:
        raise HTTPException(403, reason)
