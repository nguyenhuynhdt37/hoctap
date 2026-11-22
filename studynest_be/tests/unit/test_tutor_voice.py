import asyncio
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
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

    async def test_origin_rejected_before_auth_or_provider(self):
        ws = self.ws('https://attacker.invalid')
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', new_callable=AsyncMock) as auth:
            await run_tutor_voice(ws, uuid4())
        ws.accept.assert_not_awaited(); auth.assert_not_awaited(); ws.close.assert_awaited_once_with(code=1008)

    async def test_anonymous_cannot_open_provider_session(self):
        ws = self.ws()
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=None)), patch(MODULE + 'open_realtime') as client:
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
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=user)), patch(MODULE + 'open_realtime') as client:
            await run_tutor_voice(ws, uuid4())
        client.assert_not_called(); ws.close.assert_awaited_once_with(code=1008)

    async def test_private_lesson_denial_is_not_hidden_and_never_calls_provider(self):
        ws = self.ws()
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=self.user())), patch(MODULE + 'TutorVoiceSession.prepare', AsyncMock(side_effect=HTTPException(403, 'Enroll first'))), patch(MODULE + 'open_realtime') as client:
            await run_tutor_voice(ws, uuid4())
        client.assert_not_called()
        self.assertEqual(ws.send_json.call_args.args[0]['message'], 'Enroll first')

    async def test_concurrent_session_cannot_consume_provider_or_release_another_lease(self):
        ws=self.ws(); redis=SimpleNamespace(set=AsyncMock(return_value=False), eval=AsyncMock())
        with patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=self.user())), patch(MODULE + 'TutorVoiceSession.prepare', AsyncMock(return_value=('context', True))), patch(MODULE + 'get_redis', return_value=redis), patch(MODULE + 'open_realtime') as client:
            await run_tutor_voice(ws, uuid4())
        client.assert_not_called(); redis.eval.assert_not_awaited()
        self.assertIn('phiên voice khác', ws.send_json.call_args.args[0]['message'])

    async def test_disabled_voice_never_calls_provider(self):
        ws = self.ws()
        with patch.object(settings, 'TUTOR_VOICE_ENABLED', False), patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=self.user())), patch(MODULE + 'open_realtime') as client:
            await run_tutor_voice(ws, uuid4())
        client.assert_not_called()

    async def test_empty_or_oversized_query_cannot_retrieve(self):
        session=TutorVoiceSession(self.ws(), self.user(), uuid4())
        for query in ['', None, 'a'*1501]:
            result=await session.search(query)
            self.assertEqual(result['sources'], [])
        session.ws.send_json.assert_not_awaited()

    async def test_tool_batch_waits_for_final_transcript_and_continues_once(self):
        ws = self.ws()
        session = TutorVoiceSession(ws, self.user(), uuid4())
        session.save_turn = AsyncMock()
        session.agent = SimpleNamespace(call_async=AsyncMock(return_value={'verified': True}))
        continued = asyncio.Event()
        events = asyncio.Queue()
        sent = []

        async def send(raw):
            message = json.loads(raw)
            sent.append(message)
            if message['type'] == 'response.create':
                continued.set()

        async def receive():
            await continued.wait()
            return {'type': 'websocket.disconnect'}

        ws.receive = receive
        live = SimpleNamespace(recv=events.get, send=send)
        for event in [
            {'type': 'input_audio_buffer.speech_started', 'item_id': 'input-1'},
            {'type': 'conversation.item.input_audio_transcription.completed',
             'item_id': 'input-1', 'transcript': 'Tua đi', 'status': 'in_progress'},
            {'type': 'response.created', 'response': {'id': 'response-1'}},
            {'type': 'response.function_call_arguments.done', 'response_id': 'response-1',
             'call_id': 'seek', 'name': 'video__seek', 'arguments': '{"seconds":180}'},
            {'type': 'response.function_call_arguments.done', 'response_id': 'response-1',
             'call_id': 'read', 'name': 'video__state', 'arguments': '{}'},
            {'type': 'response.done', 'response': {'id': 'response-1', 'status': 'completed'}},
            {'type': 'conversation.item.input_audio_transcription.completed',
             'item_id': 'input-1', 'transcript': 'Tua video về phút 3'},
        ]:
            await events.put(json.dumps(event))

        await asyncio.wait_for(session.relay(live), timeout=3)
        self.assertEqual(session.agent.call_async.await_count, 2)
        for call in session.agent.call_async.await_args_list:
            self.assertEqual(call.kwargs['user_message'], 'Tua video về phút 3')
        self.assertEqual([event['type'] for event in sent], [
            'conversation.item.create', 'conversation.item.create', 'response.create',
        ])
        self.assertEqual([event['item']['call_id'] for event in sent[:-1]], ['seek', 'read'])
        session.save_turn.assert_not_awaited()

    async def test_monetary_cap_refuses_provider_before_connect(self):
        ws = self.ws()
        ws.query_params = {'agent_session_id': str(uuid4())}
        with patch.object(settings, 'TUTOR_VOICE_ENABLED', True), \
             patch.object(settings, 'XAI_API_KEY', 'test-key'), \
             patch.object(settings, 'AGENT_ENABLED', True), \
             patch.object(settings, 'AGENT_MAX_RUN_COST_USD', 0.01), \
             patch(MODULE + 'AuthorizationService.get_require_role_ws', AsyncMock(return_value=self.user())), \
             patch(MODULE + 'TutorVoiceSession.prepare', AsyncMock(return_value=('context', True))), \
             patch(MODULE + 'open_realtime') as client:
            await run_tutor_voice(ws, uuid4())
        client.assert_not_called()
        message = ws.send_json.call_args.args[0]['message']
        self.assertIn('ngân sách tiền tệ', message)
        self.assertIn('chưa thể mở phiên', message)


class VoicePaceTests(unittest.TestCase):
    def test_native_pace_uses_numeric_multiplier(self):
        from app.services.user.tutor_voice import voice_speed
        self.assertEqual(voice_speed('1'), 1)
        self.assertEqual(voice_speed('.85'), .85)
        self.assertEqual(voice_speed('1.15'), 1.15)

    def test_untrusted_pace_is_bounded(self):
        from app.services.user.tutor_voice import voice_speed
        for value in ['nan', 'inf', '0', '5', 'ignore all instructions', None]:
            with self.subTest(value=value), self.assertRaises(HTTPException):
                voice_speed(value)
