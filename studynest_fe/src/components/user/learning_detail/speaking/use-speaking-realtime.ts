"use client";

import { getDpopSocketBase } from "@/lib/auth/http";
import { isDpopMode } from "@/lib/auth/mode";
import {
  openAuthedWebSocket,
  takeInitialWebSocketMessage,
} from "@/lib/auth/ws";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { ActiveLessonSpeaking } from "@/types/user/activeLesson";
import { useCallback, useEffect, useRef, useState } from "react";

export type SpeakingCallState =
  | "idle"
  | "connecting"
  | "speaking"
  | "listening"
  | "ended"
  | "error";

export interface SpeakingTurnMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  translation?: string;
  grammarCorrection?: string;
  feedbackTip?: string;
  hasAudioCache?: boolean;
}

interface RealtimeResources {
  ws?: WebSocket;
  setupTimer?: ReturnType<typeof setTimeout>;
  pingTimer?: ReturnType<typeof setInterval>;
  context?: AudioContext;
  stream?: MediaStream;
  recorder?: AudioWorkletNode;
  analyser?: AnalyserNode;
  raf?: number;
  playback: Set<AudioBufferSourceNode>;
  nextPlay: number;
  ready: boolean;
  muted: boolean;
  micAvailable: boolean;
  stopped: boolean;
}

const createEmptyResources = (): RealtimeResources => ({
  playback: new Set(),
  nextPlay: 0,
  ready: false,
  muted: false,
  micAvailable: false,
  stopped: false,
});

