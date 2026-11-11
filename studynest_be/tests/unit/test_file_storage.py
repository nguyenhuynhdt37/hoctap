import unittest
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

import httpx
from botocore.stub import ANY, Stubber
from fastapi import FastAPI, HTTPException

from app.api.v1.shares.storage import authorize_file, router
from app.core.deps import AuthorizationService
from app.core.settings import settings
from app.db.models.database import Courses
from app.db.sesson import get_session
from app.services.shares.file_storage import (
    FileStorageService,
    get_file_storage_service,
)
from app.services.shares.storage_cache import StorageCache


class FileStorageTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.cache_dir = directory.name
        config = patch.multiple(settings, STORAGE_PROVIDER='r2', R2_ACCOUNT_ID='a' * 32,
                                R2_ACCESS_KEY_ID='test-access', R2_SECRET_ACCESS_KEY='test-secret',
                                R2_BUCKET_NAME='studynest', R2_SIGNED_URL_TTL_SECONDS=300, R2_CACHE_DIRECTORY=self.cache_dir)
        config.start()
        self.addCleanup(config.stop)
        self.storage = FileStorageService()

    async def test_upload_preserves_bytes_and_saves_stable_url_not_signed_url(self):
        client = self.storage._client()
        expected = {'Bucket': 'studynest', 'Key': ANY, 'Body': b'PNG data',
                    'ContentType': 'image/png', 'ContentDisposition': 'inline',
                    'CacheControl': 'public, max-age=86400'}
        with Stubber(client) as stub:
            stub.add_response('put_object', {'ETag': 'etag'}, expected)
            first = await self.storage.upload_file(['avatars', str(uuid4())], 'avatar.png', b'PNG data', 'image/png')
            stub.assert_no_pending_responses()
        self.assertTrue(first['url'].startswith('/api/storage/files/public/users/'))
        self.assertNotIn('X-Amz-', first['url'])
        self.assertNotIn('test-secret', str(first))

    async def test_private_resource_stays_private_and_same_filename_never_overwrites(self):
        self.storage._r2 = Mock()
        path = ['courses', str(uuid4()), 'lessons', str(uuid4()), 'resources']
        first = await self.storage.upload_file(path, '../lesson.pdf', b'%PDF', 'application/pdf')
        second = await self.storage.upload_file(path, '../lesson.pdf', b'%PDF', 'application/pdf')
        self.assertNotEqual(first['id'], second['id'])
        self.assertTrue(first['id'].startswith('private/courses/'))
        self.assertNotIn('/../', first['id'])
        self.assertEqual(self.storage._r2.put_object.call_args.kwargs['CacheControl'], 'private, max-age=300')

    async def test_signed_url_has_expected_expiry_without_network_or_credentials_in_database_url(self):
        key = 'private/users/' + str(uuid4()) + '/tutor-chat/2026/11/images/image.png'
        url = await self.storage.signed_download_url(key)
        self.assertIn('X-Amz-Expires=300', url)
        self.assertIn('X-Amz-Signature=', url)
        self.assertNotIn('test-secret', url)
        self.assertNotIn('X-Amz-', self.storage.file_url(key))

    async def test_missing_credentials_fail_explicitly(self):
        with patch.object(settings, 'R2_SECRET_ACCESS_KEY', ''), self.assertRaises(HTTPException) as error:
            await self.storage.upload_file(['avatars', str(uuid4())], 'a.png', b'x')
        self.assertEqual(error.exception.status_code, 503)
        self.assertIn('R2_SECRET_ACCESS_KEY', error.exception.detail)

    async def test_upload_failure_does_not_leak_upstream_details(self):
        self.storage._r2 = Mock()
        self.storage._r2.put_object.side_effect = RuntimeError('test-secret upstream error')
        with self.assertRaises(HTTPException) as error:
            await self.storage.upload_file(['avatars', str(uuid4())], 'a.png', b'x')
        self.assertEqual(error.exception.status_code, 502)
        self.assertNotIn('test-secret', error.exception.detail)

    async def test_storage_is_lazy_until_upload_or_download(self):
        with patch.object(settings, 'R2_SECRET_ACCESS_KEY', ''):
            storage = FileStorageService()
        self.assertIsNone(storage._r2)
        self.assertEqual(storage.provider, 'r2')

    async def test_route_never_signs_unauthorized_file_but_public_assets_work_without_login(self):
        auth = SimpleNamespace(get_current_user=AsyncMock(side_effect=HTTPException(401, 'Login required')))
        cached = StorageCache().write('public/avatars/user/a.png', [b'PNG bytes'], 'image/png')
        storage = SimpleNamespace(signed_download_url=AsyncMock(return_value='https://r2.example/signed'), cached_download=AsyncMock(return_value=cached))
        app = FastAPI()
        app.include_router(router, prefix='/api/v1')
        app.dependency_overrides[AuthorizationService] = lambda: auth
        app.dependency_overrides[get_session] = lambda: Mock()
        app.dependency_overrides[get_file_storage_service] = lambda: storage
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            private = await client.get(f'/api/v1/storage/urls/private/users/{uuid4()}/tutor-chat/2026/11/images/a.png')
            self.assertEqual(private.status_code, 401)
            storage.signed_download_url.assert_not_awaited()
            public = await client.get('/api/v1/storage/files/public/avatars/user/a.png')
            self.assertEqual(public.status_code, 200)
            self.assertEqual(public.content, b'PNG bytes')
            self.assertIn('public', public.headers['cache-control'])
            self.assertNotIn('location', public.headers)
            conditional = await client.get('/api/v1/storage/files/public/avatars/user/a.png', headers={'If-None-Match':public.headers['etag']})
            self.assertEqual(conditional.status_code, 304)
            denied = await client.get(f'/api/v1/storage/files/private/users/{uuid4()}/tutor-chat/2026/11/images/a.png')
            self.assertEqual(denied.status_code, 401)
            self.assertEqual(storage.cached_download.await_count, 2)

    async def test_private_chat_image_only_accessible_by_owner(self):
        owner = uuid4()
        auth = SimpleNamespace(get_current_user=AsyncMock(return_value=SimpleNamespace(id=owner)))
        await authorize_file(f'private/users/{owner}/tutor-chat/2026/11/images/a.png', auth, Mock())
        with self.assertRaises(HTTPException) as error:
            await authorize_file(f'private/users/{uuid4()}/tutor-chat/2026/11/images/a.png', auth, Mock())
        self.assertEqual(error.exception.status_code, 403)

    async def test_course_resource_requires_matching_course_and_active_enrollment(self):
        user_id, course_id, lesson_id = uuid4(), uuid4(), uuid4()
        auth = SimpleNamespace(get_current_user=AsyncMock(return_value=SimpleNamespace(id=user_id)))
        course = SimpleNamespace(id=course_id, instructor_id=uuid4())
        lesson = SimpleNamespace(id=lesson_id, course_id=course_id, is_preview=False)
        db = SimpleNamespace(get=AsyncMock(side_effect=lambda model, _: course if model is Courses else lesson),
                             scalar=AsyncMock(return_value=None))
        key = f'private/courses/{course_id}/lessons/{lesson_id}/resources/documents/a.pdf'
        with self.assertRaises(HTTPException) as error:
            await authorize_file(key, auth, db)
        self.assertEqual(error.exception.status_code, 403)
        db.scalar.return_value = uuid4()
        await authorize_file(key, auth, db)
        lesson.course_id = uuid4()
        with self.assertRaises(HTTPException):
            await authorize_file(key, auth, db)

    async def test_invalid_keys_and_path_traversal_are_rejected(self):
        for key in ['public/../private/a.png', '/public/a.png', 'public//a.png']:
            with self.assertRaises(HTTPException):
                await authorize_file(key, Mock(), Mock())


