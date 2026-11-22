'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/utils/fetcher/client/axios';
import { dictationDraft, transcriptEvent, dictationSocketUrl } from './dictation-text';

type State = 'idle' | 'requesting' | 'recording' | 'finishing';
type Capture = {
  phase: State; base: string; text: string; seq: number; disposed: boolean;
  ws?: WebSocket; context?: AudioContext; stream?: MediaStream; source?: MediaStreamAudioSourceNode;
  processor?: AudioWorkletNode; gain?: GainNode; controller: AbortController;
  setup?: ReturnType<typeof setTimeout>; duration?: ReturnType<typeof setTimeout>;
  drain?: ReturnType<typeof setTimeout>; flush?: ReturnType<typeof setTimeout>; flushEnd?: () => void;
};
function stopTracks(capture: Capture) {
  capture.stream?.getTracks().forEach(track => { track.onended = null; try { track.stop(); } catch { /* device already gone */ } });
  try { capture.source?.disconnect(); } catch { /* already disconnected */ }
}
function releaseAudio(capture: Capture) {
  stopTracks(capture);
  if (capture.processor) { capture.processor.port.onmessage = null; try { capture.processor.disconnect(); capture.processor.port.close(); } catch { /* context already gone */ } }
  capture.processor = undefined;
  try { capture.gain?.disconnect(); } catch { /* already disconnected */ }
  if (capture.context && capture.context.state !== 'closed') { capture.context.onstatechange = null; void capture.context.close().catch(() => undefined); }
}

