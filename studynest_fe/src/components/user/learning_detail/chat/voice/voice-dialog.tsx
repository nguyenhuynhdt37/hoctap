"use client";

import { useEffect, useRef } from "react";
import { HiMicrophone, HiPhoneMissedCall, HiVolumeOff } from "react-icons/hi";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/states";
import type { MessageSource } from "@/types/user/tutor-chat";
import { SourceList } from "../chat-chips";
import { VoiceOrb } from "./voice-orb";
import { useLessonVoice } from "./use-lesson-voice";

interface Props {
  lessonId: string;
  lessonTitle: string;
  accessToken?: string;
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

export default function VoiceDialog({ lessonId, lessonTitle, accessToken, onClose, onSourceClick }: Props) {
  const voice = useLessonVoice(lessonId, accessToken);
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
  return (
    <Modal open onClose={close} title="Trò chuyện cùng Mây Mây" description={lessonTitle} size="lg" closeOnOverlayClick={false}>
      <div className="space-y-4">
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
                {voice.muted ? <HiVolumeOff className="h-5 w-5" /> : <HiMicrophone className="h-5 w-5" />}
              </Button>
              <Button variant="destructive" onClick={voice.stop} leftIcon={<HiPhoneMissedCall className="h-5 w-5" />}>Kết thúc</Button>
            </> : <Button onClick={() => void voice.start()} isLoading={voice.state === "connecting"}
              loadingText="Đang kết nối" leftIcon={<HiMicrophone className="h-5 w-5" />}>
              {voice.state === "idle" ? "Bắt đầu nói chuyện" : "Kết nối lại"}
            </Button>}
          </div>
        </div>
        {voice.canRead === false && <Alert variant="info" role="status" className="rounded-xl px-3 py-2 text-xs">
          Mây Mây chưa hỗ trợ đọc nội dung bài giảng này. Bạn vẫn có thể hỏi kiến thức chung hoặc nói rõ nội dung cần giải thích.
        </Alert>}
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