class StorageTreeTests(unittest.TestCase):
    def test_tree_groups_files_by_owner_and_purpose(self):
        user, course, lesson = str(uuid4()), str(uuid4()), str(uuid4())
        asset = 'a' * 32
        cases = [
            (['avatars', user], 'Avatar.PNG', 'public/users/' + user + '/avatars/'),
            (['courses', course, 'thumbnails'], 'thumb.jpg', f'public/courses/{course}/thumbnails/'),
            (['courses', course, 'lessons', lesson, 'resources'], 'Tài liệu.pdf', f'private/courses/{course}/lessons/{lesson}/resources/documents/'),
            (['courses', course, 'lessons', lesson, 'resources'], 'Bài tập.zip', f'private/courses/{course}/lessons/{lesson}/resources/archives/'),
            (['notes', user, lesson], 'ảnh.png', f'private/users/{user}/lessons/{lesson}/notes/attachments/images/'),
        ]
        for parts, name, expected in cases:
            key = FileStorageService.object_key(parts, name, asset_id=asset)
            self.assertTrue(key.startswith(expected), key)
            self.assertIn(asset + '-', key)
            self.assertTrue(key.isascii())
        chat = FileStorageService.object_key(['tutor_chat', user], 'chat.png', asset_id=asset)
        self.assertRegex(chat, rf'^private/users/{user}/tutor-chat/\d{{4}}/\d{{2}}/images/')
        editor = FileStorageService.object_key(['shares/USER', user], 'image.png', asset_id=asset)
        self.assertRegex(editor, rf'^public/users/{user}/editor/\d{{4}}/\d{{2}}/images/')

    def test_filename_is_clean_without_double_identifiers(self):
        source = 'a' * 32 + '_6e3d1bc1-4e96-45f4-993c-e9065af9094a_Đặng Văn - Ảnh.PNG'
        self.assertEqual(FileStorageService.clean_filename(source), 'dang-van-anh.png')
        self.assertEqual(FileStorageService.clean_filename('../../Tài liệu.pdf'), 'tai-lieu.pdf')

    def test_unknown_upload_purposes_cannot_scatter_objects_in_bucket(self):
        for parts in [['random', 'folder'], ['avatars', '..'], ['users', 'id', 'anything']]:
            with self.assertRaises(ValueError):
                FileStorageService.object_key(parts, 'image.png')