export function useDictation(getValue: () => string, onValueChange: (text: string) => void) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const current = useRef<Capture | null>(null);
  const mounted = useRef(true);
  const handlers = useRef({ getValue, onValueChange }); handlers.current = { getValue, onValueChange };
  const isCurrent = useCallback((capture: Capture) => mounted.current && current.current === capture && !capture.disposed, []);
  const finish = useCallback((capture: Capture, message = '') => {
    if (capture.disposed) return;
    const owner = current.current === capture;
    capture.disposed = true;
    [capture.setup, capture.duration, capture.drain, capture.flush].forEach(timer => { if (timer) clearTimeout(timer); });
    capture.controller.abort(); releaseAudio(capture);
    if (capture.ws) { capture.ws.onclose = null; capture.ws.onmessage = null; capture.ws.onerror = null; try { capture.ws.close(); } catch { /* already closed */ } }
    if (owner) { current.current = null; if (mounted.current) { setState('idle'); if (message) setError(message); } }
  }, []);
  const stop = useCallback(() => {
    const capture = current.current;
    if (!capture || capture.phase === 'finishing') return;
    if (capture.phase === 'requesting') { finish(capture); return; }
    capture.phase = 'finishing'; setState('finishing');
    if (capture.duration) clearTimeout(capture.duration);
    stopTracks(capture); // Privacy: microphone stops immediately, before provider finalization.
    let flushed = false;
    capture.flushEnd = () => {
      if (flushed || !isCurrent(capture)) return;
      flushed = true;
      if (capture.flush) clearTimeout(capture.flush);
      releaseAudio(capture);
      if (capture.ws?.readyState === WebSocket.OPEN) capture.ws.send(JSON.stringify({ type: 'stop' }));
      else { finish(capture, 'Mất kết nối nhận dạng. Phần chữ đã nhận vẫn được giữ.'); return; }
      capture.drain = setTimeout(() => finish(capture, 'Chưa nhận được phần chốt cuối. Phần chữ đã nhận vẫn được giữ; bạn có thể sửa hoặc bật mic lại.'), 5500);
    };
    capture.processor?.port.postMessage({ type: 'flush' });
    capture.flush = setTimeout(capture.flushEnd, 200);
  }, [finish, isCurrent]);
  useEffect(() => {
    mounted.current = true;
    const leave = () => { if (current.current) finish(current.current); };
    window.addEventListener('pagehide', leave);
    return () => { mounted.current = false; window.removeEventListener('pagehide', leave); leave(); };
  }, [finish]);

  const start = useCallback(async () => {
    if (current.current) return;
    const capture: Capture = { phase: 'requesting', base: handlers.current.getValue(), text: '', seq: 0, disposed: false, controller: new AbortController() };
    current.current = capture; setError(''); setState('requesting');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorkletNode) throw new Error('Nhập giọng nói cần HTTPS và trình duyệt hỗ trợ AudioWorklet.');
      if (capture.base.length >= 12000) throw new Error('Ô chat đã đạt giới hạn 12.000 ký tự.');
      const context = new AudioContext(); capture.context = context;
      await context.resume();
      if (!isCurrent(capture)) { releaseAudio(capture); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      if (!isCurrent(capture)) { stream.getTracks().forEach(track => track.stop()); return; }
      capture.stream = stream;
      stream.getTracks().forEach(track => { track.onended = () => finish(capture, 'Micro đã bị ngắt. Phần chữ đã nhận vẫn được giữ.'); });
      capture.setup = setTimeout(() => finish(capture, 'Kết nối nhận dạng quá lâu. Bạn có thể bật mic lại.'), 20000);
      await context.audioWorklet.addModule('/audio/tutor-recorder.js?v=3');
      if (!isCurrent(capture)) return;
      const { data } = await api.post<{ ticket: string }>('/agent/dictation-ticket', {}, { signal: capture.controller.signal });
      if (!isCurrent(capture)) return;
      const url = dictationSocketUrl(process.env.NEXT_PUBLIC_URL_BACKEND_WS || process.env.NEXT_PUBLIC_URL_BACKEND, window.location.origin);
      const socket = new WebSocket(url, ['studynest-dictation', `ticket.${data.ticket}`]);
      capture.ws = socket;
      socket.onerror = () => { if (isCurrent(capture)) finish(capture, 'Không kết nối được nhận dạng giọng nói. Phần chữ đã nhận vẫn được giữ.'); };
      socket.onclose = () => { if (isCurrent(capture)) finish(capture, 'Kết nối nhận dạng đã đóng. Phần chữ đã nhận vẫn được giữ; bạn có thể bật mic lại.'); };
      socket.onmessage = event => {
        if (!isCurrent(capture)) return;
        try {
          if (typeof event.data !== 'string' || event.data.length > 64000) throw new Error('Phản hồi nhận dạng không hợp lệ.');
          const data = JSON.parse(event.data);
          if (data.type === 'ready') {
            if (capture.phase !== 'requesting' || data.sample_rate !== 16000) throw new Error('Phiên nhận dạng không hợp lệ.');
            if (capture.setup) clearTimeout(capture.setup);
            const processor = new AudioWorkletNode(context, 'tutor-recorder', { processorOptions: { threshold: .006 } }); capture.processor = processor;
            const source = context.createMediaStreamSource(stream); capture.source = source;
            const silence = context.createGain(); silence.gain.value = 0; capture.gain = silence;
            processor.port.onmessage = (frame: MessageEvent<ArrayBuffer | { type: string }>) => {
              if (!isCurrent(capture)) return;
              if (!(frame.data instanceof ArrayBuffer)) { if (frame.data?.type === 'flushed') capture.flushEnd?.(); return; }
              if (socket.readyState !== WebSocket.OPEN || socket.bufferedAmount > 64000) { finish(capture, 'Mạng không theo kịp âm thanh. Phần chữ đã nhận vẫn được giữ.'); return; }
              socket.send(frame.data);
            };
            source.connect(processor); processor.connect(silence).connect(context.destination);
            context.onstatechange = () => { if (isCurrent(capture) && capture.phase === 'recording' && context.state === 'suspended') finish(capture, 'Trình duyệt đã tạm dừng micro. Bạn có thể bật mic lại.'); };
            capture.phase = 'recording'; setState('recording');
            const seconds = Number.isFinite(data.max_seconds) ? Math.max(10, Math.min(300, data.max_seconds)) : 120;
            capture.duration = setTimeout(stop, seconds * 1000);
            return;
          }
          if (data.type === 'error') { finish(capture, typeof data.message === 'string' ? data.message.slice(0, 300) : 'Nhận dạng chưa hoàn tất.'); return; }
          const result = transcriptEvent(data, capture.seq);
          if (result) {
            capture.seq = result.seq; capture.text = result.text;
            handlers.current.onValueChange(dictationDraft(capture.base, result.text));
            if (capture.base.length + result.text.length >= 11999 && capture.phase === 'recording') stop();
          }
          if (data.type === 'complete') {
            if (!result) throw new Error('Phản hồi chốt giọng nói không hợp lệ.');
            const available = 12000 - capture.base.trimEnd().length - (capture.base.trimEnd() ? 1 : 0);
            finish(capture, result.text.trim().length > available ? 'Ô chat đã đạt giới hạn 12.000 ký tự; phần lời nói vượt giới hạn chưa được điền.' : result.text.trim() ? '' : 'Chưa nghe rõ lời nói. Bạn thử lại nhé.');
          }
        } catch (cause) { finish(capture, cause instanceof Error ? cause.message : 'Phản hồi nhận dạng không hợp lệ.'); }
      };
    } catch (cause) {
      if (!isCurrent(capture)) return;
      finish(capture, (cause as DOMException)?.name === 'NotAllowedError' ? 'Bạn cần cho phép dùng micro.' : cause instanceof Error ? cause.message : 'Chưa mở được micro.');
    }
  }, [finish, isCurrent, stop]);
  return { state, error, start, stop };
}
