"""Discover logos from declared websites and official school directories.

--apply normalizes raster images and uploads to R2. Never verifies a provider,
guesses school domains, replaces an existing image, or bypasses failed sources.
"""

import argparse
import asyncio
import hashlib
import ipaddress
import json
import re
import socket
import sys
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import select

from app.db.models.catalog import Provider
from app.db.sesson import AsyncSessionLocal, engine
from app.services.catalog_slugs import slugify
from app.services.provider_images import MAX_IMAGE_BYTES, normalize_image
from app.services.shares.file_storage import FileStorageService

DATA = Path(__file__).resolve().parents[2] / "data/providers"
DIRECTORIES = [
    ("Hà Nội", "https://www.hanoi.edu.vn/c3conglap"),
    ("Hải Phòng", "https://haiphong.edu.vn/DSDonVi?codekhoi=thpt"),
    ("Đà Nẵng", "https://www.danang.edu.vn/DSDonvimb?codekhoi=thpt"),
]


def school_name(value):
    value = re.sub(r"trung học phổ thông", "thpt", value.casefold())
    value = re.sub(r"^trường\s+", "", value)
    return slugify(value).replace("-", "")


async def public_url(url):
    parsed = urlsplit(url)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.port not in {None, 80, 443}
    ):
        raise ValueError("non-public URL")
    addresses = await asyncio.to_thread(
        socket.getaddrinfo,
        parsed.hostname,
        parsed.port or (443 if parsed.scheme == "https" else 80),
    )
    if not addresses or any(
        not ipaddress.ip_address(address[4][0]).is_global for address in addresses
    ):
        raise ValueError("non-public address")


async def download(client, url, limit):
    for _ in range(5):
        await public_url(url)
        async with client.stream("GET", url) as response:
            if response.is_redirect:
                url = urljoin(url, response.headers["location"])
                continue
            response.raise_for_status()
            output = bytearray()
            async for chunk in response.aiter_bytes():
                output.extend(chunk)
                if len(output) > limit:
                    raise ValueError("download too large")
            return str(response.url), bytes(output)
    raise ValueError("too many redirects")


def logo_candidates(html, base):
    soup = BeautifulSoup(html, "html.parser")
    candidates = []
    for image in soup.find_all("img"):
        source = image.get("data-src") or image.get("src")
        descriptor = (
            " ".join(str(image.get(key, "")) for key in ["alt", "id", "class"])
            + " "
            + str(source)
        )
        if (
            not source
            or source.startswith("data:")
            or not re.search(r"logo", descriptor, re.IGNORECASE)
        ):
            continue
        if re.search(
            r"payment|bank|visa|momo|vnpay|bocongthuong|dmca|facebook|zalo|youtube|logohanoi|logohp|logohcm|logo[-_]?so\b|logo[-_]?sgd|quoc[-_]?huy|sở giáo dục|bộ giáo dục",
            descriptor,
            re.IGNORECASE,
        ):
            continue
        score = 2 if re.search(r"logo", str(source), re.IGNORECASE) else 1
        candidates.append((score, urljoin(base, source)))
    for link in soup.find_all("link"):
        if "apple-touch-icon" in link.get("rel", []) and link.get("href"):
            candidates.append((0, urljoin(base, link["href"])))
    return list(
        dict.fromkeys(url for _, url in sorted(candidates, key=lambda item: -item[0]))
    )[:5]


async def purge_ambiguous_logos(storage, report):
    """Shared raster hashes on unrelated school profiles are not school identity."""
    from collections import Counter

    from sqlalchemy import or_

    from app.core.settings import settings

    async with AsyncSessionLocal() as db:
        rows = (
            await db.scalars(
                select(Provider)
                .where(
                    Provider.logo_url.is_not(None),
                    Provider.verification_status == "pending",
                    Provider.source_key.is_not(None),
                )
                .with_for_update()
            )
        ).all()
        counts = Counter(
            row.source_snapshot.get("logo", {}).get("sha256")
            for row in rows
            if row.source_snapshot
        )
        removed = []
        for row in rows:
            metadata = (row.source_snapshot or {}).get("logo", {})
            image_url = metadata.get("source_image_url", "")
            if metadata.get("sha256") and (
                counts[metadata["sha256"]] > 1
                or re.search(r"/Images/logo(?:hanoi|hp)\.", image_url, re.IGNORECASE)
            ):
                removed.append(row.logo_url)
                row.logo_url = None
                row.source_snapshot = {
                    **row.source_snapshot,
                    "logo_rejected": {
                        **metadata,
                        "reason": "shared_portal_or_ambiguous_logo",
                    },
                }
                for item in report.get("items", []):
                    if item["provider_id"] == str(row.id):
                        item["status"] = "ambiguous_shared_logo_removed"
        await db.commit()
        # Only remove newly unused crawler objects, never another referenced asset.
        for url in removed:
            if not await db.scalar(
                select(Provider.id)
                .where(or_(Provider.logo_url == url, Provider.banner_url == url))
                .limit(1)
            ):
                key = url.removeprefix("/api/storage/files/")
                await asyncio.to_thread(
                    storage._client().delete_object,
                    Bucket=settings.R2_BUCKET_NAME,
                    Key=key,
                )
    report["ambiguous_removed"] = len(removed)
    return len(removed)


