/** Snapshots replace only this capture session's draft; fragments are never appended twice. */
export function dictationDraft(base: string, transcript: string, limit = 12000) {
  return [base.trimEnd(), transcript.trim()].filter(Boolean).join(' ').slice(0, limit);
}

export function transcriptEvent(value: unknown, previous: number): { text: string; seq: number } | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Record<string, unknown>;
  if (!['transcript', 'complete'].includes(String(event.type)) || typeof event.text !== 'string' || event.text.length > 12000 || !Number.isSafeInteger(event.seq) || Number(event.seq) < previous) return null;
  // Replayed partial snapshots cannot roll the draft back; complete may reuse the final sequence.
  if (event.type === 'transcript' && Number(event.seq) === previous) return null;
  return { text: event.text, seq: Number(event.seq) };
}

export function dictationSocketUrl(configured: string | undefined, pageOrigin: string) {
  const url = new URL(configured || pageOrigin);
  if (url.protocol === 'https:') url.protocol = 'wss:';
  else if (url.protocol === 'http:') url.protocol = 'ws:';
  if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('Địa chỉ nhận dạng giọng nói không hợp lệ.');
  if (pageOrigin.startsWith('https:') && url.protocol !== 'wss:') throw new Error('Nhập giọng nói trên HTTPS cần kết nối WSS.');
  url.pathname = `${url.pathname.replace(/\/$/, '')}/api/v1/agent/dictation`;
  url.search = ''; url.hash = '';
  return url.toString();
}
