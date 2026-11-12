"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLatestAccessToken } from "@/lib/utils/fetcher/client/refresh-session";
import type { MessageSource } from "@/types/user/tutor-chat";

export type VoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "ended" | "error";
export interface VoiceTurn { role: "user" | "assistant"; content: string; sources?: MessageSource[] }
interface Resources {
  ws?: WebSocket;
  context?: AudioContext;
  stream?: MediaStream;
  recorder?: AudioWorkletNode;
  analyser?: AnalyserNode;
  raf?: number;
  playback: Set<AudioBufferSourceNode>;
  nextPlay: number;
  ready: boolean;
  muted: boolean;
  stopped: boolean;
}
const empty = (): Resources => ({ playback: new Set(), nextPlay: 0, ready: false, muted: false, stopped: false });

export function useLessonVoice(lessonId: string, accessToken?: string) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [canRead, setCanRead] = useState<boolean | null>(null);
  const [threadId, setThreadId] = useState<string>();
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [draft, setDraft] = useState({ user: "", assistant: "" });
  const [sources, setSources] = useState<MessageSource[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const resources = useRef<Resources>(empty());
  const stateRef = useRef<VoiceState>("idle");
  const draftRef = useRef({ user: "", assistant: "" });
  const setStatus = useCallback((s: VoiceState) => { stateRef.current = s; setState(s); }, []);

  const clearPlayback = useCallback((r: Resources) => {
    for (const node of r.playback) { try { node.stop(); } catch { /* already stopped */ } }
    r.playback.clear();
    r.nextPlay = r.context?.currentTime ?? 0;
  }, []);

  const cleanup = useCallback((r: Resources) => {
    r.stopped = true; r.ready = false;
    if (r.raf !== undefined) cancelAnimationFrame(r.raf);
    r.stream?.getTracks().forEach(t => t.stop());
    r.recorder?.disconnect();
    clearPlayback(r);
    if (r.ws?.readyState === WebSocket.OPEN) r.ws.send(JSON.stringify({ type: "stop" }));
    r.ws?.close();
    if (r.context && r.context.state !== "closed") void r.context.close();
  }, [clearPlayback]);

  const stop = useCallback(() => {
    cleanup(resources.current);
    setStatus("ended"); setLevel(0); setMuted(false);
  }, [cleanup, setStatus]);

  useEffect(() => () => cleanup(resources.current), [lessonId, cleanup]);
  useEffect(() => {
    if (!["listening", "thinking", "speaking"].includes(state)) return;
    const timer = window.setInterval(() => setElapsed(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  const start = useCallback(async () => {
    cleanup(resources.current);
    const r = empty(); resources.current = r;
    setStatus("connecting"); setError(""); setMuted(false); setElapsed(0);
    setTurns([]); setSources([]); setCanRead(null);
    draftRef.current = { user: "", assistant: "" }; setDraft(draftRef.current);
    const fail = (message: string) => {
      if (r.stopped) return;
      cleanup(r); setError(message); setStatus("error"); setLevel(0);
    };
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
        throw new Error("Trình duyệt cần hỗ trợ micro và Web Audio. Hãy mở trang bằng HTTPS hoặc localhost.");
      }
      if (!accessToken) throw new Error("Vui lòng đăng nhập lại để sử dụng voice.");
      // Resume inside the user gesture; microphone acquisition may open a permission prompt.
      const context = new AudioContext(); r.context = context;
      await context.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1,
      } });
      if (r.stopped) { stream.getTracks().forEach(t => t.stop()); return; }
      r.stream = stream;
      const mic = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser(); analyser.fftSize = 256; r.analyser = analyser;
      mic.connect(analyser);
      await context.audioWorklet.addModule("/audio/tutor-recorder.js");
      if (r.stopped) return;
      const recorder = new AudioWorkletNode(context, "tutor-recorder"); r.recorder = recorder;
      mic.connect(recorder);
      const silence = context.createGain(); silence.gain.value = 0;
      recorder.connect(silence).connect(context.destination);
      const base = process.env.NEXT_PUBLIC_URL_BACKEND_WS || "ws://127.0.0.1:8000";
      const url = new URL(`${base.replace(/\/$/, "")}/api/v1/tutor-chat/lessons/${lessonId}/voice`);
      const token = getLatestAccessToken(accessToken) || accessToken;
      const ws = new WebSocket(url, ["studynest-voice", `bearer.${token}`]); r.ws = ws;
      let setupTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => fail("Kết nối voice quá lâu. Vui lòng thử lại."), 20000);
      recorder.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (!r.stopped && r.ready && !r.muted && ws.readyState === WebSocket.OPEN) {
          if (ws.bufferedAmount > 64000) { fail("Kết nối mạng không theo kịp âm thanh. Vui lòng kết nối lại."); return; }
          ws.send(event.data);
        }
      };
      ws.onmessage = (event) => {
        if (r.stopped) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === "ready") {
            clearTimeout(setupTimer); setupTimer = undefined;
            r.ready = true; setCanRead(message.can_read_lesson); setThreadId(message.thread_id);
            setStatus("listening");
          } else if (message.type === "audio") {
            const bytes = Uint8Array.from(atob(message.data), c => c.charCodeAt(0));
            const view = new DataView(bytes.buffer);
            const buffer = context.createBuffer(1, bytes.length / 2, message.sample_rate || 24000);
            const channel = buffer.getChannelData(0);
            for (let i = 0; i < channel.length; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
            if (r.nextPlay - context.currentTime > 45) { fail("Câu trả lời voice quá dài. Hãy thử hỏi ngắn hơn."); return; }
            const node = context.createBufferSource(); node.buffer = buffer;
            node.connect(context.destination);
            node.connect(analyser);
            r.playback.add(node);
            const when = Math.max(context.currentTime + 0.015, r.nextPlay);
            node.start(when); r.nextPlay = when + buffer.duration;
            node.onended = () => {
              r.playback.delete(node);
              if (!r.stopped && r.playback.size === 0 && stateRef.current === "speaking") setStatus("listening");
            };
            setStatus("speaking");
          } else if (message.type === "interrupted") {
            clearPlayback(r); setStatus("listening");
          } else if (message.type === "retrieving") setStatus("thinking");
          else if (message.type === "sources") setSources(message.sources || []);
          else if (message.type === "transcript") {
            const role = message.role as "user" | "assistant";
            if (!["user", "assistant"].includes(role)) return;
            draftRef.current = { ...draftRef.current, [role]: draftRef.current[role] + message.delta };
            setDraft(draftRef.current);
          } else if (message.type === "turn") {
            setTurns(previous => [...previous,
              ...(message.user ? [{ role: "user" as const, content: message.user }] : []),
              ...(message.assistant ? [{ role: "assistant" as const, content: message.assistant, sources: message.sources }] : []),
            ]);
            draftRef.current = { user: "", assistant: "" }; setDraft(draftRef.current);
            setSources([]);
          } else if (message.type === "listening") {
            if (r.playback.size === 0) setStatus("listening");
          } else if (message.type === "error" || message.error) {
            fail(message.message || message.error || "Không thể mở voice.");
          } else if (message.type === "ended") {
            clearTimeout(setupTimer); cleanup(r); setStatus("ended"); setError(message.message || "");
          }
        } catch { fail("Không đọc được phản hồi voice. Vui lòng thử lại."); }
      };
      ws.onerror = () => fail("Không kết nối được voice. Kiểm tra mạng và thử lại.");
      ws.onclose = () => {
        clearTimeout(setupTimer);
        if (!r.stopped) fail("Phiên voice đã ngắt kết nối. Bạn có thể bắt đầu lại.");
      };
      const values = new Float32Array(analyser.fftSize);
      let lastPaint = 0;
      const animate = (timestamp = 0) => {
        if (r.stopped) return;
        if (timestamp - lastPaint < 40) { r.raf = requestAnimationFrame(animate); return; }
        lastPaint = timestamp;
        analyser.getFloatTimeDomainData(values);
        const rms = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
        setLevel(r.muted && stateRef.current !== "speaking" ? 0 : Math.min(1, rms * 8));
        r.raf = requestAnimationFrame(animate);
      };
      animate();
    } catch (err) {
      const e = err as DOMException;
      fail(e.name === "NotAllowedError" ? "Bạn chưa cho phép dùng micro. Hãy cấp quyền micro rồi thử lại."
        : e.name === "NotFoundError" ? "Không tìm thấy micro. Hãy kết nối micro rồi thử lại."
        : e.message || "Không thể mở voice.");
    }
  }, [accessToken, lessonId, cleanup, clearPlayback, setStatus]);

  const toggleMute = useCallback(() => {
    const r = resources.current;
    r.muted = !r.muted; setMuted(r.muted);
    r.stream?.getAudioTracks().forEach(track => { track.enabled = !r.muted; });
    if (r.muted && r.ready && r.ws?.readyState === WebSocket.OPEN) r.ws.send(JSON.stringify({ type: "audio_end" }));
  }, []);

  return { state, error, muted, level, canRead, threadId, turns, draft, sources, elapsed, start, stop, toggleMute };
}