async def main(apply=False, workers=5, skip_discovery=False):
    async with AsyncSessionLocal() as db:
        providers = (
            await db.scalars(select(Provider).where(Provider.source_key.is_not(None)))
        ).all()
    websites = {
        row.id: (row.website_url, row.source_url)
        for row in providers
        if row.website_url
    }
    if skip_discovery and (DATA / "logo-crawl-report.json").exists():
        previous = json.loads((DATA / "logo-crawl-report.json").read_text())
        by_id = {str(row.id): row.id for row in providers}
        for item in previous.get("items", []):
            if item["provider_id"] in by_id and item.get("website_url"):
                websites.setdefault(
                    by_id[item["provider_id"]],
                    (item["website_url"], item.get("directory_source")),
                )
    report = {
        "resumed_from_report": skip_discovery,
        "checked_at": datetime.now(UTC).isoformat(),
        "target_database": engine.url.database,
        "directory_sources": [],
        "items": [],
    }
    async with httpx.AsyncClient(
        timeout=15,
        headers={"User-Agent": "MayMayDirectory/1.0 (public school logo collection)"},
    ) as client:
        directories = [] if skip_discovery else list(DIRECTORIES)
        index_url = "https://vqa.moet.gov.vn/vi/news/tin-tuc-su-kien/huong-dan-tra-cuu-va-danh-sach-cac-trang-tra-cuu-diem-thi-tot-nghiep-thpt-nam-2026-274.html"
        report["directory_index_source"] = index_url
        if not skip_discovery:
            try:
                _, index_html = await download(client, index_url, 3_000_000)
                index_soup = BeautifulSoup(index_html, "html.parser")
                provinces_by_code = {
                    row.province_code: row.province
                    for row in providers
                    if row.province_code
                }
                seen_provinces = {province for province, _ in directories}
                for tr in index_soup.select("tr"):
                    cells = tr.find_all("td")
                    if len(cells) < 3:
                        continue
                    code = cells[0].get_text(strip=True)
                    province = provinces_by_code.get(code)
                    if not province or province in seen_provinces:
                        continue
                    anchor = cells[-1].find("a", href=True)
                    if not anchor:
                        continue
                    hostname = urlsplit(anchor["href"]).hostname
                    if not hostname:
                        continue
                    if hostname.endswith(".edu.vn"):
                        hostname = ".".join(hostname.split(".")[-3:])
                    elif hostname.startswith(("diemthi", "tracuu", "thitotnghiep")):
                        hostname = hostname.split(".", 1)[1]
                    else:
                        continue
                    directories.append(
                        (province, f"https://{hostname}/DSDonVi?codekhoi=thpt")
                    )
                    seen_provinces.add(province)
            except (httpx.HTTPError, ValueError, OSError) as error:
                report["index_error"] = type(error).__name__
        directory_semaphore = asyncio.Semaphore(workers)

        async def discover(province, source):
            async with directory_semaphore:
                queue, seen = [source], set()
                while queue and len(seen) < 10:
                    url = queue.pop(0)
                    if url in seen:
                        continue
                    seen.add(url)
                    try:
                        final, content = await download(client, url, 3_000_000)
                        soup = BeautifulSoup(content, "html.parser")
                        matched = 0
                        for tr in soup.select("tr"):
                            cells = tr.find_all("td")
                            if len(cells) < 3:
                                continue
                            text = [cell.get_text(" ", strip=True) for cell in cells]
                            for anchor in tr.select("a[href]"):
                                website = urljoin(final, anchor["href"])
                                if urlsplit(website).hostname == urlsplit(
                                    final
                                ).hostname or not website.startswith(
                                    ("https://", "http://")
                                ):
                                    continue
                                matches = [
                                    row
                                    for row in providers
                                    if row.province == province
                                    and school_name(row.name)
                                    in {school_name(value) for value in text}
                                ]
                                if len(matches) == 1:
                                    websites.setdefault(matches[0].id, (website, url))
                                    matched += 1
                        for anchor in soup.select("a[href]"):
                            next_url = urljoin(final, anchor["href"])
                            if (
                                anchor.get_text(strip=True).isdigit()
                                and urlsplit(next_url).hostname
                                == urlsplit(final).hostname
                                and next_url not in seen
                                and re.search(
                                    r"[?&](?:trang|page)=", next_url, re.IGNORECASE
                                )
                            ):
                                queue.append(next_url)
                        report["directory_sources"].append(
                            {"url": url, "matched": matched}
                        )
                        print(
                            f"Directory {province}: {matched} matching website links",
                            flush=True,
                        )
                    except (httpx.HTTPError, ValueError, OSError) as error:
                        report["directory_sources"].append(
                            {"url": url, "error": type(error).__name__}
                        )

        await asyncio.gather(
            *(discover(province, source) for province, source in directories)
        )
        if apply:
            async with AsyncSessionLocal() as db:
                for provider_id, (website, source) in websites.items():
                    current = await db.get(Provider, provider_id)
                    if current and not current.website_url:
                        current.website_url = website
                        current.source_snapshot = {
                            **(current.source_snapshot or {}),
                            "website_source": source,
                        }
                await db.commit()
        storage = FileStorageService()
        blocked_hashes = {
            (row.source_snapshot or {}).get("logo_rejected", {}).get("sha256")
            for row in providers
        }
        semaphore = asyncio.Semaphore(workers)

        async def crawl(row):
            async with semaphore:
                website, source = websites[row.id]
                item = {
                    "provider_id": str(row.id),
                    "name": row.name,
                    "website_url": website,
                    "directory_source": source,
                }
                if row.logo_url:
                    item["status"] = "existing_image_preserved"
                    report["items"].append(item)
                    return
                try:
                    final, content = await download(client, website, 3_000_000)
                    candidates = logo_candidates(content, final)
                    for candidate in candidates:
                        try:
                            image_url, raw = await download(
                                client, candidate, MAX_IMAGE_BYTES
                            )
                            if hashlib.sha256(raw).hexdigest() in blocked_hashes:
                                raise ValueError("previously rejected shared logo")
                            normalized = await asyncio.to_thread(
                                normalize_image, raw, "avatar"
                            )
                            item.update(
                                status="normalized",
                                source_image_url=image_url,
                                sha256=hashlib.sha256(raw).hexdigest(),
                                dimensions=[512, 512],
                                normalization_version=2,
                            )
                            if apply:
                                uploaded = await storage.upload_file(
                                    ["providers", "catalog", "avatars"],
                                    "avatar.webp",
                                    normalized,
                                    "image/webp",
                                )
                                async with AsyncSessionLocal() as db:
                                    current = await db.scalar(
                                        select(Provider)
                                        .where(Provider.id == row.id)
                                        .with_for_update()
                                    )
                                    if not current.logo_url:
                                        current.logo_url = uploaded["url"]
                                        current.website_url = (
                                            current.website_url or website
                                        )
                                        item["asset_url"] = uploaded["url"]
                                        current.source_snapshot = {
                                            **(current.source_snapshot or {}),
                                            "logo": {
                                                **item,
                                                "checked_at": report["checked_at"],
                                                "website_source": source,
                                            },
                                        }
                                        await db.commit()
                                        item.update(
                                            status="uploaded", logo_url=uploaded["url"]
                                        )
                            break
                        except (
                            httpx.HTTPError,
                            ValueError,
                            OSError,
                            HTTPException,
                        ) as error:
                            item.setdefault("candidate_errors", []).append(
                                {"url": candidate, "error": type(error).__name__}
                            )
                            if (
                                isinstance(error, HTTPException)
                                and error.status_code >= 500
                            ):
                                item["status"] = "storage_unavailable"
                                break
                            continue
                    else:
                        item["status"] = "no_valid_raster_logo"
                except (httpx.HTTPError, ValueError, OSError) as error:
                    item.update(status="source_unavailable", error=type(error).__name__)
                report["items"].append(item)
                # Persist progress so an interrupted crawl can resume without lost provenance.
                (DATA / "logo-crawl-report.json").write_text(
                    json.dumps(report, ensure_ascii=False, indent=2) + "\n"
                )
                print(f"Logo {row.name}: {item['status']}", flush=True)

        await asyncio.gather(*(crawl(row) for row in providers if row.id in websites))
    if apply:
        await purge_ambiguous_logos(storage, report)
    from collections import Counter

    report["counts"] = dict(Counter(item["status"] for item in report["items"]))
    report["without_declared_website"] = len(providers) - len(websites)
    (DATA / "logo-crawl-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "counts": report["counts"],
                "without_declared_website": report["without_declared_website"],
            },
            ensure_ascii=False,
        )
    )
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--workers", type=int, default=5, choices=range(1, 9))
    parser.add_argument(
        "--skip-discovery",
        action="store_true",
        help="Resume websites from the previous provenance report",
    )
    args = parser.parse_args()
    asyncio.run(main(args.apply, args.workers, args.skip_discovery))
