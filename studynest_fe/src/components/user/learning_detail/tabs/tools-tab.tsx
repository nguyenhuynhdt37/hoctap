"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  ListChecks,
  Minus,
  Pause,
  PenTool,
  Pin,
  PinOff,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import { showToast } from "@/lib/utils/helpers/toast";
import { cn } from "@/lib/utils";
import { LessonOverview } from "@/types/user/learning";

interface ToolsTabProps {
  lessonOverview?: LessonOverview;
}

const POMODORO_PRESETS = [
  { id: "focus", label: "Tập trung 25p", seconds: 25 * 60 },
  { id: "sprint", label: "Ôn nhanh 15p", seconds: 15 * 60 },
  { id: "break", label: "Nghỉ ngắn 5p", seconds: 5 * 60 },
] as const;

const PEN_COLORS = [
  { id: "sky", label: "Xanh mây", hex: "#285C90" },
  { id: "ink", label: "Than chì", hex: "#1E293B" },
  { id: "berry", label: "Hồng đậm", hex: "#BE185D" },
  { id: "pine", label: "Xanh trầm", hex: "#0F766E" },
] as const;

const PEN_SIZES = [
  { id: "thin", label: "Mảnh", px: 2.2 },
  { id: "mid", label: "Vừa", px: 4 },
  { id: "bold", label: "Đậm", px: 7 },
] as const;

interface Stroke {
  color: string;
  size: number;
  points: Array<{ x: number; y: number }>;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "watch", text: "Xem thực ≥ 80% bài giảng (không tua nhảy)", done: false },
  { id: "note", text: "Ghi chú lại công thức / ý cốt lõi của bài", done: false },
  { id: "practice", text: "Hoàn thành Quiz hoặc tự làm lại ví dụ", done: false },
  { id: "qa", text: "Đặt câu hỏi trong Hỏi đáp nếu còn chỗ vướng", done: false },
];

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function getResourceBadge(type?: string | null): { label: string; className: string } {
  const key = (type || "file").toLowerCase();
  if (key.includes("pdf")) {
    return {
      label: "PDF",
      className: "border-secondary-pastel bg-secondary text-secondary-foreground",
    };
  }
  if (key.includes("video")) {
    return {
      label: "VIDEO",
      className: "border-primary-pastel bg-primary-light text-primary",
    };
  }
  if (key.includes("code") || key.includes("github") || key.includes("zip")) {
    return {
      label: "MÃ NGUỒN",
      className: "border-accent-border bg-accent text-accent-foreground",
    };
  }
  if (key.includes("link") || key.includes("url")) {
    return {
      label: "LIÊN KẾT",
      className: "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
    };
  }
  return {
    label: key.toUpperCase(),
    className: "border-primary-pastel bg-primary-light text-primary",
  };
}

function playBellChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.16);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.16);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + idx * 0.16 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.16 + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.16);
      osc.stop(ctx.currentTime + idx * 0.16 + 0.7);
    });
  } catch {
    // Bỏ qua nếu trình duyệt chặn AudioContext
  }
}

