"""Fetch provenance-backed provider data; --apply imports without overwriting curated rows."""

import argparse
import asyncio
import csv
import hashlib
import io
import json
import re
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert

from app.db.models.catalog import Provider
from app.db.sesson import AsyncSessionLocal, engine
from app.services.catalog_slugs import slugify

DATA = Path(__file__).resolve().parents[2] / "data/providers"
SOURCE = "https://tuyensinh.qui.edu.vn/about/Danh-sach-truong-THPT-theo-dia-gioi-hanh-chinh-moi.html"
CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwuZ48zegu7YaiU6dVnCa50v7PuRihrKhLrxk1TdWVxOTWes7D-luC5vI7ltwreQ/pub?output=csv"
# A source-backed starting directory, not a ranking or quality endorsement.
CENTERS = [
    ("HOCMAI", "https://hocmai.vn/"),
    ("Tuyensinh247", "https://tuyensinh247.com/"),
    ("VUIHOC", "https://vuihoc.vn/"),
    ("VTED", "https://vted.vn/"),
    ("Moon.vn", "https://moon.vn/"),
    ("HOC247", "https://hoc247.net/"),
    ("Mclass", "https://mclass.vn/"),
    ("HSA Education", "https://thithuhsa.vn/"),
    ("VietJack", "https://vietjack.com/"),
    ("VUNGOI", "https://vungoi.vn/"),
    ("Luyện Thi 123", "https://luyenthi123.edu.vn/"),
    ("Luyện thi Nguyễn Thượng Hiền", "https://ltnth.edu.vn/"),
    ("TopHSA", "https://giaoduchsa.edu.vn/"),
    ("Luyện thi Thành Công - Cần Thơ", "https://thanhcongedu.vn/"),
    ("Bồi dưỡng văn hóa và Luyện thi Thành Công", "https://ttthanhcong.edu.vn/"),
    ("Luyện thi CLC", "https://luyenthiclc.edu.vn/"),
    ("Luyện thi Nhân Tài Việt", "https://toanlyhoa.vn/"),
    ("DMT Education", "https://www.dmteducation.edu.vn/"),
]


def classify(name):
    folded = name.casefold()
    if re.search(
        r"trước|ngừng|giải thể|sáp nhập|sát nhập|đã đổi|đến (?:năm|ngày)|\(20\d\d\)",
        folded,
    ):
        return "historical_or_requires_review"
    if re.search(
        r"học ở nước ngoài|quân nhân|công an tại ngũ|khu vực [123]|trường khác|tự do",
        folded,
    ):
        return "placeholder"
    if re.search(r"gdtx|gdnn|thường xuyên|trung tâm", folded):
        return "outside_school_scope"
    if re.search(
        r"thpt|ptth|trung học phổ thông|phổ thông|^pt\b|^ptdtnt\b|^ptdl\b|hữu nghị (?:80|t78)|trường pt|liên cấp|trung-tiểu học|song ngữ quốc tế|quốc tế việt nam|blue sky academy|thực hành sư phạm|thth sài gòn",
        folded,
    ):
        return "school"
    if re.search(r"cao đẳng|đại học|học viện|trung cấp|^cđ |^tc |^đh ", folded):
        return "outside_school_scope"
    return "ambiguous_requires_review"


def parse_schools(content, checked):
    rows = list(csv.reader(io.StringIO(content)))
    header = next(
        i
        for i, row in enumerate(rows)
        if len(row) >= 9 and row[1].strip() == "Mã Tỉnh/TP"
    )
    items, excluded, seen = [], [], set()
    for row in rows[header + 1 :]:
        if len(row) < 9 or not row[1].strip() or not row[5].strip():
            continue
        row = [value.strip() for value in row]
        province_code, province, _, _, school_code, name, address, _ = row[1:9]
        key = f"vn-school-2026:{province_code}:{school_code}"
        if key in seen:
            raise ValueError(f"Duplicate source identity {key}")
        seen.add(key)
        category = classify(name)
        snapshot = dict(zip(rows[header], row))
        if category != "school":
            excluded.append({"source_key": key, "reason": category, "record": snapshot})
            continue
        if not 2 <= len(name) <= 160:
            raise ValueError(f"Invalid school name length: {key}")
        items.append(
            {
                "name": name,
                "provider_type": "school",
                "province": province,
                "province_code": province_code,
                "school_code": school_code,
                "address": address,
                "website_url": None,
                "source_url": SOURCE,
                "source_key": key,
                "source_checked_at": checked,
                "source_snapshot": {
                    "source_year": 2026,
                    "source_updated": "2026-05-09",
                    "download_url": CSV_URL,
                    "record": snapshot,
                },
            }
        )
    if len(items) < 2500 or len({item["province_code"] for item in items}) != 34:
        raise ValueError(
            "Incomplete school directory: require 2500+ schools and 34 provinces"
        )
    return items, excluded


