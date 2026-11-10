"""One-time, resumable migration of referenced legacy assets. R2 is the only runtime store.

Preparation: save a pg_dump and the complete project Drive ZIP under --backup-dir.
Uploads are read back and hashed before any URL changes. Source files are retained.
"""

import argparse
import asyncio
import hashlib
import html
import json
import mimetypes
import re
import sys
from email.message import Message
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx
from sqlalchemy import select, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.settings import settings
from app.db.models.database import (
    Courses,
    LessonNotes,
    LessonResources,
    Lessons,
    TutorChatImages,
    User,
)
from app.db.sesson import AsyncSessionLocal
from app.services.shares.file_storage import FileStorageService

URL_PATTERN = re.compile(r'https?://[^\s<>"\\]+')
HOSTS = {'drive.google.com', 'docs.google.com', 'lh3.googleusercontent.com'}


def asset_urls(value):
    return [m.group(0).rstrip("')]") for m in URL_PATTERN.finditer(value or '')
            if urlparse(html.unescape(m.group(0))).hostname in HOSTS]


def save(path, value):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2))
    temp.chmod(0o600)
    temp.replace(path)


def file_digest(path):
    with path.open('rb') as file:
        return hashlib.file_digest(file, 'sha256').hexdigest()


async def collect(db):
    entries = []
    for model, column in [(Courses, 'thumbnail_url'), (User, 'avatar'), (LessonResources, 'url'),
                          (TutorChatImages, 'url'), (LessonNotes, 'content')]:
        rows = (await db.scalars(select(model).where(getattr(model, column).op('~')(
            r'(drive\.google\.com|docs\.google\.com|googleusercontent\.com)')))).all()
        for row in rows:
            lesson = await db.get(Lessons, row.lesson_id) if isinstance(row, (LessonResources, LessonNotes)) else None
            if isinstance(row, Courses):
                purpose = ['courses', str(row.id), 'thumbnails']
            elif isinstance(row, User):
                purpose = ['avatars', str(row.id)]
            elif isinstance(row, LessonResources):
                purpose = ['courses', str(lesson.course_id), 'lessons', str(lesson.id), 'resources']
            elif isinstance(row, TutorChatImages):
                purpose = ['tutor_chat', str(row.user_id)]
            else:
                purpose = ['notes', str(row.user_id), str(row.lesson_id)]
            for old_url in set(asset_urls(getattr(row, column))):
                entries.append({'table': model.__tablename__, 'id': str(row.id), 'column': column,
                                'old_url': old_url, 'purpose': purpose,
                                'title': getattr(row, 'title', '') or '',
                                'mime_hint': getattr(row, 'mime_type', '') or ''})
    return entries


async def fetch_source(client, entry, root, downloads):
    url = html.unescape(entry['old_url'])
    parsed = urlparse(url)
    match = re.search(r'/file/d/([^/]+)', parsed.path)
    fid = match.group(1) if match else parse_qs(parsed.query).get('id', [None])[0]
    identity = fid or url
    cache_id = hashlib.sha256(identity.encode()).hexdigest()
    path = root / 'sources' / (cache_id + '.bin')
    if cache_id in downloads and path.exists() and file_digest(path) == downloads[cache_id]['sha256']:
        return {**downloads[cache_id], 'local_path': str(path)}
    download_url = 'https://drive.google.com/uc?export=download&id=' + fid if fid else url
    async with client.stream('GET', download_url) as response:
        response.raise_for_status()
        mime = response.headers.get('content-type', '').split(';')[0]
        if mime == 'text/html':
            raise RuntimeError('The source requires permission or returned a download warning')
        disposition = Message()
        disposition['content-disposition'] = response.headers.get('content-disposition', '')
        name = disposition.get_filename() or entry['title'] or ('image' + (mimetypes.guess_extension(mime) or '.bin'))
        h = hashlib.sha256()
        total = 0
        temp = path.with_suffix('.part')
        with temp.open('wb') as file:
            async for chunk in response.aiter_bytes(1024 * 1024):
                total += len(chunk)
                if total > settings.STORAGE_MAX_UPLOAD_BYTES:
                    raise RuntimeError('Source exceeds configured upload size')
                file.write(chunk)
                h.update(chunk)
        if not total:
            raise RuntimeError('Source is empty')
        temp.chmod(0o600)
        temp.replace(path)
    if mime == 'application/octet-stream':
        mime = entry['mime_hint'] or mimetypes.guess_type(name)[0] or mime
    info = {'name': name, 'mime_type': mime, 'bytes': total, 'sha256': h.hexdigest()}
    downloads[cache_id] = info
    save(root / 'downloads.json', downloads)
    return {**info, 'local_path': str(path)}


