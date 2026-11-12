from pathlib import Path

import pytest

from scripts.import_provider_directory import classify, parse_schools


def test_directory_preserves_school_identity_and_34_province_coverage():
    source = (
        Path(__file__).resolve().parents[3] / "data/providers/schools-2026-source.csv"
    )
    items, excluded = parse_schools(source.read_text(), "2026-11-12T00:00:00+00:00")
    assert len({row["province_code"] for row in items}) == 34
    assert len(items) > 3000
    assert len({row["source_key"] for row in items}) == len(items)
    assert any(row["name"] == "THPT chuyên Đại học Sư phạm" for row in items)
    assert any(
        row["name"] == "THPT Phan Đình Phùng" and row["province_code"] == "01"
        for row in items
    )
    assert any(row["reason"] == "historical_or_requires_review" for row in excluded)
    assert not any("trước" in row["name"].casefold() for row in items)


@pytest.mark.parametrize(
    "name,expected",
    [
        ("THPT chuyên Đại học Sư phạm", "school"),
        ("THPT Chu Văn An (trước 01/2025)", "historical_or_requires_review"),
        ("Học ở nước ngoài", "placeholder"),
        ("Trung tâm GDNN-GDTX", "outside_school_scope"),
        ("Trường THPT - Khu vực 2", "placeholder"),
    ],
)
def test_directory_excludes_old_names_and_non_school_exam_codes(name, expected):
    assert classify(name) == expected
