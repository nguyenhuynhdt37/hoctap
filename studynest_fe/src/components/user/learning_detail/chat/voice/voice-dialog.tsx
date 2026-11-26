"use client";

import { useEffect, useRef } from "react";
import { Mic, PhoneMissed, VolumeX, Minus, Maximize } from "pulsoicon-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/states";
import type { MessageSource } from "@/types/user/tutor-chat";
import { SourceList } from "../chat-chips";
import { VoiceOrb } from "./voice-orb";
import { useLessonVoice, type VoiceState } from "./use-lesson-voice";
import type { AgentEvent } from "../../agent/contracts";

export interface VoiceDialogProps {
  minimized?: boolean;
  onStateChange?: (state: VoiceState) => void;
  onMinimize?: () => void;
  onExpand?: () => void;
  lessonId?: string;
  lessonTitle: string;
  accessToken?: string;
  agentSessionId?: string;
  onAgentEvent?: (event: AgentEvent) => Promise<void>;
  onClose: (threadId?: string) => void;
  onSourceClick: (source: MessageSource) => void;
}
const labels = {
  idle: "Cùng Mây Mây trò chuyện nhé",
  connecting: "Đang kết nối với Mây Mây…",
  listening: "Mây Mây đang lắng nghe",
  thinking: "Đang tìm nội dung bài học…",
  speaking: "Mây Mây đang trả lời",
  ended: "Hẹn bạn ở cuộc trò chuyện tiếp theo",
  error: "Chưa thể tiếp tục cuộc trò chuyện",
};

