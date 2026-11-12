import copy
import json

import pytest

from scripts.collect_vtv7_more_courses import playlist_lessons
from scripts.import_vtv7_courses import DATA, validate


def course():
    return copy.deepcopy(json.loads((DATA / "vtv7-courses.json").read_text())[0])


def test_source_has_complete_unique_verified_lesson_sequence():
    for record in json.loads((DATA / "vtv7-courses.json").read_text()):
        assert len(validate(record)) == record["expected_last_lesson"]


@pytest.mark.parametrize(
    "change", ["missing", "duplicate", "foreign_channel", "duration", "unverified"]
)
def test_import_rejects_incomplete_or_forged_source(change):
    record = course()
    if change == "missing":
        record["lessons"].pop()
    elif change == "duplicate":
        record["lessons"][1]["video_id"] = record["lessons"][0]["video_id"]
    elif change == "foreign_channel":
        record["lessons"][0]["channel_url"] = "https://www.youtube.com/@unverified"
    elif change == "duration":
        record["lessons"][0]["duration_seconds"] = 0
    else:
        record["eligible"] = False
    with pytest.raises(ValueError):
        validate(record)


@pytest.mark.parametrize("subject", ["tin-hoc", "tin-hoc-cong-nghe", "tieng-anh"])
def test_excluded_subjects_are_rejected(subject):
    record = course()
    record["subject"] = subject
    with pytest.raises(ValueError, match="excluded"):
        validate(record)


def playlist(titles):
    return {
        "header": {
            "playlistHeaderRenderer": {
                "numVideosText": {"simpleText": f"{len(titles)} video"}
            }
        },
        "contents": [
            {
                "playlistVideoRenderer": {
                    "videoId": f"video{i}",
                    "title": {"runs": [{"text": title}]},
                }
            }
            for i, title in enumerate(titles)
        ],
    }


def test_numbered_playlist_orders_episodes_instead_of_source_sort():
    lessons, count = playlist_lessons(playlist(["Bài 2: Hai", "Bài 1: Một"]), 2)
    assert count == 2
    assert [x["number"] for x in lessons] == [1, 2]
    assert [x["source_position"] for x in lessons] == [2, 1]


def test_topic_playlist_retains_official_order():
    lessons, _ = playlist_lessons(playlist(["Chủ đề hai", "Chủ đề một"]), None)
    assert [x["title"] for x in lessons] == ["Chủ đề hai", "Chủ đề một"]


def test_playlist_rejects_missing_advertised_video():
    data = playlist(["Bài 1", "Bài 2"])
    data["contents"].pop()
    with pytest.raises(ValueError, match="Incomplete"):
        playlist_lessons(data, 2)


def test_playlist_rejects_gaps_and_duplicate_episodes():
    for titles in [["Bài 1", "Bài 3"], ["Bài 1", "Bài 1"]]:
        with pytest.raises(ValueError, match="missing/duplicate"):
            playlist_lessons(playlist(titles), 2)
