"""Collect the next official VTV7 lesson batch for several existing instructors.

Only public metadata and embed links are collected. No media is downloaded.
Each course is assigned to an existing catalog instructor. That account curates
the course and is not the video author. English and computing stay excluded.
Numbered subject series must be complete. A numbered playlist that is only a
contiguous later range is titled with that range.
"""

import asyncio
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.collect_vtv7_courses import initial, number, walk
from scripts.collect_vtv7_more_courses import DATA, playlist_lessons, verify_video

# Existing catalog instructors. They curate embeds; they did not make the videos.
MINH_AN = "8f83ba28-6d02-5c47-bffd-3289dee591f9"
HA_LINH = "dabe0907-f1ec-534e-9d95-b1d04a1c6c28"
NGOC_MAI = "140e7fa1-02d4-5dcb-8df9-65d5baac06bb"
QUANG_HUY = "3653f07e-d6fc-5358-b045-c9b7030da801"
BAO_CHAU = "a5917dd1-69aa-5e13-b655-f5fa092470ce"
DUC_KHANG = "c61e871f-5888-5f4a-adc7-3c4e7a4272c7"
NGOC_ANH_DT = "25d77be2-fa13-4e7b-ab6b-a0a094a444cb"
NGOC_ANH_TK = "5edae502-3d64-4181-8790-8cb0b2e46a17"
MIXED_2021 = "PLmQ5jM-TsmbyITiyojh2DFC6NFIKZGApb"

SOURCES = [
    {
        "title": "Tiếng Việt lớp 3 · Bài 27–70 · VTV7",
        "grade": 3,
        "subject": "tieng-viet",
        "playlist_id": "PLmQ5jM-Tsmbwyz7PPveCC_ImnZaTXlusS",
        "expected": None,
        "owner_id": MINH_AN,
        "title_numbers": list(range(27, 71)),
    },
    {
        "title": "Ôn tập Ngữ văn THPT · Sơ đồ tư duy VTV7 (tư liệu)",
        "grade": 12,
        "subject": "ngu-van",
        "playlist_id": "PLmQ5jM-TsmbzTLh2ucLb9F5_vmewVKfKf",
        "expected": None,
        "owner_id": HA_LINH,
    },
    {
        "title": "4 chuyên đề Toán THPT · VTV7 2021 (tư liệu)",
        "grade": 12,
        "subject": "toan",
        "playlist_id": MIXED_2021,
        "expected": None,
        "owner_id": NGOC_MAI,
        "subject_pattern": r"\|\s*Toán học\s*\|",
        "subject_count": 4,
    },
    {
        "title": "5 chuyên đề Ngữ văn THPT · VTV7 2021 (tư liệu)",
        "grade": 12,
        "subject": "ngu-van",
        "playlist_id": MIXED_2021,
        "expected": None,
        "owner_id": QUANG_HUY,
        "subject_pattern": r"\|\s*Ngữ văn\s*\|",
        "subject_count": 5,
    },
    {
        "title": "4 chuyên đề Vật lí THPT · VTV7 2021 (tư liệu)",
        "grade": 12,
        "subject": "vat-ly",
        "playlist_id": MIXED_2021,
        "expected": None,
        "owner_id": BAO_CHAU,
        "subject_pattern": r"\|\s*Vật lý\s*\|",
        "subject_count": 4,
    },
    {
        "title": "5 chuyên đề Lịch sử THPT · VTV7 2021 (tư liệu)",
        "grade": 12,
        "subject": "lich-su",
        "playlist_id": MIXED_2021,
        "expected": None,
        "owner_id": DUC_KHANG,
        "subject_pattern": r"\|\s*Lịch sử\s*\|",
        "subject_count": 5,
    },
    {
        "title": "Sinh học ôn thi tốt nghiệp THPT · VTV7 2019 (tư liệu)",
        "grade": 12,
        "subject": "sinh-hoc",
        "playlist_id": "PLmQ5jM-Tsmbz84POgBJA7V0WcTBaoqg5S",
        "expected": None,
        "owner_id": NGOC_ANH_DT,
    },
    {
        "title": "Lịch sử ôn thi tốt nghiệp THPT · VTV7 2019 (tư liệu)",
        "grade": 12,
        "subject": "lich-su",
        "playlist_id": "PLmQ5jM-TsmbzIiwFlEegtsq50-aIUoqy-",
        "expected": None,
        "owner_id": NGOC_ANH_TK,
    },
]
OUTPUT = DATA / "vtv7-next-courses.json"


def known_video_ids():
    found = set()
    for name in ("vtv7-courses.json", "vtv7-more-courses.json"):
        path = DATA / name
        if not path.exists():
            continue
        for course in json.loads(path.read_text()):
            for lesson in course.get("lessons", []):
                found.add(lesson["video_id"])
    return found


