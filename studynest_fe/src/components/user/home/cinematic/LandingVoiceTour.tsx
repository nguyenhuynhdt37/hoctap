"use client";

import { Button } from "@/components/ui";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "maymay-voice-tour-v2";

const STEPS = [
  {
    target: "island",
    audio: "/audio/maymay-tour/01-welcome.mp3",
    caption: "Chào mừng bạn đến với Mây Mây.",
  },
  {
    target: "story",
    audio: "/audio/maymay-tour/02-story.mp3",
    caption: "Đây là tấm thẻ giới thiệu trên mây.",
  },
  {
    target: "levels",
    audio: "/audio/maymay-tour/03-levels.mp3",
    caption: "Mây Mây hỗ trợ ba cấp học.",
  },
  {
    target: "assistant",
    audio: "/audio/maymay-tour/04-assistant.mp3",
    caption: "Trong bài học có video, trắc nghiệm và trợ lý.",
  },
  {
    target: "explore",
    audio: "/audio/maymay-tour/05-explore.mp3",
    caption: "Bấm Khám phá khóa học để bắt đầu.",
  },
] as const;

export default function LandingVoiceTour() {
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopVoice = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  };

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === "done") return;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!started) return;
    const current = STEPS[step];
    const element = document.querySelector(`[data-tour="${current.target}"]`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    const place = () => {
      const node = document.querySelector(`[data-tour="${current.target}"]`);
      if (!node) {
        setBox(null);
        return;
      }
      const rect = node.getBoundingClientRect();
      setBox({ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 });
    };
    place();
    const timer = window.setInterval(place, 250);
    stopVoice();
    const audio = new Audio(current.audio);
    audioRef.current = audio;
    void audio.play().catch(() => undefined);
    return () => window.clearInterval(timer);
  }, [started, step]);

  const finish = () => {
    stopVoice();
    window.localStorage.setItem(STORAGE_KEY, "done");
    setVisible(false);
    setStarted(false);
  };

  if (!visible) return null;
  const current = STEPS[step];

  return (
    <>
      {started && box && (
        <div
          className="pointer-events-none fixed z-[70] rounded-[28px] ring-2 ring-primary shadow-[0_0_0_9999px_rgba(27,51,72,0.28)]"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        />
      )}
      <div className="fixed bottom-6 left-1/2 z-[80] w-[min(440px,calc(100%-2rem))] -translate-x-1/2 rounded-[24px] border border-primary-pastel bg-surface/95 p-4 shadow-xl backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Trợ lý Mây hướng dẫn
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{current.caption}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {step + 1} / {STEPS.length}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!started ? (
            <Button
              size="sm"
              onClick={() => {
                setStarted(true);
                setStep(0);
              }}
            >
              Nghe Mây giới thiệu
            </Button>
          ) : step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep((value) => value + 1)}>
              Tiếp theo
            </Button>
          ) : (
            <Button size="sm" onClick={finish}>
              Xong
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={finish}>
            Để sau
          </Button>
        </div>
      </div>
    </>
  );
}
