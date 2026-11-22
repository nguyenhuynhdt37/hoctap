"""YouTube caption evidence: numeric time anchors come from the caption API only."""
import asyncio
import hashlib
import math
from dataclasses import dataclass

from fastapi import HTTPException
from youtube_transcript_api import YouTubeTranscriptApi


@dataclass(frozen=True)
class TranscriptSegment:
    start_seconds: int
    text: str

    @property
    def markdown(self):
        hours,remainder=divmod(self.start_seconds,3600)
        minutes,seconds=divmod(remainder,60)
        timestamp=f'{hours:02d}:{minutes:02d}:{seconds:02d}' if hours else f'{minutes:02d}:{seconds:02d}'
        return f'- `{timestamp}` {self.text}'


@dataclass(frozen=True)
class TranscriptEvidence:
    source_reference: str
    segments: tuple[TranscriptSegment,...]

    @property
    def content(self):return '\n'.join(s.markdown for s in self.segments)

    @property
    def content_hash(self):return hashlib.sha256(self.content.encode('utf-8')).hexdigest()

    def chunks(self,embedding,chunk_tokens=1000):
        """Keep caption boundaries. Text containing a fake time never adds an anchor."""
        groups=[];lines=[];anchors=[];tokens=0
        for segment in self.segments:
            # A single oversized caption can split, but retains its real API time.
            parts=embedding.split_text_by_tokens(segment.markdown,chunk_size=chunk_tokens,overlap=0)
            for part in parts:
                count=embedding.estimate_tokens(part)
                if lines and tokens+count>chunk_tokens:
                    groups.append(('\n'.join(lines),sorted(set(anchors))))
                    lines=[];anchors=[];tokens=0
                lines.append(part);anchors.append(segment.start_seconds);tokens+=count
        if lines:groups.append(('\n'.join(lines),sorted(set(anchors))))
        return groups


class YoutubeTranscriptService:
    async def fetch_transcript(self,video_id:str,lang_priority=('vi','en')):
        try:
            return await asyncio.to_thread(lambda:YouTubeTranscriptApi().fetch(video_id,languages=lang_priority))
        except Exception:
            raise HTTPException(503,'Không lấy được phụ đề thật của video; chưa có bằng chứng để lập chỉ mục.') from None

    @staticmethod
    def evidence_from_segments(video_id,transcript):
        segments=[]
        for item in transcript:
            start=float(item.start)
            if not math.isfinite(start) or start<0:
                raise HTTPException(502,'Phụ đề có mốc thời gian không hợp lệ.')
            text=str(item.text).strip().replace('\n',' ')
            if text:segments.append(TranscriptSegment(int(start),text))
        if not segments:raise HTTPException(404,'Không tìm thấy phụ đề cho video này.')
        return TranscriptEvidence(f'youtube:{video_id}',tuple(segments))

    @staticmethod
    def format_transcript_markdown(transcript):
        return YoutubeTranscriptService.evidence_from_segments('unknown',transcript).content

    async def extract_video_evidence(self,video_id):
        return self.evidence_from_segments(video_id,await self.fetch_transcript(video_id))

    async def extract_video_context(self,video_id):
        return (await self.extract_video_evidence(video_id)).content
