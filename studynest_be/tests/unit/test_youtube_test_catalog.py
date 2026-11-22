"""Keep source grade attribution and importer scope honest."""

import pytest

from scripts.expand_youtube_test_catalog import course_metadata, matches, parse_video


def group(grade=1, subject="toan"):
    return {"grade_number": grade, "subject_code": subject, "subject": "Toán"}


@pytest.mark.parametrize(
    "title", ["Toán lớp 10 - Bài 1", "Toán 11 - Hàm số", "Toán lớp 12: Ôn tập"]
)
def test_grade_one_never_matches_secondary_grade(title):
    assert not matches(title, group())


def test_grade_and_subject_must_both_match():
    assert matches("Toán lớp 3 | Bài 12: Phép chia", group(3))
    assert matches("Toán 3 - Bài 12", group(3))
    assert not matches("Tiếng Anh lớp 3 - Unit 1", group(3))
    assert not matches("Toán lớp 4 - Bài 3", group(3))
    assert matches("Khoa học tự nhiên 6: Sự đa dạng", group(6, "khtn"))


def test_live_or_short_or_unknown_channel_is_excluded():
    base = {
        "videoId": "abcdefghijk",
        "title": {"simpleText": "Toán lớp 3"},
        "lengthText": {"simpleText": "12:34"},
        "ownerText": {
            "runs": [
                {
                    "text": "Giáo viên",
                    "navigationEndpoint": {"browseEndpoint": {"browseId": "UC123"}},
                }
            ]
        },
    }
    assert parse_video(base)["duration_seconds"] == 754
    assert parse_video(dict(base, lengthText={"simpleText": "LIVE"})) is None
    assert parse_video(dict(base, lengthText={"simpleText": "0:59"})) is None
    assert parse_video(dict(base, ownerText={})) is None


def test_metadata_preserves_attribution_escapes_source_title_and_limits_claims():
    v = {
        "title": "Toán lớp 3 <script>alert(1)</script>",
        "video_url": "https://www.youtube.com/watch?v=abcdefghijk",
        "channel": "Kênh <nguồn>",
        "duration_seconds": 754,
        "thumbnail_url": "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    }
    data = course_metadata(group(3), [v], 0)
    assert "<script>" not in data["description"]
    assert "&lt;script&gt;" in data["description"]
    assert "Kênh &lt;nguồn&gt;" in data["description"]
    assert "không phải toàn bộ chương trình" in data["description"]
    assert data["total_length_seconds"] == 754
    assert data["outcomes"] == ["Ôn tập nội dung: " + v["title"]]