export default function VoiceDialog({ lessonId, lessonTitle, onClose, onSourceClick, agentSessionId, onAgentEvent, minimized, onMinimize, onExpand, onStateChange }: VoiceDialogProps) {
  const voice = useLessonVoice(lessonId, undefined, agentSessionId, onAgentEvent);
  useEffect(() => { onStateChange?.(voice.state); }, [voice.state, onStateChange]);
  const connected = ["listening", "thinking", "speaking"].includes(voice.state);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pause = (window as unknown as Record<string, unknown>)[`pauseVideo_${lessonId}`];
    if (typeof pause === "function") pause();
  }, [lessonId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [voice.draft, voice.turns]);
  const close = () => { voice.stop(); onClose(voice.threadId); };
  const openSource = (source: MessageSource) => {
    // Return to the lesson before seeking/playing its video; do not keep a hidden mic active.
    close();
    onSourceClick(source);
  };
  if (minimized) return (
    <aside aria-label="Cuộc gọi Mây Mây đang chạy" className="fixed bottom-4 left-4 right-4 z-[100] flex items-center gap-3 rounded-2xl border border-primary-pastel bg-surface p-3 shadow-lg sm:left-auto sm:w-auto sm:min-w-80">
      <span className={`h-2.5 w-2.5 rounded-full ${voice.muted ? "bg-muted-foreground" : "bg-primary animate-pulse"}`} />
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Mây Mây · {voice.muted ? "Mic tắt" : labels[voice.state]}</p><p className="max-w-72 truncate text-xs text-muted-foreground">{voice.draft.assistant || voice.draft.user || voice.turns.at(-1)?.content || lessonTitle}</p></div>
      <Button size="icon" variant="ghost" onClick={voice.toggleMute} aria-label={voice.muted ? "Bật micro" : "Tắt micro"}><Mic size="1em" /></Button>
      <Button size="icon" variant="ghost" onClick={onExpand} aria-label="Mở lại cuộc gọi"><Maximize size="1em" /></Button>
      <Button size="icon" variant="destructive" onClick={close} aria-label="Kết thúc cuộc gọi"><PhoneMissed size="1em" /></Button>
    </aside>
  );
  return (
    <Modal open onClose={close} title="Trò chuyện cùng Mây Mây" description={lessonTitle} size="lg" closeOnOverlayClick={false}>
      <div className="space-y-4">
        {onMinimize && <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={onMinimize} leftIcon={<Minus size="1em" />}>Thu nhỏ · tiếp tục cuộc gọi</Button></div>}

        <div className="rounded-2xl border border-primary-pastel/60 bg-background px-4 pb-5 text-center">
          <VoiceOrb level={voice.level} active={connected} />
          <p role="status" aria-live="polite" className="text-sm font-semibold text-foreground">
            {voice.muted && connected ? "Micro đang tắt" : labels[voice.state]}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {connected ? "Bạn có thể nói để ngắt lời bất cứ lúc nào." : "Đặt câu hỏi bằng giọng nói, cùng tìm hiểu bài học từng bước."}
          </p>
          {connected && <p className="mt-2 text-xs tabular-nums text-muted-foreground">{Math.floor(voice.elapsed / 60)}:{String(voice.elapsed % 60).padStart(2, "0")} · Tối đa 10 phút mỗi phiên</p>}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {connected ? <>
              <Button variant={voice.muted ? "pastel" : "outline"} size="icon" onClick={voice.toggleMute}
                aria-label={voice.muted ? "Bật micro" : "Tắt micro"} aria-pressed={voice.muted}>
                {voice.muted ? <VolumeX className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button variant="destructive" onClick={voice.stop} leftIcon={<PhoneMissed className="h-5 w-5" />}>Kết thúc</Button>
            </> : <Button onClick={() => void voice.start()} disabled={!voice.preferencesLoaded && !voice.preferencesError} isLoading={voice.state === "connecting"}
              loadingText="Đang kết nối" leftIcon={<Mic className="h-5 w-5" />}>
              {voice.state === "idle" ? "Bắt đầu nói chuyện" : "Kết nối lại"}
            </Button>}
          </div>
        </div>
        {voice.imageCount > 0 && <p className="text-xs text-muted-foreground">Đang dùng {voice.imageCount} ảnh đã gửi trong cuộc hội thoại. Bạn có thể hỏi về ảnh bằng giọng nói.</p>}
        {voice.canRead === false && <Alert variant="info" role="status" className="rounded-xl px-3 py-2 text-xs">
          Bài này chưa có nội dung được lập chỉ mục cho AI. Bạn vẫn có thể hỏi kiến thức chung hoặc nói rõ nội dung cần giải thích.
        </Alert>}
        {voice.preferencesError && <Alert variant="info" className="text-xs">{voice.preferencesError}</Alert>}
        {voice.error && <Alert variant={voice.state === "error" ? "warning" : "info"} className="rounded-xl px-3 py-2 text-xs">{voice.error}</Alert>}
        {(voice.turns.length > 0 || voice.draft.user || voice.draft.assistant) && (
          <section aria-label="Bản chữ cuộc trò chuyện" className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-muted-foreground">Bản chữ cuộc trò chuyện</p>
            {voice.turns.map((turn, index) => <div key={index}>
              <p className="mb-1 text-xs font-semibold text-primary">{turn.role === "user" ? "Bạn" : "Mây Mây"}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{turn.content}</p>
              {turn.sources && <SourceList sources={turn.sources} onSourceClick={openSource} currentLessonId={lessonId} />}
            </div>)}
            {voice.draft.user && <div><p className="text-xs font-semibold text-primary">Bạn</p><p className="text-sm leading-relaxed">{voice.draft.user}</p></div>}
            {voice.draft.assistant && <div><p className="text-xs font-semibold text-primary">Mây Mây</p><p className="text-sm leading-relaxed">{voice.draft.assistant}</p></div>}
            {voice.sources.length > 0 && <SourceList sources={voice.sources} onSourceClick={openSource} currentLessonId={lessonId} />}
            <div ref={endRef} />
          </section>
        )}
        <p className="text-center text-xs leading-relaxed text-muted-foreground">Âm thanh chỉ được gửi khi bạn bật micro. Bản chữ và nguồn được lưu trong lịch sử chat; hệ thống không lưu bản ghi âm.</p>
      </div>
    </Modal>
  );
}