export function useSpeakingRealtime(
  lessonId: string | undefined,
  speaking: ActiveLessonSpeaking | null
) {
  const [callState, setCallState] = useState<SpeakingCallState>("idle");
  const [callStarted, setCallStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<SpeakingTurnMessage[]>([]);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [liveUserSubtitle, setLiveUserSubtitle] = useState("");
  const [liveAiSubtitle, setLiveAiSubtitle] = useState("");
  const [isAnalyzingTurn, setIsAnalyzingTurn] = useState(false);

  const resourcesRef = useRef<RealtimeResources>(createEmptyResources());
  const stateRef = useRef<SpeakingCallState>("idle");
  const bargeInHoldRef = useRef(0);
  // Cache PCM Float32 chunks (24kHz) per AI turn so replay is instant with zero TTS calls
  const audioCacheRef = useRef<Map<string, Float32Array[]>>(new Map());

  const updateCallState = useCallback((next: SpeakingCallState) => {
    stateRef.current = next;
    setCallState(next);
  }, []);

  const clearPlayback = useCallback((r: RealtimeResources) => {
    for (const node of r.playback) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    }
    r.playback.clear();
    r.nextPlay = r.context?.currentTime ?? 0;
  }, []);

  const cleanup = useCallback(
    (r: RealtimeResources, keepAudioContextForReplay = false) => {
      r.stopped = true;
      r.ready = false;
      if (r.setupTimer) clearTimeout(r.setupTimer);
      if (r.pingTimer) clearInterval(r.pingTimer);
      if (r.raf !== undefined) cancelAnimationFrame(r.raf);
      r.stream?.getTracks().forEach((t) => t.stop());
      try {
        r.recorder?.disconnect();
      } catch {
        // ignore
      }
      clearPlayback(r);
      if (r.ws?.readyState === WebSocket.OPEN) {
        try {
          r.ws.send(JSON.stringify({ type: "stop" }));
        } catch {
          // ignore
        }
      }
      try {
        r.ws?.close();
      } catch {
        // ignore
      }
      if (!keepAudioContextForReplay && r.context && r.context.state !== "closed") {
        void r.context.close().catch(() => undefined);
      }
    },
    [clearPlayback]
  );

  useEffect(() => {
    return () => {
      cleanup(resourcesRef.current, false);
    };
  }, [lessonId, cleanup]);

  const stopCall = useCallback(() => {
    cleanup(resourcesRef.current, true);
    updateCallState("ended");
    setAudioLevel(0);
    setLiveUserSubtitle("");
    setLiveAiSubtitle("");
  }, [cleanup, updateCallState]);

  const replayTurnAudio = useCallback(
    async (turnId: string) => {
      const chunks = audioCacheRef.current.get(turnId);
      if (!chunks || chunks.length === 0) return;

      let ctx = resourcesRef.current.context;
      if (!ctx || ctx.state === "closed") {
        ctx = new AudioContext();
        resourcesRef.current.context = ctx;
      }
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      clearPlayback(resourcesRef.current);

      const totalSamples = chunks.reduce((acc, arr) => acc + arr.length, 0);
      if (totalSamples === 0) return;

      const buffer = ctx.createBuffer(1, totalSamples, 24000);
      const out = buffer.getChannelData(0);
      let offset = 0;
      for (const part of chunks) {
        out.set(part, offset);
        offset += part.length;
      }

      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(ctx.destination);
      if (resourcesRef.current.analyser) {
        try {
          node.connect(resourcesRef.current.analyser);
        } catch {
          // analyser may belong to previous context
        }
      }
      resourcesRef.current.playback.add(node);
      const prevState = stateRef.current;
      updateCallState("speaking");
      node.onended = () => {
        resourcesRef.current.playback.delete(node);
        if (resourcesRef.current.playback.size === 0) {
          updateCallState(
            resourcesRef.current.stopped ? "ended" : prevState === "speaking" ? "listening" : prevState
          );
        }
      };
      node.start(0);
    },
    [clearPlayback, updateCallState]
  );

  const startCall = useCallback(async () => {
    if (!lessonId || !speaking) return;
    cleanup(resourcesRef.current, false);
    audioCacheRef.current.clear();

    const r = createEmptyResources();
    resourcesRef.current = r;

    setCallStarted(true);
    updateCallState("connecting");
    setError(null);
    setMuted(false);
    setMicAvailable(true);
    setAudioLevel(0);
    setMessages([]);
    setCompletedMissions([]);
    setLiveUserSubtitle("");
    setLiveAiSubtitle("");

    const fail = (msg: string) => {
      if (r.stopped) return;
      cleanup(r, true);
      setError(msg);
      updateCallState("error");
      setAudioLevel(0);
    };

    try {
      if (!window.AudioContext) {
        throw new Error(
          "Trình duyệt hiện tại chưa hỗ trợ Web Audio để phát giọng nói trực tiếp."
        );
      }

      const context = new AudioContext();
      r.context = context;
      await context.resume();

      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      r.analyser = analyser;

      // Acquire microphone if available; gracefully fall back to listen + text input if blocked/missing
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            },
          });
          if (r.stopped) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          r.stream = stream;
          r.micAvailable = true;
          const micSource = context.createMediaStreamSource(stream);
          micSource.connect(analyser);

          await context.audioWorklet.addModule("/audio/tutor-recorder.js?v=4");
          if (r.stopped) return;
          // threshold: 0 preserves 100% of spoken syllables for Qwen server_vad
          const recorder = new AudioWorkletNode(context, "tutor-recorder", {
            processorOptions: { threshold: 0 },
          });
          r.recorder = recorder;
          micSource.connect(recorder);
          const silence = context.createGain();
          silence.gain.value = 0;
          recorder.connect(silence).connect(context.destination);
        } catch {
          r.micAvailable = false;
          r.muted = true;
          setMicAvailable(false);
          setMuted(true);
          setError(
            "Không mở được Micro trên thiết bị. Bạn vẫn nghe được giọng thật của Qwen 3.8 Omni và có thể dùng ô Nhập lời nói bên dưới!"
          );
        }
      } else {
        r.micAvailable = false;
        r.muted = true;
        setMicAvailable(false);
        setMuted(true);
      }

      const base = isDpopMode
        ? getDpopSocketBase()
        : process.env.NEXT_PUBLIC_URL_BACKEND_WS ||
          process.env.NEXT_PUBLIC_URL_BACKEND ||
          "ws://127.0.0.1:8000";

      const url = new URL(
        `${base.replace(/\/$/, "")}/api/v1/learning/speaking/${lessonId}/realtime`
      );
      const protocols = ["studynest-speaking"];
      if (isDpopMode) {
        await api.get("/auth/me");
      } else {
        const { data } = await api.post<{ ticket: string }>(
          "/learning/speaking/voice-ticket",
          {}
        );
        protocols.push(`ticket.${data.ticket}`);
      }
      if (r.stopped) return;

      r.setupTimer = setTimeout(
        () => fail("Kết nối giọng nói Qwen Realtime quá lâu. Vui lòng thử gọi lại."),
        20_000
      );
      const ws = await openAuthedWebSocket(url.href, { protocols });
      if (r.stopped) {
        ws.close();
        return;
      }
      r.ws = ws;

      if (r.recorder) {
        r.recorder.port.onmessage = (ev: MessageEvent<ArrayBuffer>) => {
          if (
            !r.stopped &&
            r.ready &&
            !r.muted &&
            ev.data instanceof ArrayBuffer &&
            ws.readyState === WebSocket.OPEN
          ) {
            if (ws.bufferedAmount > 64000) return;
            // Prevent laptop speaker echo from triggering false "yeah" utterances while AI is speaking,
            // while still allowing intentional loud barge-in speech from the student.
            if (stateRef.current === "speaking") {
              const pcm = new Int16Array(ev.data);
              let sumSq = 0;
              for (let i = 0; i < pcm.length; i++) {
                const norm = pcm[i] / 32768;
                sumSq += norm * norm;
              }
              const rms = Math.sqrt(sumSq / Math.max(1, pcm.length));
              if (rms >= 0.045) {
                bargeInHoldRef.current = 8;
              }
              if (bargeInHoldRef.current > 0) {
                bargeInHoldRef.current -= 1;
                ws.send(ev.data);
              }
              return;
            }
            bargeInHoldRef.current = 0;
            ws.send(ev.data);
          }
        };
      }

      r.pingTimer = setInterval(() => {
        if (!r.stopped && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: "ping" }));
          } catch {
            // ignore
          }
        }
      }, 25_000);

      const handleWsMessage = (event: MessageEvent) => {
        if (r.stopped || typeof event.data !== "string") return;
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type as string;

          if (type === "ready") {
            if (r.setupTimer) {
              clearTimeout(r.setupTimer);
              r.setupTimer = undefined;
            }
            r.ready = true;
            updateCallState("listening");
          } else if (type === "audio") {
            const turnId = String(msg.turn_id || "opening");
            const rawBytes = Uint8Array.from(atob(msg.data), (c) =>
              c.charCodeAt(0)
            );
            const view = new DataView(rawBytes.buffer);
            const sampleCount = Math.floor(rawBytes.length / 2);
            const floatChunk = new Float32Array(sampleCount);
            for (let i = 0; i < sampleCount; i++) {
              floatChunk[i] = view.getInt16(i * 2, true) / 32768;
            }

            const existingChunks = audioCacheRef.current.get(turnId) || [];
            existingChunks.push(floatChunk);
            audioCacheRef.current.set(turnId, existingChunks);

            const buffer = context.createBuffer(
              1,
              sampleCount,
              msg.sample_rate || 24000
            );
            buffer.getChannelData(0).set(floatChunk);

            const node = context.createBufferSource();
            node.buffer = buffer;
            node.connect(context.destination);
            node.connect(analyser);
            r.playback.add(node);

            const startAt =
              r.nextPlay > context.currentTime
                ? r.nextPlay
                : context.currentTime + 0.06;
            node.start(startAt);
            r.nextPlay = startAt + buffer.duration;
            node.onended = () => {
              r.playback.delete(node);
              if (!r.stopped && r.playback.size === 0 && stateRef.current === "speaking") {
                updateCallState("listening");
              }
            };
            updateCallState("speaking");
          } else if (type === "interrupted") {
            clearPlayback(r);
            setLiveAiSubtitle("");
            updateCallState("listening");
          } else if (type === "transcript") {
            if (msg.role === "user") {
              setLiveUserSubtitle(String(msg.text || ""));
            } else if (msg.role === "assistant") {
              setLiveAiSubtitle(String(msg.text || ""));
            }
          } else if (type === "turn") {
            const aiTurnId = String(msg.turn_id || `a-${Date.now()}`);
            const userTurnId = msg.user_turn_id
              ? String(msg.user_turn_id)
              : null;
            const userText = String(msg.user || "").trim();
            const aiText = String(msg.assistant || "").trim();
            const presetTrans = String(msg.translation || "").trim();

            setMessages((prev) => {
              const next = [...prev];
              if (userText && userTurnId) {
                next.push({
                  id: userTurnId,
                  role: "user",
                  content: userText,
                });
              }
              if (aiText) {
                next.push({
                  id: aiTurnId,
                  role: "assistant",
                  content: aiText,
                  translation: presetTrans || undefined,
                  hasAudioCache: audioCacheRef.current.has(aiTurnId),
                });
              }
              return next;
            });
            setLiveUserSubtitle("");
            setLiveAiSubtitle("");
            if (userText) {
              setIsAnalyzingTurn(true);
            }
          } else if (type === "analyzing_missions") {
            setIsAnalyzingTurn(Boolean(msg.active));
          } else if (type === "turn_analysis") {
            setIsAnalyzingTurn(false);
            const aiTurnId = String(msg.turn_id || "");
            const userTurnId = msg.user_turn_id
              ? String(msg.user_turn_id)
              : "";
            const replyTranslation = String(
              msg.reply_translation || ""
            ).trim();
            const grammarCorrection = String(
              msg.grammar_correction || ""
            ).trim();
            const feedbackTip = String(msg.feedback_tip || "").trim();

            setMessages((prev) =>
              prev.map((item) => {
                if (item.id === aiTurnId) {
                  return {
                    ...item,
                    translation: replyTranslation || item.translation,
                    feedbackTip: feedbackTip || item.feedbackTip,
                  };
                }
                if (userTurnId && item.id === userTurnId && grammarCorrection) {
                  return {
                    ...item,
                    grammarCorrection,
                  };
                }
                return item;
              })
            );

            if (Array.isArray(msg.completed_mission_ids)) {
              setCompletedMissions(msg.completed_mission_ids);
            }
            if (
              Array.isArray(msg.newly_completed_mission_ids) &&
              msg.newly_completed_mission_ids.length > 0
            ) {
              showToast.success(
                `Hoàn thành thêm ${msg.newly_completed_mission_ids.length} nhiệm vụ giao tiếp!`
              );
            }
          } else if (type === "listening") {
            if (r.playback.size === 0) {
              updateCallState("listening");
            }
          } else if (type === "notice") {
            if (msg.message) showToast.info(String(msg.message));
          } else if (type === "ended") {
            cleanup(r, true);
            updateCallState("ended");
            if (msg.message) setError(String(msg.message));
          } else if (type === "error") {
            fail(
              String(
                msg.message ||
                  "Không thể duy trì kết nối giọng nói Qwen Realtime."
              )
            );
          }
        } catch {
          // ignore malformed event
        }
      };

      ws.onerror = () =>
        fail("Không kết nối được máy chủ giọng nói AI. Vui lòng thử lại.");
      ws.onclose = () => {
        if (!r.stopped) {
          cleanup(r, true);
          updateCallState("ended");
        }
      };
      ws.onmessage = handleWsMessage;
      const firstMsg = takeInitialWebSocketMessage(ws);
      if (firstMsg) handleWsMessage(firstMsg);

      const samples = new Float32Array(analyser.fftSize);
      let lastPaint = 0;
      const paintLoop = (ts = 0) => {
        if (r.stopped) return;
        if (ts - lastPaint >= 45) {
          lastPaint = ts;
          analyser.getFloatTimeDomainData(samples);
          const rms = Math.sqrt(
            samples.reduce((acc, v) => acc + v * v, 0) / samples.length
          );
          setAudioLevel(
            r.muted && stateRef.current !== "speaking"
              ? 0
              : Math.min(1, rms * 8)
          );
        }
        r.raf = requestAnimationFrame(paintLoop);
      };
      paintLoop();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể bắt đầu cuộc gọi AI.";
      fail(message);
    }
  }, [lessonId, speaking, cleanup, clearPlayback, updateCallState]);

  const toggleMute = useCallback(() => {
    const r = resourcesRef.current;
    if (!r.micAvailable) {
      showToast.error(
        "Thiết bị chưa cấp quyền Micro. Hãy dùng ô Nhập lời nói bên dưới nhé!"
      );
      return;
    }
    r.muted = !r.muted;
    setMuted(r.muted);
    r.stream?.getAudioTracks().forEach((t) => {
      t.enabled = !r.muted;
    });
    if (r.muted && r.ready && r.ws?.readyState === WebSocket.OPEN) {
      r.ws.send(JSON.stringify({ type: "audio_end" }));
    }
  }, []);

  const sendTextTurn = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      const r = resourcesRef.current;
      if (!text || r.stopped || r.ws?.readyState !== WebSocket.OPEN) return false;
      clearPlayback(r);
      r.ws.send(JSON.stringify({ type: "text_turn", text }));
      return true;
    },
    [clearPlayback]
  );

  return {
    callStarted,
    callState,
    muted,
    micAvailable,
    audioLevel,
    error,
    messages,
    completedMissions,
    setCompletedMissions,
    liveUserSubtitle,
    liveAiSubtitle,
    isAnalyzingTurn,
    startCall,
    stopCall,
    toggleMute,
    sendTextTurn,
    replayTurnAudio,
  };
}
