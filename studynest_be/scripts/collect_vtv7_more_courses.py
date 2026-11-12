"""Collect complete official VTV7 playlists, excluding English and computing.

Only public metadata and embed links are collected; no media is downloaded.
Playlist order is retained for unnumbered topic series. Historic exam material
is explicitly labeled as archive material, not current-year exam preparation.
"""

import asyncio
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.collect_vtv7_courses import CHANNEL, DATA, initial, number, walk

SOURCES = [
    (
        "Toán lớp 2 · Bộ bài giảng VTV7",
        2,
        "toan",
        "PLmQ5jM-TsmbwfK51UU6feMq2BGSs0-eHH",
        70,
    ),
    (
        "Tiếng Việt lớp 2 · Bộ bài giảng VTV7",
        2,
        "tieng-viet",
        "PLmQ5jM-Tsmbzrw8vyqmG2lJBZFdYMOfcV",
        70,
    ),
    (
        "Toán ôn thi vào lớp 10 · VTV7 2023 (tư liệu)",
        9,
        "toan",
        "PLmQ5jM-TsmbxMyEeWhsKMIQXVUTYNF1BH",
        10,
    ),
    (
        "Ngữ văn ôn thi vào lớp 10 · VTV7 2023 (tư liệu)",
        9,
        "ngu-van",
        "PLmQ5jM-Tsmby8MYv0c7J_bufG-Sjhz5TI",
        10,
    ),
    (
        "Ôn tập Vật lí THPT · Sơ đồ tư duy VTV7 (tư liệu)",
        12,
        "vat-ly",
        "PLmQ5jM-TsmbzC1owgzbo7iEV4cDaKBR3a",
        None,
    ),
    (
        "4 chuyên đề Hóa học THPT · VTV7 2021 (tư liệu)",
        12,
        "hoa-hoc",
        "PLmQ5jM-TsmbyITiyojh2DFC6NFIKZGApb",
        None,
    ),
    (
        "4 chuyên đề Sinh học THPT · VTV7 2021 (tư liệu)",
        12,
        "sinh-hoc",
        "PLmQ5jM-TsmbyITiyojh2DFC6NFIKZGApb",
        None,
    ),
    (
        "Ôn tập Lịch sử THPT · Sơ đồ tư duy VTV7 (tư liệu)",
        12,
        "lich-su",
        "PLmQ5jM-TsmbwX42hBrH6q0ItjMBoileGf",
        None,
    ),
    (
        "5 chuyên đề Địa lí THPT · VTV7 2021 (tư liệu)",
        12,
        "dia-ly",
        "PLmQ5jM-TsmbyITiyojh2DFC6NFIKZGApb",
        None,
    ),
]
OUTPUT = DATA / "vtv7-more-courses.json"


def playlist_lessons(data, expected):
    headers = list(walk(data, "playlistHeaderRenderer"))
    if headers:
        count_text = headers[0].get("numVideosText", {})
    else:
        sidebars = list(walk(data, "playlistSidebarPrimaryInfoRenderer"))
        if not sidebars or not sidebars[0].get("stats"):
            raise ValueError("Playlist count unavailable")
        count_text = sidebars[0]["stats"][0]
    count_text = count_text.get("simpleText") or "".join(
        x.get("text", "") for x in count_text.get("runs", [])
    )
    advertised = int(re.sub(r"\D", "", count_text))
    lessons = []
    for node in walk(data.get("contents", {}), "lockupViewModel"):
        if node.get("contentType") == "LOCKUP_CONTENT_TYPE_VIDEO":
            lessons.append(
                {
                    "video_id": node["contentId"],
                    "title": node["metadata"]["lockupMetadataViewModel"]["title"][
                        "content"
                    ],
                }
            )
    if not lessons:
        for node in walk(data.get("contents", {}), "playlistVideoRenderer"):
            lessons.append(
                {
                    "video_id": node["videoId"],
                    "title": "".join(
                        x.get("text", "") for x in node["title"].get("runs", [])
                    ),
                }
            )
    if (
        len(lessons) != advertised
        or len({x["video_id"] for x in lessons}) != advertised
    ):
        raise ValueError("Incomplete or duplicate playlist; do not import")
    for position, item in enumerate(lessons, 1):
        item["source_position"] = position
        item["number"] = number(item["title"]) if expected else position
    if expected and sorted(x["number"] for x in lessons) != list(
        range(1, expected + 1)
    ):
        raise ValueError("Numbered source series has missing/duplicate episodes")
    return sorted(lessons, key=lambda x: x["number"]), advertised