def readback_sha(client, key):
    response = client.get_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
    body = response['Body']
    digest = hashlib.sha256()
    try:
        for chunk in iter(lambda: body.read(1024 * 1024), b''):
            digest.update(chunk)
    finally:
        body.close()
    return digest.hexdigest()


async def main(root, apply):
    if not (root / 'before-migration.dump').is_file() or not (root / 'source-archive.zip').is_file():
        raise SystemExit('Both a database dump and full project archive are required')
    root.mkdir(exist_ok=True, parents=True)
    (root / 'sources').mkdir(exist_ok=True)
    (root / 'sources').chmod(0o700)
    downloads = json.loads((root / 'downloads.json').read_text()) if (root / 'downloads.json').exists() else {}
    storage = FileStorageService()
    r2 = storage._client()
    async with AsyncSessionLocal() as db:
        entries = await collect(db)
    print('Referenced asset URLs:', len(entries), flush=True)
    plan = []
    async with httpx.AsyncClient(timeout=180, follow_redirects=True) as http:
        for entry in entries:
            source = await fetch_source(http, entry, root, downloads)
            asset_id = hashlib.sha256((entry['table'] + entry['id'] + entry['column'] + entry['old_url']).encode()).hexdigest()[:32]
            key = storage.object_key(entry['purpose'], source['name'], source['mime_type'], asset_id=asset_id)
            # Upload and independently read all bytes; ETags alone are not an integrity check.
            def upload(source=source, key=key):
                with Path(source['local_path']).open('rb') as file:
                    r2.put_object(Bucket=settings.R2_BUCKET_NAME, Key=key, Body=file,
                                  ContentType=source['mime_type'], Metadata={'sha256': source['sha256']},
                                  ContentDisposition='inline' if source['mime_type'].startswith('image/') or source['mime_type']=='application/pdf' else 'attachment')
            await asyncio.to_thread(upload)
            actual = await asyncio.to_thread(readback_sha, r2, key)
            if actual != source['sha256']:
                raise RuntimeError('R2 readback checksum mismatch')
            plan.append({**entry, **source, 'key': key, 'new_url': storage.file_url(key), 'verified': True})
            save(root / 'manifest.json', plan)
            print('Verified', len(plan), '/', len(entries), entry['table'], source['bytes'], 'bytes', flush=True)
    if not apply:
        print('Prepared and verified all assets. Re-run with --apply to update references.', flush=True)
        return
    async with AsyncSessionLocal() as db:
        updated = 0
        for entry in plan:
            table, column = entry['table'], entry['column']
            result = await db.execute(text(
                f'UPDATE public."{table}" SET "{column}"=replace("{column}", :old, :new) '
                f'WHERE id=CAST(:id AS uuid) AND position(:old in "{column}")>0'),
                {'old': entry['old_url'], 'new': entry['new_url'], 'id': entry['id']})
            updated += result.rowcount
        await db.commit()
        print('Committed URL updates:', updated, flush=True)
    report = {'assets': len(plan), 'verified_bytes': sum(e['bytes'] for e in plan), 'updated_references': updated,
              'sources_retained': True, 'manifest': 'manifest.json'}
    save(root / 'result.json', report)
    # Manifest and result are part of the private migration backup, not public assets.
    for name in ['manifest.json', 'result.json', 'archive-contents.json']:
        file = root / name
        if file.exists():
            await asyncio.to_thread(r2.put_object, Bucket=settings.R2_BUCKET_NAME,
                Key='private/backups/migrations/drive-to-r2/2026-11-10/' + name,
                Body=file.read_bytes(), ContentType='application/json')
    print('Migration complete; source archive and database dump retained in private backups.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--backup-dir', type=Path, default=Path('backups/drive-migration'))
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    asyncio.run(main(args.backup_dir, args.apply))