async def load_playlist(client, playlist_id):
    url = "https://www.youtube.com/playlist?list=" + playlist_id
    response = await client.get(url)
    response.raise_for_status()
    html = response.text
    data = initial(html)
    version = re.search(r'"INNERTUBE_CLIENT_VERSION":"([^"]+)"', html)
    if not version:
        raise ValueError("YouTube client version missing")
    token_nodes = list(walk(data.get("contents", {}), "continuationCommand"))
    pages = 0
    while token_nodes and pages < 8:
        page = await client.post(
            "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false",
            json={
                "context": {
                    "client": {
                        "clientName": "WEB",
                        "clientVersion": version[1],
                        "hl": "vi",
                        "gl": "VN",
                    }
                },
                "continuation": token_nodes[-1]["token"],
            },
        )
        page.raise_for_status()
        chunk = page.json()
        extra = list(walk(chunk, "playlistVideoRenderer"))
        extra_lockups = list(walk(chunk, "lockupViewModel"))
        if extra or extra_lockups:
            bucket = data.setdefault("contents", {}).setdefault("continuationItems", [])
            bucket.extend({"playlistVideoRenderer": item} for item in extra)
            bucket.extend({"lockupViewModel": item} for item in extra_lockups)
        token_nodes = list(walk(chunk, "continuationCommand"))
        pages += 1
    if token_nodes:
        raise ValueError("Playlist exceeds safe page limit; incomplete")
    return data


def select_lessons(data, source):
    lessons, count = playlist_lessons(data, source["expected"])
    source_count = count
    pattern = source.get("subject_pattern")
    if pattern:
        expected_count = source["subject_count"]
        lessons = [
            x for x in lessons if re.search(pattern, x["title"], re.IGNORECASE)
        ]
        if len(lessons) != expected_count:
            raise ValueError("Subject series has missing/extra lessons")
        for lesson in lessons:
            lesson["number"] = number(lesson["title"])
        if sorted(x["number"] for x in lessons) != list(range(1, expected_count + 1)):
            raise ValueError("Numbered source series has missing/duplicate episodes")
        lessons = sorted(lessons, key=lambda x: x["number"])
        count = len(lessons)
    title_numbers = source.get("title_numbers")
    if title_numbers:
        found = [number(x["title"]) for x in lessons]
        if sorted(found) != list(title_numbers):
            raise ValueError("Official episode range does not match the playlist")
        lessons = sorted(lessons, key=lambda x: number(x["title"]))
        for position, lesson in enumerate(lessons, 1):
            lesson["number"] = position
    return lessons, count, source_count


async def collect():
    DATA.mkdir(parents=True, exist_ok=True)
    known = known_video_ids()
    cached = (
        {x["source_url"] + x["title"]: x for x in json.loads(OUTPUT.read_text())}
        if OUTPUT.exists()
        else {}
    )
    records = []
    semaphore = asyncio.Semaphore(5)
    async with httpx.AsyncClient(timeout=35, follow_redirects=True) as client:
        loaded = {}
        for source in SOURCES:
            playlist_id = source["playlist_id"]
            if playlist_id not in loaded:
                loaded[playlist_id] = await load_playlist(client, playlist_id)
            lessons, count, source_count = select_lessons(
                loaded[playlist_id], source
            )
            if any(item["video_id"] in known for item in lessons):
                raise ValueError("Playlist overlaps a video already imported")
            if len({item["video_id"] for item in lessons}) != len(lessons):
                raise ValueError("Duplicate video")
            url = "https://www.youtube.com/playlist?list=" + playlist_id
            previous = cached.get(url + source["title"])
            if (
                previous
                and previous.get("eligible")
                and previous.get("owner_id") == source["owner_id"]
                and [x["video_id"] for x in previous["lessons"]]
                == [x["video_id"] for x in lessons]
                and all(
                    x.get("verified_at", "").startswith(
                        datetime.now(UTC).date().isoformat()
                    )
                    for x in previous["lessons"]
                )
            ):
                records.append(previous)
                print(source["title"], count, "videos; reused today's verification", flush=True)
                continue
            errors = []
            completed = 0

            async def checked(lesson, errors=errors, title=source["title"], count=count):
                nonlocal completed
                async with semaphore:
                    try:
                        await verify_video(client, lesson)
                    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
                        errors.append(
                            {
                                "video_id": lesson["video_id"],
                                "error": type(exc).__name__,
                            }
                        )
                completed += 1
                if completed % 25 == 0:
                    print(title, completed, "/", count, flush=True)

            await asyncio.gather(*(checked(item) for item in lessons))
            record = {
                "title": source["title"],
                "grade": source["grade"],
                "subject": source["subject"],
                "owner_id": source["owner_id"],
                "source_url": url,
                "source_video_count": source_count,
                "subject_series_count": count,
                "expected_last_lesson": count,
                "sequence": "episode_number"
                if source.get("subject_pattern") or source.get("title_numbers")
                else "official_playlist_order",
                "missing_numbers": [],
                "verification_errors": errors,
                "eligible": not errors,
                "lessons": lessons,
            }
            records.append(record)
            OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
            print(source["title"], count, "videos; errors", len(errors), flush=True)
    if any(not x["eligible"] for x in records):
        raise SystemExit("Verification failures: inspect manifest before importing")


if __name__ == "__main__":
    asyncio.run(collect())