async def verify_video(client, lesson):
    url = "https://www.youtube.com/watch?v=" + lesson["video_id"]
    response = await client.get(
        "https://www.youtube.com/oembed", params={"url": url, "format": "json"}
    )
    response.raise_for_status()
    metadata = response.json()
    if metadata["author_url"].rstrip("/") not in {
        "https://www.youtube.com/@VTV7tv",
        "https://www.youtube.com/channel/" + CHANNEL,
    }:
        raise ValueError("Not the official VTV7 channel")
    response = await client.get(url)
    response.raise_for_status()
    match = re.search(r"ytInitialPlayerResponse\s*=\s*", response.text)
    if not match:
        raise ValueError("Missing player metadata")
    player = json.JSONDecoder().raw_decode(response.text[match.end() :])[0]
    details = player.get("videoDetails", {})
    if (
        details.get("channelId") != CHANNEL
        or details.get("videoId") != lesson["video_id"]
    ):
        raise ValueError("Channel/video identity mismatch")
    if (
        details.get("isPrivate")
        or details.get("isLiveContent")
        or player.get("playabilityStatus", {}).get("playableInEmbed") is False
    ):
        raise ValueError("Private, live or non-embeddable video")
    duration = int(details.get("lengthSeconds", 0))
    if duration <= 0:
        raise ValueError("Missing duration")
    lesson.update(
        video_url=url,
        channel_name="VTV7",
        channel_url="https://www.youtube.com/@VTV7tv",
        duration_seconds=duration,
        verification="official_channel_and_oembed",
        verified_at=datetime.now(UTC).isoformat(),
    )


async def collect():
    DATA.mkdir(parents=True, exist_ok=True)
    cached = (
        {x["source_url"] + x["title"]: x for x in json.loads(OUTPUT.read_text())}
        if OUTPUT.exists()
        else {}
    )
    records = []
    semaphore = asyncio.Semaphore(5)
    async with httpx.AsyncClient(timeout=35, follow_redirects=True) as client:
        for title, grade, subject, playlist_id, expected in SOURCES:
            url = "https://www.youtube.com/playlist?list=" + playlist_id
            response = await client.get(url)
            response.raise_for_status()
            lessons, count = playlist_lessons(initial(response.text), expected)
            source_count = count
            if playlist_id == "PLmQ5jM-TsmbyITiyojh2DFC6NFIKZGApb":
                pattern, expected_count = {
                    "hoa-hoc": (
                        r"(?:\|\s*Hóa(?: học| số)\b|^Tổng kết Hóa lớp 11\b)",
                        4,
                    ),
                    "sinh-hoc": (r"\|\s*Sinh học\s*\|", 4),
                    "dia-ly": (r"\|\s*Địa lý\s*\|", 5),
                }[subject]
                lessons = [
                    x for x in lessons if re.search(pattern, x["title"], re.IGNORECASE)
                ]
                if len(lessons) != expected_count:
                    raise ValueError("Subject series has missing/extra lessons")
                for position, lesson in enumerate(lessons, 1):
                    lesson["number"] = position
                count = len(lessons)
            previous = cached.get(url + title)
            if (
                previous
                and previous.get("eligible")
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
                print(title, count, "videos; reused today's verification", flush=True)
                continue
            errors = []
            completed = 0

            async def checked(lesson, errors=errors, title=title, count=count):
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
                "title": title,
                "grade": grade,
                "subject": subject,
                "source_url": url,
                "source_video_count": source_count,
                "subject_series_count": count,
                "expected_last_lesson": count,
                "sequence": "episode_number" if expected else "official_playlist_order",
                "missing_numbers": [],
                "verification_errors": errors,
                "eligible": not errors,
                "lessons": lessons,
            }
            records.append(record)
            OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
            print(title, count, "videos; errors", len(errors), flush=True)
    if any(not x["eligible"] for x in records):
        raise SystemExit("Verification failures: inspect manifest before importing")


if __name__ == "__main__":
    asyncio.run(collect())