export default function ToolsTab({ lessonOverview }: ToolsTabProps) {
  const resources = lessonOverview?.resources ?? [];
  const checklistKey = `maymay:study-checklist:${lessonOverview?.id || "global"}`;

  // ── POMODORO + FLOATING PIN + AMBIENT RAIN SOUND ──
  const [presetId, setPresetId] = useState<(typeof POMODORO_PRESETS)[number]["id"]>("focus");
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [pinnedFloating, setPinnedFloating] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodeRef = useRef<AudioNode | null>(null);

  // ── COPY RESOURCE LINK ──
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── WHITEBOARD CANVAS + CHECKLIST SWITCHER ──
  const [boardTab, setBoardTab] = useState<"whiteboard" | "checklist">("whiteboard");
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0].hex);
  const [penSize, setPenSize] = useState<number>(PEN_SIZES[1].px);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<Stroke | null>(null);

  // ── CHECKLIST STATE ──
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [newTaskText, setNewTaskText] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(checklistKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChecklistItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChecklist(parsed);
          return;
        }
      }
      setChecklist(DEFAULT_CHECKLIST);
    } catch {
      setChecklist(DEFAULT_CHECKLIST);
    }
  }, [checklistKey]);

  const persistChecklist = useCallback(
    (next: ChecklistItem[]) => {
      setChecklist(next);
      try {
        window.localStorage.setItem(checklistKey, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
    },
    [checklistKey],
  );

  // Bộ đếm Pomodoro
  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          playBellChime();
          if (presetId !== "break") {
            setCompletedSessions((c) => c + 1);
          }
          showToast.success(
            presetId === "break"
              ? "Hết giờ nghỉ ngắn — sẵn sàng quay lại học tiếp nào!"
              : "Xuất sắc! Bạn vừa hoàn thành 1 phiên tập trung học bài.",
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, presetId]);

  // Âm thanh mưa nhẹ tập trung (WebAudio Pink Noise + Lowpass 650Hz)
  const stopAmbientSound = useCallback(() => {
    try {
      if (ambientNodeRef.current) {
        ambientNodeRef.current.disconnect();
        ambientNodeRef.current = null;
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleAmbientSound = () => {
    if (ambientOn) {
      stopAmbientSound();
      setAmbientOn(false);
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < bufferSize; i += 1) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 650;

      const gain = ctx.createGain();
      gain.gain.value = 0.35;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      audioCtxRef.current = ctx;
      ambientNodeRef.current = source;
      setAmbientOn(true);
    } catch {
      showToast.error("Trình duyệt không hỗ trợ phát âm thanh tập trung.");
    }
  };

  useEffect(() => stopAmbientSound, [stopAmbientSound]);

  // ── WHITEBOARD CANVAS RENDERING ──
  const redrawCanvas = useCallback(
    (strokeList: Stroke[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = Math.max(1, Math.round(rect.width * dpr));
      const targetH = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const stroke of strokeList) {
        if (stroke.points.length === 0) continue;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i += 1) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        if (stroke.points.length === 1) {
          ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1);
        }
        ctx.stroke();
      }
    },
    [],
  );

  useEffect(() => {
    if (boardTab === "whiteboard") {
      redrawCanvas(strokes);
    }
  }, [boardTab, strokes, redrawCanvas]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    activeStrokeRef.current = { color: penColor, size: penSize, points: [pt] };
    redrawCanvas([...strokes, activeStrokeRef.current]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeStrokeRef.current) return;
    const pt = getCanvasPoint(e);
    activeStrokeRef.current.points.push(pt);
    redrawCanvas([...strokes, activeStrokeRef.current]);
  };

  const handlePointerUp = () => {
    if (!activeStrokeRef.current) return;
    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setStrokes((prev) => [...prev, finished]);
  };

  const handleExportWhiteboardPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) {
      showToast.info("Hãy vẽ nháp công thức hoặc sơ đồ lên bảng trước khi xuất ảnh nhé!");
      return;
    }
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const url = exportCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `bang-nhap-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast.success("Đã tải ảnh bảng nháp PNG — bạn có thể dán thẳng vào Hỏi đáp!");
  };

  // Pomodoro helpers
  const handleSelectPreset = (id: (typeof POMODORO_PRESETS)[number]["id"]) => {
    const next = POMODORO_PRESETS.find((p) => p.id === id) ?? POMODORO_PRESETS[0];
    setPresetId(next.id);
    setTotalSeconds(next.seconds);
    setSecondsLeft(next.seconds);
    setIsRunning(false);
  };

  const adjustMinutes = (deltaMin: number) => {
    const nextTotal = Math.max(60, Math.min(90 * 60, totalSeconds + deltaMin * 60));
    setTotalSeconds(nextTotal);
    setSecondsLeft(nextTotal);
    setIsRunning(false);
  };

  const handleCopyResource = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      showToast.success("Đã sao chép đường dẫn tài nguyên.");
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      showToast.error("Không sao chép được liên kết.");
    }
  };

  const doneCount = checklist.filter((i) => i.done).length;
  const checklistPct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

  const progressRatio =
    totalSeconds > 0 ? Math.min(1, Math.max(0, (totalSeconds - secondsLeft) / totalSeconds)) : 0;
  const ringRadius = 50;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressRatio);

  return (
    <div className="space-y-6">
      {/* ── TÀI NGUYÊN BÀI HỌC (NỔI BẬT NẾU CÓ, GỌN NHẸ NẾU TRỐNG) ── */}
      {resources.length > 0 ? (
        <section className="rounded-[24px] border border-primary-pastel/70 bg-primary-light/25 p-5">
          <div className="mb-3.5 flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-surface text-primary shadow-2xs">
              <FolderOpen className="size-4" animated={false} aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Tài nguyên đính kèm bài học ({resources.length})
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Tài liệu, slide và liên kết tham khảo do giảng viên cung cấp
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {resources.map((r) => {
              const badge = getResourceBadge(r.resource_type);
              const isCopied = copiedId === r.id;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-primary-pastel/70 bg-surface p-3.5 transition-colors hover:border-primary"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold",
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                      <span className="truncate text-sm font-bold text-foreground">
                        {r.title || r.url}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                      <Link2 className="size-3 shrink-0" animated={false} aria-hidden="true" />
                      <span className="truncate">{r.url}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleCopyResource(r.id, r.url)}
                      aria-label="Sao chép đường dẫn"
                      className="grid size-8 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer"
                    >
                      {isCopied ? (
                        <Check className="size-3.5 text-success-foreground" animated={false} aria-hidden="true" />
                      ) : (
                        <Copy className="size-3.5" animated={false} aria-hidden="true" />
                      )}
                    </button>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                      Mở
                      <ExternalLink className="size-3" animated={false} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-primary-pastel bg-background/60 px-4 py-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2 font-medium">
            <FileText className="size-4 text-primary" animated={false} aria-hidden="true" />
            Bài học này chưa có tệp đính kèm — hãy dùng bộ <strong>Pomodoro Ghim nổi</strong> và <strong>Bảng vẽ nháp</strong> bên dưới để học tập trung nhé!
          </span>
        </div>
      )}

      {/* ── BỐ CỤC 2 CỘT TRỰC QUAN: POMODORO FOCUS STUDIO + BẢNG VẼ NHÁP & CHECKLIST ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        {/* Cột trái: Pomodoro Focus Studio */}
        <section className="rounded-[26px] border border-primary-pastel/80 bg-gradient-to-b from-primary-light/65 via-surface to-surface p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-surface text-primary shadow-2xs">
                <Timer className="size-4" animated={false} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Pomodoro Tập Trung
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {completedSessions} phiên đã hoàn thành
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPinnedFloating((p) => !p)}
              title="Ghim đồng hồ nổi góc màn hình để vừa xem video vừa theo dõi"
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[11px] font-bold transition-colors cursor-pointer",
                pinnedFloating
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary-pastel bg-surface text-primary hover:bg-primary-light",
              )}
            >
              <span className="inline-flex shrink-0">
                {pinnedFloating ? (
                  <PinOff className="size-3.5" animated={false} aria-hidden="true" />
                ) : (
                  <Pin className="size-3.5" animated={false} aria-hidden="true" />
                )}
              </span>
              <span>{pinnedFloating ? "Bỏ ghim" : "Ghim nổi"}</span>
            </button>
          </div>

          {/* Preset + chỉnh phút */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {POMODORO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer",
                    presetId === preset.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-primary",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Đồng hồ vòng tròn + nút +/-5p */}
          <div className="mt-5 flex flex-col items-center">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => adjustMinutes(-5)}
                aria-label="Giảm 5 phút"
                className="grid size-9 place-items-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer"
              >
                <Minus className="size-4" animated={false} aria-hidden="true" />
              </button>

              <div className="relative grid size-32 place-items-center">
                <svg className="size-32 -rotate-90" viewBox="0 0 116 116" aria-hidden="true">
                  <circle
                    cx="58"
                    cy="58"
                    r={ringRadius}
                    fill="none"
                    stroke="var(--color-primary-pastel)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="58"
                    cy="58"
                    r={ringRadius}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="font-mono text-2xl font-black text-foreground tabular-nums">
                    {formatClock(secondsLeft)}
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground">
                    {isRunning ? "Đang tập trung" : "Sẵn sàng"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => adjustMinutes(5)}
                aria-label="Tăng 5 phút"
                className="grid size-9 place-items-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer"
              >
                <Plus className="size-4" animated={false} aria-hidden="true" />
              </button>
            </div>

            {/* Chuỗi chấm phiên tập trung */}
            <div className="mt-3 flex items-center gap-1.5" aria-label="Số phiên tập trung hôm nay">
              {[0, 1, 2, 3].map((idx) => (
                <span
                  key={idx}
                  className={cn(
                    "h-2 w-6 rounded-full transition-colors",
                    idx < completedSessions % 4 || (completedSessions >= 4 && completedSessions % 4 === 0)
                      ? "bg-primary"
                      : "bg-primary-pastel/70",
                  )}
                />
              ))}
            </div>

            {/* Điều khiển chính + Âm thanh mưa nhẹ */}
            <div className="mt-4 flex w-full flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (secondsLeft === 0) setSecondsLeft(totalSeconds);
                    setIsRunning((prev) => !prev);
                  }}
                  leftIcon={isRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                >
                  <span>{isRunning ? "Tạm dừng" : "Bắt đầu"}</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsRunning(false);
                    setSecondsLeft(totalSeconds);
                  }}
                  leftIcon={<RotateCcw className="size-3.5" />}
                >
                  Đặt lại
                </Button>
              </div>

              <button
                type="button"
                onClick={toggleAmbientSound}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors cursor-pointer",
                  ambientOn
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-foreground",
                )}
              >
                <span className="inline-flex shrink-0">
                  {ambientOn ? (
                    <Volume2 className="size-4" animated={false} aria-hidden="true" />
                  ) : (
                    <VolumeX className="size-4" animated={false} aria-hidden="true" />
                  )}
                </span>
                <span>
                  {ambientOn
                    ? "Đang bật tiếng mưa nhẹ tập trung"
                    : "Bật âm thanh mưa nhẹ tập trung"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Cột phải: Bảng vẽ nháp Whiteboard Canvas & Checklist bài học */}
        <section className="rounded-[26px] border border-border/80 bg-surface p-5 shadow-2xs">
          {/* Switcher */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-full border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setBoardTab("whiteboard")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                  boardTab === "whiteboard"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <PenTool className="size-3.5" animated={false} aria-hidden="true" />
                Bảng vẽ nháp
              </button>
              <button
                type="button"
                onClick={() => setBoardTab("checklist")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                  boardTab === "checklist"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ListChecks className="size-3.5" animated={false} aria-hidden="true" />
                Checklist bài học ({doneCount}/{checklist.length})
              </button>
            </div>

            {boardTab === "whiteboard" && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={strokes.length === 0}
                  onClick={() => setStrokes((prev) => prev.slice(0, -1))}
                  title="Hoàn tác nét vẽ cuối"
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[11px] font-bold text-foreground hover:border-primary-pastel hover:text-primary disabled:opacity-40 cursor-pointer"
                >
                  <Undo2 className="size-3.5" animated={false} aria-hidden="true" />
                  Hoàn tác
                </button>
                <button
                  type="button"
                  disabled={strokes.length === 0}
                  onClick={() => setStrokes([])}
                  title="Xóa toàn bộ bảng"
                  className="grid size-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:bg-destructive-bg hover:text-destructive-foreground disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="size-3.5" animated={false} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleExportWhiteboardPng}
                  className="inline-flex h-8 items-center gap-1 rounded-full bg-primary-light px-3 text-[11px] font-extrabold text-primary hover:bg-primary-pastel cursor-pointer"
                >
                  <Download className="size-3.5" animated={false} aria-hidden="true" />
                  Tải PNG
                </button>
              </div>
            )}
          </div>

          {boardTab === "whiteboard" ? (
            <div className="space-y-3">
              {/* Thanh chọn màu & cỡ nét */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">Màu mực:</span>
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPenColor(c.hex)}
                      aria-label={c.label}
                      title={c.label}
                      className={cn(
                        "size-6 rounded-full border-2 transition-transform cursor-pointer",
                        penColor === c.hex
                          ? "scale-110 border-primary ring-2 ring-primary/30"
                          : "border-surface shadow-xs",
                      )}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  {PEN_SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPenSize(s.px)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors cursor-pointer",
                        penSize === s.px
                          ? "border-primary bg-primary-light text-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mặt bảng vẽ chấm lưới kiểu sổ tay */}
              <div
                className="relative h-64 w-full overflow-hidden rounded-2xl border border-primary-pastel/80 bg-surface touch-none"
                style={{
                  backgroundImage:
                    "radial-gradient(var(--color-primary-pastel) 1.2px, transparent 1.2px)",
                  backgroundSize: "18px 18px",
                }}
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="size-full cursor-crosshair"
                />
                {strokes.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <p className="text-xs font-bold text-muted-foreground">
                      Vẽ nháp công thức, sơ đồ tư duy hoặc bài toán ngay tại đây
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                      Hỗ trợ chuột & bút cảm ứng · Bấm “Tải PNG” để lưu hoặc dán vào Hỏi đáp
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Thanh tiến độ Checklist */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">Tiến độ mục tiêu tự học bài này</span>
                  <span className="text-primary tabular-nums">{checklistPct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-light">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${checklistPct}%` }}
                  />
                </div>
              </div>

              {/* Danh sách checklist */}
              <ul className="space-y-2">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-border/80 bg-background/60 px-3.5 py-2.5"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() =>
                          persistChecklist(
                            checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)),
                          )
                        }
                        className="size-4 rounded border-primary-pastel accent-primary cursor-pointer"
                      />
                      <span
                        className={cn(
                          "text-xs font-semibold transition-colors",
                          item.done ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                      >
                        {item.text}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => persistChecklist(checklist.filter((c) => c.id !== item.id))}
                      aria-label="Xóa mục tiêu"
                      className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-destructive-bg hover:text-destructive-foreground cursor-pointer"
                    >
                      <Trash2 className="size-3" animated={false} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Thêm mục tiêu mới */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = newTaskText.trim();
                  if (!clean) return;
                  persistChecklist([
                    ...checklist,
                    { id: `custom-${Date.now()}`, text: clean, done: false },
                  ]);
                  setNewTaskText("");
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Thêm mục tiêu nhỏ của riêng bạn cho bài này..."
                  className="h-9 flex-1 rounded-full border border-border bg-background px-3.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <Button size="sm" type="submit" leftIcon={<Plus className="size-3.5" />}>
                  Thêm
                </Button>
              </form>
            </div>
          )}
        </section>
      </div>

      {/* ── FLOATING MINI POMODORO PILL (KHI BẬT GHIM NỔI) ── */}
      {pinnedFloating && (
        <div className="fixed right-5 bottom-20 z-40 flex items-center gap-2.5 rounded-full border border-primary-pastel bg-surface/95 px-3.5 py-2 shadow-xl backdrop-blur-md">
          <Timer className="size-4 text-primary" animated={false} aria-hidden="true" />
          <span className="font-mono text-sm font-black text-foreground tabular-nums">
            {formatClock(secondsLeft)}
          </span>
          <button
            type="button"
            onClick={() => setIsRunning((p) => !p)}
            aria-label={isRunning ? "Tạm dừng Pomodoro" : "Chạy Pomodoro"}
            className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer"
          >
            {isRunning ? (
              <Pause className="size-3.5" animated={false} aria-hidden="true" />
            ) : (
              <Play className="size-3.5" animated={false} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setPinnedFloating(false)}
            aria-label="Bỏ ghim đồng hồ nổi"
            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground cursor-pointer"
          >
            <PinOff className="size-3.5" animated={false} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
