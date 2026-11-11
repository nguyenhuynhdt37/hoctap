import hashlib
import io
import unittest
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

import httpx
from botocore.exceptions import SSLError
from fastapi import FastAPI

from app.api.v1.shares.storage import router
from app.core.deps import AuthorizationService
from app.core.settings import settings
from app.db.sesson import get_session
from app.services.shares.file_storage import (
    FileStorageService,
    get_file_storage_service,
)
from app.services.shares.storage_cache import StorageCache


class StorageCacheTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        config = patch.object(settings, 'R2_CACHE_DIRECTORY', directory.name)
        config.start(); self.addCleanup(config.stop)
        self.cache = StorageCache()

    async def test_verified_cached_image_loads_without_any_external_tls_request(self):
        key = 'public/users/user/avatars/a.png'
        data = b'verified image bytes'
        checksum = hashlib.sha256(data).hexdigest()
        self.cache.write(key, [data], 'image/png', checksum)
        service = FileStorageService()
        service._r2 = Mock()
        service._r2.get_object.side_effect = SSLError(endpoint_url='https://r2.example', error='untrusted certificate')
        cached = await service.cached_download(key)
        self.assertEqual(cached.path.read_bytes(), data)
        self.assertEqual(cached.sha256, checksum)
        service._r2.get_object.assert_not_called()

    async def test_cache_miss_fetches_once_and_closes_upstream_body(self):
        service = FileStorageService()
        service._r2 = Mock()
        body = io.BytesIO(b'R2 image')
        service._r2.get_object.return_value = {'Body': body, 'ContentType': 'image/png'}
        first = await service.cached_download('public/a.png')
        second = await service.cached_download('public/a.png')
        self.assertTrue(body.closed)
        self.assertEqual(first.path.read_bytes(), b'R2 image')
        self.assertEqual(second.sha256, first.sha256)
        service._r2.get_object.assert_called_once()

    def test_bad_backup_checksum_cannot_replace_good_cache(self):
        key = 'public/a.png'
        original = self.cache.write(key, [b'good image'], 'image/png')
        with self.assertRaises(ValueError):
            self.cache.write(key, [b'wrong image'], 'image/png', 'a' * 64)
        self.assertEqual(self.cache.get(key).sha256, original.sha256)
        self.assertFalse(list(self.cache.root.rglob('*.part')))

    def test_tampered_file_is_not_served_as_verified_image(self):
        key = 'public/a.png'
        cached = self.cache.write(key, [b'good'], 'image/png')
        cached.path.write_bytes(b'evil')
        self.assertIsNone(self.cache.get(key))

    async def test_private_cache_is_authorized_even_for_conditional_requests(self):
        owner = uuid4()
        key = f'private/users/{owner}/tutor-chat/2026/11/images/a.png'
        cached = self.cache.write(key, [b'private image'], 'image/png')
        auth = SimpleNamespace(get_current_user=AsyncMock(return_value=SimpleNamespace(id=owner)))
        service = SimpleNamespace(cached_download=AsyncMock(return_value=cached))
        app = FastAPI(); app.include_router(router, prefix='/api/v1')
        app.dependency_overrides[AuthorizationService] = lambda: auth
        app.dependency_overrides[get_session] = lambda: Mock()
        app.dependency_overrides[get_file_storage_service] = lambda: service
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            response = await client.get('/api/v1/storage/files/' + key)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers['cache-control'], 'private, no-store')
            conditional = await client.get('/api/v1/storage/files/' + key, headers={'If-None-Match': response.headers['etag']})
            self.assertEqual(conditional.status_code, 200)
            auth.get_current_user.return_value.id = uuid4()
            denied = await client.get('/api/v1/storage/files/' + key, headers={'If-None-Match': response.headers['etag']})
            self.assertEqual(denied.status_code, 403)
            self.assertEqual(service.cached_download.await_count, 2)
