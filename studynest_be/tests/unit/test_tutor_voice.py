import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

from fastapi import HTTPException

from app.core.settings import settings
from app.services.user.tutor_voice import AudioBudget, TutorVoiceSession, origin_allowed, run_tutor_voice

MODULE = 'app.services.user.tutor_voice.'

class VoiceProtocolTests(unittest.TestCase):
    def test_origin_is_exact_not_prefix_or_suffix(self):
        with patch.multiple(settings, TUTOR_VOICE_ORIGINS='https://learn.example', FRONTEND_URL='https://app.example/course'):
            self.assertTrue(origin_allowed('https://learn.example'))
            self.assertTrue(origin_allowed('https://app.example'))
            self.assertFalse(origin_allowed('https://learn.example.attacker.test'))
            self.assertFalse(origin_allowed('https://other.example'))
            self.assertTrue(origin_allowed(None))

    def test_audio_frames_are_pcm16_and_size_bounded(self):
        for n in [0, 1, 16385, 64000]:
            with self.subTest(size=n), self.assertRaises(ValueError):
                AudioBudget().consume(n)
        AudioBudget().consume(3200)

    def test_audio_rate_cannot_exceed_real_time_plus_jitter(self):
        with patch(MODULE + 'time.monotonic', return_value=10):
            budget = AudioBudget()
            for _ in range(4):
                budget.consume(16000)
            with self.assertRaises(ValueError):
                budget.consume(2)
        with patch(MODULE + 'time.monotonic', return_value=11):
            budget.consume(16000)


class VoiceAuthorizationTests(unittest.IsolatedAsyncioTestCase):
    def ws(self, origin='http://localhost:3000'):
        # Mimic Starlette's cached Headers retaining the original list.
        from starlette.datastructures import Headers
        scope = {'headers': [(b'origin', origin.encode())], 'subprotocols': ['studynest-voice', 'bearer.test-token']}
        return SimpleNamespace(scope=scope, headers=Headers(scope=scope),
            accept=AsyncMock(), send_json=AsyncMock(), close=AsyncMock())

    def user(self, **kwargs):
        return SimpleNamespace(id=uuid4(), is_banned=False, deleted_at=None, **kwargs)

    async def test_origin_rejected_before_auth_or_google(self):
        ws = self.ws('https://attacker.invalid')
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', new_callable=AsyncMock) as auth:
            await run_tutor_voice(ws, uuid4())
        ws.accept.assert_not_awaited(); auth.assert_not_awaited(); ws.close.assert_awaited_once_with(code=1008)

    async def test_anonymous_cannot_open_google_session(self):
        ws = self.ws()
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=None)), patch(MODULE + 'genai.Client') as client:
            await run_tutor_voice(ws, uuid4())
        client.assert_not_called()

    async def test_protocol_token_reaches_cached_auth_headers_without_url_token(self):
        ws = self.ws()
        async def auth(socket, roles):
            self.assertEqual(socket.headers.get('authorization'), 'Bearer test-token')
            self.assertEqual(roles, ['USER', 'LECTURER', 'ADMIN'])
            return None
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', auth):
            await run_tutor_voice(ws, uuid4())
        ws.accept.assert_awaited_once_with(subprotocol='studynest-voice')

    async def test_banned_account_cannot_use_provider(self):
        ws, user = self.ws(), self.user(); user.is_banned=True
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=user)), patch(MODULE + 'genai.Client') as client:
            await run_tutor_voice(ws, uuid4())
        client.assert_not_called(); ws.close.assert_awaited_once_with(code=1008)

    async def test_private_lesson_denial_is_not_hidden_and_never_calls_provider(self):
        ws = self.ws()
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=self.user())), patch(MODULE + 'TutorVoiceSession.prepare', AsyncMock(side_effect=HTTPException(403, 'Enroll first'))), patch(MODULE + 'genai.Client') as client:
            await run_tutor_voice(ws, uuid4())
        client.assert_not_called()
        self.assertEqual(ws.send_json.call_args.args[0]['message'], 'Enroll first')

    async def test_concurrent_session_cannot_consume_provider_or_release_another_lease(self):
        ws=self.ws(); redis=SimpleNamespace(set=AsyncMock(return_value=False), eval=AsyncMock())
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=self.user())), patch(MODULE + 'TutorVoiceSession.prepare', AsyncMock(return_value=('context', True))), patch(MODULE + 'get_redis', return_value=redis), patch(MODULE + 'genai.Client') as client:
            await run_tutor_voice(ws, uuid4())
        client.assert_not_called(); redis.eval.assert_not_awaited()
        self.assertIn('phiên voice khác', ws.send_json.call_args.args[0]['message'])

    async def test_disabled_voice_never_calls_provider(self):
        ws = self.ws()
        with patch.object(settings, 'TUTOR_VOICE_ENABLED', False), patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=self.user())), patch(MODULE + 'genai.Client') as client:
            await run_tutor_voice(ws, uuid4())
        client.assert_not_called()

    async def test_empty_or_oversized_query_cannot_retrieve(self):
        session=TutorVoiceSession(self.ws(), self.user(), uuid4())
        for query in ['', None, 'a'*1501]:
            result=await session.search(query)
            self.assertEqual(result['sources'], [])
        session.ws.send_json.assert_not_awaited()
