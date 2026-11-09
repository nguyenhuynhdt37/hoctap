import json
import unittest
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

from fastapi import HTTPException

from app.services.user.message_classifier import (
    is_casual_message,
    llm_classify_mode,
    rule_decide,
)
from app.services.user.tutor_chat_message import TutorChatMessageService


class TutorContextTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.lesson_id, self.thread_id, self.user_id = uuid4(), uuid4(), uuid4()
        self.lesson_title = 'Đàn Guitar Thùng - những điều cơ bản nhất cho người mới học'
        self.history = []
        result = Mock()
        result.scalars.return_value.all.side_effect = lambda: self.history
        self.db = SimpleNamespace(execute=AsyncMock(return_value=result), add=Mock(),
                                  flush=AsyncMock(), refresh=AsyncMock(), commit=AsyncMock())
        self.db.flush.side_effect = self.assign_ids
        self.thread_service = SimpleNamespace(
            get_thread_by_id=AsyncMock(return_value={'id': str(self.thread_id),
                'lesson_id': str(self.lesson_id), 'scope': 'lesson', 'title': 'Guitar'}),
            validate_lesson_access=AsyncMock(return_value={
                'lesson': SimpleNamespace(title=self.lesson_title, description='Đàn acoustic và classic', outcomes=[]),
                'course': SimpleNamespace(title='TỰ HỌC GUITAR CƠ BẢN')}),
        )
        self.classifier = SimpleNamespace(classify_message=AsyncMock(return_value={'mode': 'NO_SEARCH'}))
        self.service = TutorChatMessageService(db=self.db, thread_service=self.thread_service,
                    classifier_service=self.classifier, embedding_service=AsyncMock())
        self.source = {'chunk_id': str(uuid4()), 'lesson_id': str(self.lesson_id),
                       'lesson_title': self.lesson_title, 'chunk_index': 2, 'source_type': 'lesson',
                       'similarity': 0.84, 'content': 'Acoustic dùng dây kim loại; classic dùng dây nylon.'}
        self.service._rag_search = AsyncMock(return_value=[self.source])
        self.reply = json.dumps({'title': 'Guitar', 'content': 'Giải thích về guitar',
                                 'sources_used': [{'chunk_id': self.source['chunk_id'], 'summary': 'Các loại dây đàn'}]})
        self.service._call_llm = AsyncMock(return_value=self.reply)

    async def assign_ids(self):
        for call in self.db.add.call_args_list:
            row = call.args[0]
            if row.id is None:
                row.id = uuid4()
                row.created_at = datetime.now(UTC)

    def history_message(self, role, content, sources=None):
        return SimpleNamespace(role=role, content=content, sources=sources or [], tutor_chat_images=[])

    async def send(self, message, **kwargs):
        return await self.service.send_message(self.user_id, self.lesson_id, message, self.thread_id, **kwargs)

    async def test_greeting_keeps_lesson_identity_without_embedding(self):
        self.history = [self.history_message('assistant', 'Chào bạn, cùng học guitar nhé')]
        result = await self.send('hi')
        self.service._rag_search.assert_not_awaited()
        prompt = self.service._call_llm.call_args.args[0]
        self.assertIn(self.lesson_title, prompt)
        self.assertIn('TỰ HỌC GUITAR CƠ BẢN', prompt)
        self.assertIn('Chào bạn, cùng học guitar nhé', prompt)
        self.assertEqual(result['sources'], [])

    async def test_greeting_with_question_still_retrieves_even_if_classifier_says_no_search(self):
        result = await self.send('hi, giải thích hợp âm')
        self.service._rag_search.assert_awaited_once()
        prompt = self.service._call_llm.call_args.args[0]
        self.assertIn(self.source['content'], prompt)
        self.assertEqual(result['sources'][0]['lesson_id'], str(self.lesson_id))
        self.assertEqual(result['sources'][0]['source_type'], 'video')

    async def test_follow_up_fetches_original_passages_instead_of_citation_summary(self):
        self.classifier.classify_message.return_value = {'mode': 'REUSE'}
        # The DB query returns newest first.
        self.history = [self.history_message('assistant', 'Có hai loại dây đàn', [{'summary': 'summary only'}]),
                        self.history_message('user', 'Acoustic và classic khác nhau thế nào?')]
        await self.send('giải thích thêm phần đó')
        query = self.service._rag_search.call_args.kwargs['query']
        self.assertIn('Acoustic và classic khác nhau thế nào?', query)
        self.assertIn('giải thích thêm phần đó', query)
        self.assertIn(self.source['content'], self.service._call_llm.call_args.args[0])

    async def test_streaming_uses_the_same_context_and_persists_grounded_sources(self):
        async def stream(_llm, prompt, **kwargs):
            self.assertIn(self.lesson_title, prompt)
            self.assertIn(self.source['content'], prompt)
            for offset in range(0, len(self.reply), 9):
                yield self.reply[offset:offset + 9]
        on_delta = AsyncMock()
        with patch('app.core.llm.LLMService.stream_model', stream):
            result = await self.send('Phân biệt các loại dây đàn', on_delta=on_delta)
        self.assertEqual(''.join(call.args[0] for call in on_delta.call_args_list), result['content'])
        self.assertEqual(len(result['sources']), 1)
        self.db.commit.assert_awaited_once()

    async def test_thread_from_another_lesson_is_rejected_before_retrieval(self):
        self.thread_service.get_thread_by_id.return_value['lesson_id'] = str(uuid4())
        with self.assertRaises(HTTPException) as error:
            await self.send('hi')
        self.assertEqual(error.exception.status_code, 400)
        self.service._rag_search.assert_not_awaited()

    def test_citations_cannot_invent_or_override_retrieved_sources(self):
        citations = [{'chunk_id': 'invented'}, {'chunk_id': self.source['chunk_id'],
                     'lesson_id': 'wrong lesson', 'similarity': 1, 'summary': 'Dây đàn'}]
        grounded = self.service._ground_sources(citations, [self.source])
        self.assertEqual(len(grounded), 1)
        self.assertEqual(grounded[0]['lesson_id'], str(self.lesson_id))
        self.assertEqual(grounded[0]['similarity'], 0.84)
        self.assertNotIn('content', grounded[0])

    def test_casual_detection_requires_the_entire_message(self):
        self.assertTrue(is_casual_message('Hi!'))
        self.assertTrue(is_casual_message('cảm ơn nhé'))
        for message in ['hi, hợp âm là gì?', 'ok giải thích thêm', 'hợp âm hay là gì']:
            self.assertFalse(is_casual_message(message))
            self.assertNotEqual(rule_decide(message, True), 'NO_SEARCH')

    async def test_classifier_uses_existing_llm_api(self):
        llm = SimpleNamespace(call_model=AsyncMock(return_value='REUSE'))
        self.assertEqual(await llm_classify_mode('vậy sao', ['Dây nylon'], llm), 'REUSE')
        llm.call_model.assert_awaited_once()
