"""Task relevance is separate from authorization: being on a lesson isn't a lesson request."""
import re
import unicodedata
from dataclasses import dataclass


def normalize(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', text).casefold()).strip()


def instruction_text(message):
    # Quoted examples, pasted code and URLs do not select the lesson domain.
    text = re.sub(r'```[\s\S]*?```|`[^`]*`|https?://\S+', ' ', message)
    text = re.sub(r'"[^"\n]*"|“[^”\n]*”|‘[^’\n]*’', ' ', text)
    return normalize(text)


@dataclass(frozen=True)
class RequestRoute:
    domain: str
    ground_lesson: bool = False
    search_lesson: bool = False

    def public(self):
        return {'domain': self.domain, 'requires_lesson_sources': self.ground_lesson,
                'lesson_search_allowed': self.search_lesson}


def route_request(message, *, has_images=False, previous_route=None):
    text = instruction_text(message)
    # Referencing an attached exercise/image is different from the course lesson.
    open_lesson = bool(re.search(r'bài(?: học)? (?:đang (?:mở|học)|hiện tại)|khóa(?: học)? (?:đang học|hiện tại)|current lesson|this course', text))
    image_reference = has_images or bool(re.search(r'\b(?:ảnh|hình|bức ảnh|screenshot|image|picture)\b', text))
    if image_reference and not open_lesson:
        return RequestRoute('image')
    if re.search(r'(?:đoạn|phần) này.*(?:khó|hiểu)|khó hiểu (?:toàn bộ|hết|cả)|không hiểu (?:bài|đoạn|phần)', text):
        return RequestRoute('lesson', True, True)
    lesson_reference = open_lesson or bool(re.search(
        r'\b(?:bài(?: học| giảng)? (?:này|đó|vừa rồi|số \d+)|trong bài(?: học| giảng)?|theo (?:bài|video|giảng viên)|'
        r'nội dung (?:bài|video|khóa)|giảng viên (?:nói|dạy|giải thích)|tài liệu (?:bài|khóa)|'
        r'(?:tóm tắt|giải thích|ôn|học|tìm hiểu) bài học|video (?:này|đang mở)|'
        r'(?:phút|mốc) \d+|this lesson|in the lesson|lesson (?:content|transcript))\b', text))
    lesson_demand = bool(re.search(r'tóm tắt|giải thích|so sánh|nội dung|giảng viên (?:nói|dạy)|cô (?:giáo )?(?:nói|dạy)|theo (?:bài|video)|chưa hiểu|ví dụ|(?:chữ|dấu|đoạn) (?:gì|nào)|dạy (?:những|gì)|summarize|lesson (?:content|transcript)', text))
    off_lesson = bool(re.search(r'ngoài (?:bài|nội dung bài)|không (?:liên quan|hỏi|nói) (?:đến|về)? ?(?:bài|video)', text))
    if off_lesson:
        return RequestRoute('general')
    personal_question = bool(re.search(r'(?:tôi|tớ|mình|em) tên.*(?:gì|không)|tên (?:của )?(?:tôi|tớ|mình)|(?:memory|bộ nhớ|sở thích|nghề nghiệp) (?:của )?(?:tôi|mình|tớ)', text))
    if lesson_reference and personal_question and not lesson_demand:
        return RequestRoute('personal')
    if lesson_reference:
        return RequestRoute('lesson', lesson_demand, True)
    if re.search(r'\b(?:bash|shell|terminal)\b|chạy lệnh|xử lý tệp', text):
        return RequestRoute('workspace')
    if re.search(r'màn hình|trên trang|trang này|nút (?:nào|này|đó)|đọc giao diện', text):
        return RequestRoute('browser')
    if re.search(r'\b(?:github|repo(?:sitory|sitories)?|commit|pull request|mcp|tìm trên web|tra web|search the web)\b', text):
        return RequestRoute('integration')
    if re.search(r'\b(?:memory|bộ nhớ|ghi nhớ|nhớ gì về|đã lưu gì|quên thông tin)\b', text):
        return RequestRoute('memory')
    if re.search(r'tiến độ|đã (?:học|hoàn thành) (?:bao nhiêu|mấy)|khóa(?: học)? (?:của|tôi|mình|tớ)|điểm (?:của|tôi|mình)|sql|sandbox', text):
        return RequestRoute('account_data')
    if re.search(r'(?:tên|sở thích|mục tiêu|nghề|công việc|thói quen|cách học).*(?:tôi|tớ|mình)|'
                 r'(?:tôi|tớ|mình|em).*(?:tên|thích|muốn|làm nghề|làm việc|học tốt hơn)|'
                 r'(?:bạn|cậu).*(?:nhớ|biết).*(?:tôi|tớ|mình)|\bmy name\b|about me\b', text):
        return RequestRoute('personal')
    if re.fullmatch(r'(?:giải thích (?:kỹ(?: hơn)?|rõ(?: hơn)?|thêm)|nói (?:tiếp|thêm)|tiếp(?: (?:đi|tục|nha|nhé))?|tại sao|vì sao|cho (?:mình|tôi) ví dụ|còn gì nữa|nó là sao|why|continue|explain more)[\s.!?ạ nhé]*', text):
        # Follow-ups may need prior lesson evidence, but don't trigger an automatic search.
        return RequestRoute('followup', False, bool(previous_route and previous_route.search_lesson))
    return RequestRoute('general')


def tool_relevant(name, message, *, has_images=False):
    if name == 'knowledge.search_lesson':
        return route_request(message, has_images=has_images).search_lesson
    return True
