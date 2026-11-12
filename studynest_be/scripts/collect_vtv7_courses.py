"""Collect public, embeddable VTV7 lesson metadata only; no video downloads."""

import asyncio
import json
import re
from pathlib import Path
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

DATA = Path(__file__).resolve().parents[2] / "data/lessons"
PLAYLIST = "PLmQ5jM-TsmbylaXTEBOSUXL3QR-Ya0ADM"
CHANNEL = "UC5r0xuk4DsjsYiCq8H7AlDg"
MATH = "https://thchuvanan.haiphong.edu.vn/hoc-tap-truc-tuyen-toan-1/c/20068"


def walk(value, key):
    if isinstance(value, dict):
        if key in value:
            yield value[key]
        for child in value.values():
            yield from walk(child, key)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child, key)


def initial(html):
    match = re.search(r"(?:var\s+)?ytInitialData\s*=\s*", html)
    if not match:
        raise ValueError("YouTube initial data missing")
    return json.JSONDecoder().raw_decode(html[match.end() :])[0]


def number(title):
    m = re.search(r"Bài\s*(\d+)", title, re.IGNORECASE)
    return int(m[1]) if m else None


async def collect():
    DATA.mkdir(parents=True, exist_ok=True)
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        url = "https://www.youtube.com/playlist?list=" + PLAYLIST
        response = await client.get(url)
        response.raise_for_status()
        html = response.text
        data = initial(html)
        nodes = list(walk(data.get("contents", {}), "lockupViewModel"))
        token_nodes = list(walk(data.get("contents", {}), "continuationCommand"))
        version = re.search(r'"INNERTUBE_CLIENT_VERSION":"([^\"]+)"', html)
        if not version:
            raise ValueError("YouTube client version missing")
        for page in range(10):
            if not token_nodes:
                break
            token = token_nodes[-1]["token"]
            response = await client.post(
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
                    "continuation": token,
                },
            )
            response.raise_for_status()
            chunk = response.json()
            nodes.extend(walk(chunk, "lockupViewModel"))
            for old in walk(chunk, "playlistVideoRenderer"):
                nodes.append(
                    {
                        "contentType": "LOCKUP_CONTENT_TYPE_VIDEO",
                        "contentId": old.get("videoId"),
                        "metadata": {
                            "lockupMetadataViewModel": {
                                "title": {
                                    "content": "".join(
                                        x.get("text", "")
                                        for x in old.get("title", {}).get("runs", [])
                                    )
                                }
                            }
                        },
                    }
                )
            token_nodes = list(walk(chunk, "continuationCommand"))
        if token_nodes:
            raise ValueError("Playlist exceeds safe page limit; incomplete")
        lessons = []
        for n in nodes:
            if n.get("contentType") != "LOCKUP_CONTENT_TYPE_VIDEO":
                continue
            title = (
                n.get("metadata", {})
                .get("lockupMetadataViewModel", {})
                .get("title", {})
                .get("content", "")
            )
            if number(title) and number(title) <= 36:
                lessons.append(
                    {
                        "title": title,
                        "video_id": n["contentId"],
                        "number": number(title),
                    }
                )
        # Prefer the creator's FULL edition; otherwise retain all distinct parts in source order.
        full = {x["number"] for x in lessons if "(FULL)" in x["title"].upper()}
        lessons = [
            x
            for x in lessons
            if x["number"] not in full or "(FULL)" in x["title"].upper()
        ]
        lessons = list({x["video_id"]: x for x in lessons}.values())
        lessons.sort(key=lambda x: x["number"])
        courses = [
            {
                "title": "Tiếng Việt lớp 1 · Học vần cùng VTV7",
                "grade": 1,
                "subject": "tieng-viet",
                "source_url": url,
                "expected_last_lesson": 36,
                "source_reference": "https://thquantoan.haiphong.edu.vn/day-va-hoc/36-chu-de-hoc-tieng-viet-lop-1-tren-vtv-7/ctmb/9581/1805",
                "lessons": lessons,
            }
        ]
        # Official school index preserves the math episode sequence and its source links.
        queue = [MATH]
        seen = set()
        articles = {}
        while queue and len(seen) < 8:
            page = queue.pop(0)
            if page in seen:
                continue
            seen.add(page)
            r = await client.get(page)
            r.raise_for_status()
            soup = BeautifulSoup(r.content, "html.parser")
            for a in soup.select("a[href]"):
                title = a.get_text(" ", strip=True)
                href = urljoin(page, a["href"])
                if number(title) and "VTV7" in title:
                    articles[href] = title
                elif (
                    a.get_text(strip=True).isdigit()
                    and "/c/20068" in href
                    and href not in seen
                ):
                    queue.append(href)
        sem = asyncio.Semaphore(5)

        async def article(url, title):
            async with sem:
                r = await client.get(url)
                r.raise_for_status()
                ids = re.findall(
                    r"(?:youtube(?:-nocookie)?\.com/(?:embed/|watch\?v=)|youtu\.be/)([A-Za-z0-9_-]{11})",
                    r.text,
                )
                return (
                    {
                        "title": title,
                        "video_id": ids[0],
                        "number": number(title),
                        "article_url": url,
                    }
                    if ids
                    else None
                )

        math = [
            x
            for x in await asyncio.gather(*(article(u, t) for u, t in articles.items()))
            if x
        ]
        math.append(
            {
                "title": "Bài 18: Khối hộp chữ nhật, khối lập phương | TOÁN 1 | VTV7",
                "video_id": "4LsAwB_nMpE",
                "number": 18,
                "article_url": "https://www.youtube.com/watch?v=4LsAwB_nMpE",
            }
        )
        for index in [
            "https://thchuvanan.haiphong.edu.vn/hoc-tap-truc-tuyen-tieng-viet-1/c/20069",
            "https://thchuvanan.haiphong.edu.vn/hoc-tap-truc-tuyen-tieng-viet-1/c/20069/2",
        ]:
            response = await client.get(index)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, "html.parser")
            for anchor in soup.select("a[href]"):
                title = anchor.get_text(" ", strip=True)
                n = number(title)
                if n in {34, 35, 36} and "(FULL)" in title.upper():
                    supplement = await article(urljoin(index, anchor["href"]), title)
                    if supplement:
                        courses[0]["lessons"].append(supplement)
        courses[0]["lessons"] = list(
            {x["number"]: x for x in courses[0]["lessons"]}.values()
        )
        courses[0]["lessons"].sort(key=lambda x: x["number"])
        math.sort(key=lambda x: x["number"])
        courses.append(
            {
                "title": "Toán lớp 1 · Bộ bài giảng VTV7",
                "grade": 1,
                "subject": "toan",
                "source_url": MATH,
                "expected_last_lesson": 35,
                "lessons": math,
            }
        )

        async def verify(lesson):
            async with sem:
                u = "https://www.youtube.com/watch?v=" + lesson["video_id"]
                r = await client.get(
                    "https://www.youtube.com/oembed",
                    params={"url": u, "format": "json"},
                )
                r.raise_for_status()
                o = r.json()
                if o["author_url"].rstrip("/") not in {
                    "https://www.youtube.com/@VTV7tv",
                    "https://www.youtube.com/channel/" + CHANNEL,
                }:
                    raise ValueError("Video is not owned by the official VTV7 channel")
                r = await client.get(u)
                r.raise_for_status()
                m = re.search(r"ytInitialPlayerResponse\s*=\s*", r.text)
                if not m:
                    raise ValueError("Player metadata unavailable")
                player, _ = json.JSONDecoder().raw_decode(r.text[m.end() :])
                details = player.get("videoDetails", {})
                if (
                    details.get("channelId") != CHANNEL
                    or details.get("isPrivate")
                    or details.get("isLiveContent")
                ):
                    raise ValueError("Invalid channel/private/live lesson")
                if player.get("playabilityStatus", {}).get("playableInEmbed") is False:
                    raise ValueError("Embedding disabled")
                lesson.update(
                    title=o["title"],
                    video_url=u,
                    channel_name=o["author_name"],
                    channel_url=o["author_url"],
                    duration_seconds=int(details["lengthSeconds"]),
                    verification="official_channel_and_oembed",
                )

        for course in courses:
            errors = []

            async def checked(lesson, errors=errors):
                try:
                    await verify(lesson)
                except (httpx.HTTPError, ValueError, KeyError, TypeError) as e:
                    errors.append(
                        {"video_id": lesson["video_id"], "error": type(e).__name__}
                    )

            await asyncio.gather(*(checked(x) for x in course["lessons"]))
            numbers = sorted({x["number"] for x in course["lessons"]})
            missing = sorted(
                set(range(1, course["expected_last_lesson"] + 1)) - set(numbers)
            )
            course.update(
                missing_numbers=missing,
                verification_errors=errors,
                eligible=bool(numbers) and not missing and not errors,
            )
            print(
                course["title"],
                len(course["lessons"]),
                "videos; missing",
                missing,
                "errors",
                len(errors),
                flush=True,
            )
        (DATA / "vtv7-courses.json").write_text(
            json.dumps(courses, ensure_ascii=False, indent=2) + "\n"
        )


if __name__ == "__main__":
    asyncio.run(collect())