async def fetch():
    DATA.mkdir(parents=True, exist_ok=True)
    checked = datetime.now(UTC).isoformat()
    async with httpx.AsyncClient(
        timeout=30,
        follow_redirects=True,
        headers={"User-Agent": "MayMayDirectory/1.0 (public education directory)"},
    ) as client:
        response = await client.get(CSV_URL)
        response.raise_for_status()
        content = response.content.decode("utf-8-sig")
        items, excluded = parse_schools(content, checked)
        (DATA / "schools-2026-source.csv").write_text(content)
        centers = []
        for name, url in CENTERS:
            try:
                response = await client.get(url)
                response.raise_for_status()
                html = response.text
                title = re.search(
                    r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL
                )
                evidence = re.search(
                    r"thpt|luyện thi|tốt nghiệp|đại học|lớp 12|lớp 10|đánh giá năng lực",
                    html,
                    re.IGNORECASE,
                )
                if not title or not evidence:
                    raise ValueError("No public THPT/exam preparation evidence")
                centers.append(
                    {
                        "name": name,
                        "status": response.status_code,
                        "url": str(response.url),
                        "title": re.sub(r"\s+", " ", title[1]).strip(),
                    }
                )
                items.append(
                    {
                        "name": name,
                        "provider_type": "exam_center",
                        "province": None,
                        "province_code": None,
                        "school_code": None,
                        "address": None,
                        "website_url": url,
                        "source_url": url,
                        "source_key": "vn-prep:" + httpx.URL(url).host,
                        "source_checked_at": checked,
                        "source_snapshot": {
                            "page_title": centers[-1]["title"],
                            "final_url": str(response.url),
                            "response_sha256": hashlib.sha256(
                                response.content
                            ).hexdigest(),
                        },
                    }
                )
            except (httpx.HTTPError, ValueError) as error:
                centers.append(
                    {"name": name, "url": url, "error": type(error).__name__}
                )
            print(f"Fetched {name}: {centers[-1].get('error', 'ok')}", flush=True)
            await asyncio.sleep(0.25)
    # Explicitly reviewed first-party evidence remains reproducible when direct
    # crawling is blocked. Preserve its actual review timestamp, not this run's.
    supplements_path = DATA / "center-supplements.json"
    if supplements_path.exists():
        for supplement in json.loads(supplements_path.read_text()):
            key = "vn-prep:" + httpx.URL(supplement["website_url"]).host
            if any(item["source_key"] == key for item in items):
                continue
            evidence = {
                "retrieval_method": "first_party_web_index_or_open",
                "checked_on": supplement["checked_at"],
                "page_title": supplement["page_title"],
                "direct_crawl_failed": True,
            }
            items.append(
                {
                    "name": supplement["name"],
                    "provider_type": "exam_center",
                    "province": None,
                    "province_code": None,
                    "school_code": None,
                    "address": None,
                    "website_url": supplement["website_url"],
                    "source_url": supplement["source_url"],
                    "source_key": key,
                    "source_checked_at": supplement["checked_at"],
                    "source_snapshot": evidence,
                }
            )
            for center in centers:
                if center["name"] == supplement["name"]:
                    center.update(
                        supplemental_evidence=evidence,
                        evidence_url=supplement["source_url"],
                    )
    report = {
        "checked_at": checked,
        "school_source": SOURCE,
        "source_download": CSV_URL,
        "source_sha256": hashlib.sha256(content.encode()).hexdigest(),
        "counts": dict(Counter(item["provider_type"] for item in items)),
        "provinces": dict(
            sorted(
                Counter(
                    item["province"]
                    for item in items
                    if item["provider_type"] == "school"
                ).items()
            )
        ),
        "excluded_counts": dict(Counter(row["reason"] for row in excluded)),
        "centers": centers,
    }
    for filename, data in [
        ("directory.json", items),
        ("excluded-schools.json", excluded),
        ("crawl-report.json", report),
    ]:
        (DATA / filename).write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        )
    print(json.dumps(report, ensure_ascii=False, indent=2))


async def apply():
    items = json.loads((DATA / "directory.json").read_text())
    count, collisions = 0, []
    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "SELECT pg_advisory_xact_lock(hashtextextended('provider-directory-import',0))"
            )
        )
        for item in items:
            if await db.scalar(
                select(Provider.id).where(Provider.source_key == item["source_key"])
            ):
                continue
            manual = await db.scalar(
                select(Provider.id).where(
                    Provider.source_key.is_(None),
                    func.lower(Provider.name) == item["name"].lower(),
                )
            )
            if manual:
                collisions.append(
                    {"source_key": item["source_key"], "provider_id": str(manual)}
                )
                continue
            values = dict(item)
            values["source_checked_at"] = datetime.fromisoformat(
                values["source_checked_at"]
            )
            values.update(
                slug=(slugify(item["name"])[:110] + "-" + slugify(item["source_key"]))[
                    :180
                ],
                verification_status="verified",
                is_active=True,
            )
            await db.execute(
                insert(Provider)
                .values(**values)
                .on_conflict_do_nothing(index_elements=["source_key"])
            )
            count += 1
        notification = None
        if count:
            from app.schemas.shares.notification import NotificationCreateSchema
            from app.services.shares.notification import NotificationService

            notification = await NotificationService(db).stage_notification_async(
                NotificationCreateSchema(
                    title="Đã nhập danh mục đơn vị",
                    content=f"Đã thêm {count} đơn vị có nguồn công khai. Vui lòng rà soát và xác minh trước khi sử dụng chính thức.",
                    role_target=["ADMIN"],
                    type="provider",
                    action="open_url",
                    url="/admin/providers",
                    metadata={"imported_count": count},
                )
            )
        await db.commit()
        if notification:
            await NotificationService(db).publish_notification_async(notification)
    report = {
        "target_database": engine.url.database,
        "inserted": count,
        "already_imported": len(items) - count - len(collisions),
        "manual_collisions": collisions,
    }
    (DATA / "import-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )
    with (DATA / "import-history.jsonl").open("a") as history:
        history.write(
            json.dumps(
                {"checked_at": datetime.now(UTC).isoformat(), **report},
                ensure_ascii=False,
            )
            + "\n"
        )
    print(json.dumps(report, ensure_ascii=False))
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    asyncio.run(apply() if args.apply else fetch())
