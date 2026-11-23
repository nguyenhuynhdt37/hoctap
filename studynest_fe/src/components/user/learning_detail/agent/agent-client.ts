import { authedFetch } from '@/lib/utils/fetcher/client/axios';
import type { AgentEvent } from './contracts';

/** Reconnect only the read-only event stream; never resubmit a mutation to recover it. */
export async function consumeAgentEvents(runId: string, onEvent: (event: AgentEvent) => Promise<void>, signal: AbortSignal) {
  let sequence = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await authedFetch(`/api/agent/runs/${encodeURIComponent(runId)}/events?after=${sequence}`, {
      signal, headers: { Accept: 'text/event-stream' },
    });
    if (!response.ok || !response.body) throw new Error('Không kết nối được tiến trình Mây Mây.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
        let end: number;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
          const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
          if (!data) continue;
          const event = JSON.parse(data) as AgentEvent;
          if (event.schema_version !== 1 || event.run_id !== runId || !Number.isSafeInteger(event.sequence) || typeof event.type !== 'string' || !event.payload || typeof event.payload !== 'object') throw new Error('Sự kiện agent không hợp lệ.');
          if (event.sequence <= sequence) continue;
          if (event.sequence !== sequence + 1) throw new Error('Luồng trạng thái bị thiếu sự kiện. Hãy tải lại lịch sử.');
          sequence = event.sequence;
          await onEvent(event);
          if (['run.completed', 'run.partially_completed', 'run.cancelled', 'run.failed', 'run.expired'].includes(event.type)) return;
        }
        if (done) break;
      }
    } catch (error) {
      if (signal.aborted || !(error instanceof TypeError) || attempt === 2) throw error;
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    if (signal.aborted) throw new DOMException('Đã hủy', 'AbortError');
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 500));
  }
  throw new Error('Kết nối bị gián đoạn. Hãy tải lại lịch sử để kiểm tra kết quả trước khi thử lại.');
}
