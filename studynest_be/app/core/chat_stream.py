"""SSE transport shared by conversational APIs."""

import asyncio
import json
import logging
import re

from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)


def partial_json_content(buffer: str) -> str:
    """Decode a complete prefix of the tutor's JSON content string."""
    match = re.search(r'"content"\s*:\s*"', buffer)
    if not match:
        return ""
    value = buffer[match.end():]
    index = 0
    while index < len(value):
        if value[index] == '"':
            break
        if value[index] == "\\":
            if index + 1 >= len(value):
                break
            if value[index + 1] == "u":
                if index + 6 > len(value):
                    break
                index += 6
                continue
            index += 2
            continue
        index += 1
    try:
        decoded = json.loads('"' + value[:index] + '"')
        # A surrogate pair may be split across two upstream chunks.
        if decoded and 0xD800 <= ord(decoded[-1]) <= 0xDBFF:
            decoded = decoded[:-1]
        return decoded
    except ValueError:
        return ""


def chat_stream_response(work):
    """Run a producer with backpressure; cancel it when the client disconnects."""
    async def events():
        queue = asyncio.Queue(maxsize=64)

        async def on_delta(delta):
            await queue.put({"type": "delta", "delta": delta})

        async def produce():
            try:
                result = await work(on_delta)
                await queue.put({"type": "done", "data": result})
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("Chat stream failed (%s)", type(exc).__name__)
                await queue.put({"type": "error", "message": "Không thể hoàn tất câu trả lời. Vui lòng thử lại."})

        task = asyncio.create_task(produce())
        try:
            yield ': connected\n\n'
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=10)
                except TimeoutError:
                    yield ': keepalive\n\n'
                    continue
                yield "data: " + json.dumps(event, ensure_ascii=False) + "\n\n"
                if event["type"] in {"done", "error"}:
                    break
        finally:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    return StreamingResponse(events(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no",
    })
