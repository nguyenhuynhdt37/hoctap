"use client";

import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { TtsVoiceOption } from "@/types/lecturer/flashcard";
import {
  ListeningQuizForm,
  ListeningScriptLine,
  ListeningSpeaker,
} from "@/types/lecturer/listening";
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Headphones,
  HelpCircle,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Trash2,
  Users,
  Volume2,
  X,
} from "pulsoicon-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

// ============================================
// HELPERS & CONSTANTS
// ============================================

export function createListeningUid(prefix = "ls"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const LISTENING_LANGUAGES = [
  { code: "en-GB", label: "Tiếng Anh (UK)" },
  { code: "en-US", label: "Tiếng Anh (US)" },
  { code: "zh-CN", label: "Tiếng Trung" },
  { code: "ja-JP", label: "Tiếng Nhật" },
  { code: "ko-KR", label: "Tiếng Hàn" },
  { code: "fr-FR", label: "Tiếng Pháp" },
  { code: "de-DE", label: "Tiếng Đức" },
  { code: "vi-VN", label: "Tiếng Việt" },
] as const;

const DEFAULT_VOICE_PAIRS: Record<string, [string, string]> = {
  "en-GB": ["edge-tts/en-GB-SoniaNeural", "edge-tts/en-GB-RyanNeural"],
  "en-US": ["edge-tts/en-US-AriaNeural", "edge-tts/en-US-GuyNeural"],
  "zh-CN": ["edge-tts/zh-CN-XiaoxiaoNeural", "edge-tts/zh-CN-YunxiNeural"],
  "ja-JP": ["edge-tts/ja-JP-NanamiNeural", "edge-tts/ja-JP-KeitaNeural"],
  "ko-KR": ["edge-tts/ko-KR-SunHiNeural", "edge-tts/ko-KR-InJoonNeural"],
  "fr-FR": ["edge-tts/fr-FR-DeniseNeural", "edge-tts/fr-FR-HenriNeural"],
  "de-DE": ["edge-tts/de-DE-KatjaNeural", "edge-tts/de-DE-ConradNeural"],
  "vi-VN": ["edge-tts/vi-VN-HoaiMyNeural", "edge-tts/vi-VN-NamMinhNeural"],
};

const SPEAKER_COLOR_PALETTE: Array<{
  key: "blue" | "rose" | "violet" | "amber";
  pill: string;
  rowAccent: string;
  avatar: string;
}> = [
  {
    key: "blue",
    pill: "bg-primary-light text-primary border-primary-pastel",
    rowAccent: "border-l-primary",
    avatar: "bg-primary text-primary-foreground",
  },
  {
    key: "rose",
    pill: "bg-secondary-light text-secondary-foreground border-secondary-pastel",
    rowAccent: "border-l-[#D16B8F]",
    avatar: "bg-[#D16B8F] text-white",
  },
  {
    key: "violet",
    pill: "bg-accent text-accent-foreground border-accent-border",
    rowAccent: "border-l-[#7E57C2]",
    avatar: "bg-[#7E57C2] text-white",
  },
  {
    key: "amber",
    pill: "bg-warning-bg text-warning-foreground border-warning-border",
    rowAccent: "border-l-[#C98A2C]",
    avatar: "bg-[#C98A2C] text-white",
  },
];

export function getSpeakerStyle(color?: string | null, index = 0) {
  const found = SPEAKER_COLOR_PALETTE.find((p) => p.key === color);
  return found || SPEAKER_COLOR_PALETTE[index % SPEAKER_COLOR_PALETTE.length];
}

export function createDefaultSpeakers(langCode = "en-GB"): ListeningSpeaker[] {
  const pair = DEFAULT_VOICE_PAIRS[langCode] || DEFAULT_VOICE_PAIRS["en-GB"];
  return [
    {
      id: "spk_1",
      name: "Anna",
      role: "Nhân vật A",
      voice_id: pair[0],
      color: "blue",
    },
    {
      id: "spk_2",
      name: "Ben",
      role: "Nhân vật B",
      voice_id: pair[1],
      color: "rose",
    },
  ];
}

export function createEmptyScriptLine(speakerId: string): ListeningScriptLine {
  return {
    id: createListeningUid("line"),
    speaker_id: speakerId,
    text: "",
    translation: "",
    start_ms: 0,
    end_ms: 0,
  };
}

export function createEmptyListeningQuiz(): ListeningQuizForm {
  return {
    uid: createListeningUid("q"),
    question: "",
    difficulty_level: 1,
    explanation: "",
    options: [
      { text: "", is_correct: true, feedback: "", position: 0 },
      { text: "", is_correct: false, feedback: "", position: 1 },
      { text: "", is_correct: false, feedback: "", position: 2 },
      { text: "", is_correct: false, feedback: "", position: 3 },
    ],
  };
}

function formatMs(ms?: number): string {
  if (!ms || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatSeconds(sec?: number): string {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "0:00";
  const mins = Math.floor(sec / 60);
  const rem = Math.floor(sec % 60);
  return `${mins}:${rem.toString().padStart(2, "0")}`;
}

// ============================================
// PROPS
// ============================================

export interface ListeningStudioState {
  lessonTitle: string;
  lessonDescription: string;
  langCode: string;
  scenario: string;
  speakers: ListeningSpeaker[];
  scriptLines: ListeningScriptLine[];
  audioUrl: string;
  durationSeconds: number;
  maxPlays: number;
  showTranscriptBeforeSubmit: boolean;
  passPercent: number;
  quizzes: ListeningQuizForm[];
}

interface ListeningStudioProps {
  mode: "create" | "edit";
  sectionName?: string;
  videoSections: StudioVideoSectionGroup[];
  state: ListeningStudioState;
  onChange: (
    updater: (prev: ListeningStudioState) => ListeningStudioState
  ) => void;
  onSave: (autoRenderAudio: boolean) => Promise<void>;
  onBack: () => void;
  onPreview?: () => void;
  isSubmitting: boolean;
  error?: string | null;
  savedBanner?: string | null;
}

// ============================================
// COMPONENT
// ============================================

export function ListeningStudio({
  mode,
  sectionName,
  videoSections,
  state,
  onChange,
  onSave,
  onBack,
  onPreview,
  isSubmitting,
  error,
  savedBanner,
}: ListeningStudioProps) {
  const [activeStep, setActiveStep] = useState<
    "script" | "quizzes" | "settings"
  >("script");
  const [showTranslations, setShowTranslations] = useState(true);
  const [isRenderingAudio, setIsRenderingAudio] = useState(false);
  const [audioDirty, setAudioDirty] = useState(false);

  // Mở sẵn bảng AI nếu kịch bản đang trống (mode create)
  const hasAnyScript = state.scriptLines.some((l) => l.text.trim().length > 0);
  const [aiPanelOpen, setAiPanelOpen] = useState(
    () => mode === "create" && !hasAnyScript
  );

  // Audio player state (đồng bộ Karaoke)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(
    null
  );

  // AI Generator state
  const [aiSourceMode, setAiSourceMode] = useState<"topic" | "video">("topic");
  const [aiTopic, setAiTopic] = useState("");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [aiTurns, setAiTurns] = useState<number>(10);
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(5);
  const [autoAudioAfterAi, setAutoAudioAfterAi] = useState<boolean>(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiStatusText, setAiStatusText] = useState<string>("");
  const [aiError, setAiError] = useState<string | null>(null);

  // Lấy danh sách giọng đọc chuẩn từ backend
  const { data: voicesRes } = useSWR<{ voices: TtsVoiceOption[] }>(
    "/lecturer/lessons/flashcards/voices",
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const voices = useMemo(() => voicesRes?.voices || [], [voicesRes]);

  const filteredVoices = useMemo(() => {
    if (!voices.length) return [];
    const prefix = state.langCode.split("-")[0].toLowerCase();
    const sameLang = voices.filter((v) =>
      v.lang_code.toLowerCase().startsWith(prefix)
    );
    return sameLang.length > 0 ? sameLang : voices;
  }, [voices, state.langCode]);

  const speakerMap = useMemo(() => {
    const map = new Map<string, { speaker: ListeningSpeaker; idx: number }>();
    state.speakers.forEach((s, idx) => map.set(s.id, { speaker: s, idx }));
    return map;
  }, [state.speakers]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const activeLineId = useMemo(() => {
    if (!isPlaying && currentTimeMs <= 0) return null;
    const found = state.scriptLines.find(
      (line) =>
        typeof line.start_ms === "number" &&
        typeof line.end_ms === "number" &&
        line.end_ms > line.start_ms &&
        currentTimeMs >= line.start_ms &&
        currentTimeMs <= line.end_ms + 120
    );
    return found?.id || null;
  }, [state.scriptLines, currentTimeMs, isPlaying]);

  // Nghe thử giọng 1 nhân vật
  const handlePreviewVoice = async (speaker: ListeningSpeaker) => {
    setPreviewingVoiceId(speaker.id);
    try {
      const sampleByLang: Record<string, string> = {
        "en-GB": `Hello, I am ${speaker.name}. Nice to meet you today.`,
        "en-US": `Hi there, I'm ${speaker.name}. Let's practice listening together.`,
        "zh-CN": `你好，我是${speaker.name}。很高兴认识你。`,
        "ja-JP": `こんにちは、${speaker.name}です。よろしくお願いします。`,
        "ko-KR": `안녕하세요, 저는 ${speaker.name}입니다. 반갑습니다.`,
        "fr-FR": `Bonjour, je suis ${speaker.name}. Enchanté.`,
        "de-DE": `Hallo, ich bin ${speaker.name}. Freut mich.`,
        "vi-VN": `Xin chào, mình là ${speaker.name}. Rất vui được gặp bạn.`,
      };
      const text =
        sampleByLang[state.langCode] ||
        `Hello, I am ${speaker.name}. Nice to meet you.`;
      const res = await api.post("/lecturer/lessons/flashcards/tts/preview", {
        text,
        lang_code: state.langCode,
        voice_id: speaker.voice_id,
      });
      if (res.data?.audio_url) {
        const audio = new Audio(res.data.audio_url);
        await audio.play();
      }
    } catch (err) {
      showToast.error(formatApiError(err, "Không thể phát thử giọng đọc"));
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  // Đổi ngôn ngữ -> cập nhật giọng mặc định
  const handleChangeLanguage = (newLang: string) => {
    const pair = DEFAULT_VOICE_PAIRS[newLang] || DEFAULT_VOICE_PAIRS["en-GB"];
    onChange((prev) => ({
      ...prev,
      langCode: newLang,
      speakers: prev.speakers.map((s, idx) => ({
        ...s,
        voice_id: pair[idx % pair.length],
      })),
    }));
    setAudioDirty(true);
  };

  // Quản lý nhân vật
  const handleAddSpeaker = () => {
    if (state.speakers.length >= 4) {
      showToast.error("Tối đa 4 nhân vật trong một hội thoại.");
      return;
    }
    const idx = state.speakers.length;
    const palette = SPEAKER_COLOR_PALETTE[idx % SPEAKER_COLOR_PALETTE.length];
    const defaultVoice =
      filteredVoices[idx % Math.max(filteredVoices.length, 1)]?.voice_id ||
      DEFAULT_VOICE_PAIRS[state.langCode]?.[idx % 2] ||
      "edge-tts/en-GB-SoniaNeural";
    onChange((prev) => ({
      ...prev,
      speakers: [
        ...prev.speakers,
        {
          id: createListeningUid("spk"),
          name: `Nhân vật ${idx + 1}`,
          role: "",
          voice_id: defaultVoice,
          color: palette.key,
        },
      ],
    }));
  };

  const handleUpdateSpeaker = (
    speakerId: string,
    patch: Partial<ListeningSpeaker>
  ) => {
    onChange((prev) => ({
      ...prev,
      speakers: prev.speakers.map((s) =>
        s.id === speakerId ? { ...s, ...patch } : s
      ),
    }));
    if (patch.voice_id) setAudioDirty(true);
  };

  const handleRemoveSpeaker = (speakerId: string) => {
    if (state.speakers.length <= 1) {
      showToast.error("Cần ít nhất 1 nhân vật.");
      return;
    }
    const fallbackId = state.speakers.find((s) => s.id !== speakerId)?.id || "";
    onChange((prev) => ({
      ...prev,
      speakers: prev.speakers.filter((s) => s.id !== speakerId),
      scriptLines: prev.scriptLines.map((line) =>
        line.speaker_id === speakerId ? { ...line, speaker_id: fallbackId } : line
      ),
    }));
    setAudioDirty(true);
  };

  // Click avatar để xoay vòng nhân vật nhanh (1 chạm)
  const handleCycleLineSpeaker = (line: ListeningScriptLine) => {
    if (state.speakers.length <= 1) return;
    const curIdx = state.speakers.findIndex((s) => s.id === line.speaker_id);
    const nextSpeaker =
      state.speakers[(curIdx + 1) % state.speakers.length] || state.speakers[0];
    handleUpdateLine(line.id, { speaker_id: nextSpeaker.id });
  };

  // Quản lý lời thoại
  const handleAddLine = () => {
    const lastLine = state.scriptLines[state.scriptLines.length - 1];
    let nextSpeakerId = state.speakers[0]?.id || "spk_1";
    if (lastLine && state.speakers.length > 1) {
      const lastIdx = state.speakers.findIndex(
        (s) => s.id === lastLine.speaker_id
      );
      nextSpeakerId =
        state.speakers[(lastIdx + 1) % state.speakers.length]?.id ||
        nextSpeakerId;
    }
    onChange((prev) => ({
      ...prev,
      scriptLines: [...prev.scriptLines, createEmptyScriptLine(nextSpeakerId)],
    }));
    setAudioDirty(true);
  };

  const handleUpdateLine = (
    lineId: string,
    patch: Partial<ListeningScriptLine>
  ) => {
    onChange((prev) => ({
      ...prev,
      scriptLines: prev.scriptLines.map((line) =>
        line.id === lineId ? { ...line, ...patch } : line
      ),
    }));
    if (patch.text !== undefined || patch.speaker_id !== undefined) {
      setAudioDirty(true);
    }
  };

  const handleRemoveLine = (lineId: string) => {
    onChange((prev) => ({
      ...prev,
      scriptLines: prev.scriptLines.filter((line) => line.id !== lineId),
    }));
    setAudioDirty(true);
  };

  const handleMoveLine = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= state.scriptLines.length) return;
    onChange((prev) => {
      const next = [...prev.scriptLines];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return { ...prev, scriptLines: next };
    });
    setAudioDirty(true);
  };

  // Hàm ghép Audio dùng chung (gọi trực tiếp hoặc sau khi AI sinh xong)
  const renderAudioForPayload = async (
    speakersPayload: ListeningSpeaker[],
    linesPayload: ListeningScriptLine[],
    langCode: string
  ) => {
    const validLines = linesPayload.filter((l) => l.text.trim().length > 0);
    if (validLines.length === 0) {
      showToast.error("Hãy nhập ít nhất 1 câu thoại trước khi tạo audio.");
      return false;
    }
    setIsRenderingAudio(true);
    try {
      const res = await api.post(
        "/lecturer/lessons/listening/render-audio",
        {
          lang_code: langCode,
          pause_ms: 420,
          speakers: speakersPayload,
          script_lines: validLines.map((l) => ({
            id: l.id,
            speaker_id: l.speaker_id,
            text: l.text.trim(),
            translation: (l.translation || "").trim(),
            start_ms: l.start_ms || 0,
            end_ms: l.end_ms || 0,
          })),
        },
        { timeout: 150_000 }
      );
      const data = res.data;
      onChange((prev) => ({
        ...prev,
        audioUrl: data.audio_url || prev.audioUrl,
        durationSeconds: Number(data.duration_seconds || 0),
        scriptLines: Array.isArray(data.script_lines)
          ? data.script_lines
          : prev.scriptLines,
      }));
      setAudioDirty(false);
      setCurrentTimeMs(0);
      setIsPlaying(false);
      showToast.success(
        `Đã tạo audio hội thoại (${formatSeconds(data.duration_seconds)})!`
      );
      return true;
    } catch (err) {
      showToast.error(
        formatApiError(err, "Không thể ghép audio hội thoại. Vui lòng thử lại.")
      );
      return false;
    } finally {
      setIsRenderingAudio(false);
    }
  };

  const handleRenderAudio = async () => {
    await renderAudioForPayload(
      state.speakers,
      state.scriptLines,
      state.langCode
    );
  };

  // Điều khiển audio preview
  const togglePlayAudio = () => {
    const el = audioRef.current;
    if (!el || !state.audioUrl) return;
    if (el.paused) {
      el.playbackRate = playbackRate;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const seekToLine = (line: ListeningScriptLine) => {
    const el = audioRef.current;
    if (!el || !state.audioUrl) return;
    const startSec = Math.max(0, (line.start_ms || 0) / 1000);
    el.currentTime = startSec;
    el.playbackRate = playbackRate;
    el.play().catch(() => {});
  };

  // AI sinh kịch bản + câu hỏi (+ tự ghép audio nếu được bật)
  const handleGenerateWithAi = async () => {
    if (aiSourceMode === "topic" && !aiTopic.trim()) {
      showToast.error("Hãy nhập chủ đề hội thoại để AI biên soạn.");
      return;
    }
    if (aiSourceMode === "video" && selectedVideoIds.length === 0) {
      showToast.error("Hãy chọn ít nhất 1 bài giảng Video.");
      return;
    }
    setIsGeneratingAi(true);
    setAiError(null);
    setAiStatusText("AI đang viết kịch bản hội thoại và câu hỏi...");
    try {
      const res = await api.post(
        "/lecturers/chat/lesson/listening",
        {
          topic: aiSourceMode === "topic" ? aiTopic.trim() : "",
          lesson_ids: aiSourceMode === "video" ? selectedVideoIds : [],
          lang_code: state.langCode,
          turns: aiTurns,
          question_count: aiQuestionCount,
        },
        { timeout: 150_000 }
      );
      const data = res.data;
      const nextSpeakers: ListeningSpeaker[] =
        Array.isArray(data.speakers) && data.speakers.length > 0
          ? data.speakers
          : state.speakers;
      const nextLines: ListeningScriptLine[] = Array.isArray(data.script_lines)
        ? data.script_lines.map(
            (l: ListeningScriptLine, idx: number): ListeningScriptLine => ({
              id: l.id || createListeningUid(`l${idx}`),
              speaker_id:
                l.speaker_id || nextSpeakers[idx % nextSpeakers.length].id,
              text: l.text || "",
              translation: l.translation || "",
              start_ms: 0,
              end_ms: 0,
            })
          )
        : [];
      const nextQuizzes: ListeningQuizForm[] = Array.isArray(data.quizzes)
        ? data.quizzes.map(
            (q: {
              question?: string;
              difficulty_level?: number;
              explanation?: string;
              options?: Array<{
                text?: string;
                is_correct?: boolean;
                feedback?: string;
                position?: number;
              }>;
            }): ListeningQuizForm => ({
              uid: createListeningUid("q"),
              question: q.question || "",
              difficulty_level: Number(q.difficulty_level || 1),
              explanation: q.explanation || "",
              options: (q.options || []).slice(0, 4).map((opt, idx) => ({
                text: opt.text || "",
                is_correct: Boolean(opt.is_correct),
                feedback: opt.feedback || "",
                position: idx,
              })),
            })
          )
        : [];

      onChange((prev) => ({
        ...prev,
        lessonTitle: prev.lessonTitle.trim()
          ? prev.lessonTitle
          : data.title || prev.lessonTitle,
        scenario: data.scenario || prev.scenario,
        speakers: nextSpeakers,
        scriptLines: nextLines.length > 0 ? nextLines : prev.scriptLines,
        quizzes: nextQuizzes.length > 0 ? nextQuizzes : prev.quizzes,
        audioUrl: "",
        durationSeconds: 0,
      }));
      setAudioDirty(true);

      if (autoAudioAfterAi && nextLines.length > 0) {
        setAiStatusText("Đang ghép giọng đọc bản xứ cho các nhân vật...");
        await renderAudioForPayload(nextSpeakers, nextLines, state.langCode);
      } else {
        showToast.success(
          `AI đã viết ${nextLines.length} câu thoại & ${nextQuizzes.length} câu hỏi!`
        );
      }
      setAiPanelOpen(false);
    } catch (err) {
      const msg = formatApiError(
        err,
        "AI không thể tạo kịch bản hội thoại lúc này."
      );
      setAiError(msg);
      showToast.error(msg);
    } finally {
      setIsGeneratingAi(false);
      setAiStatusText("");
    }
  };

  // Quản lý câu hỏi nghe-hiểu
  const handleAddQuiz = () => {
    onChange((prev) => ({
      ...prev,
      quizzes: [...prev.quizzes, createEmptyListeningQuiz()],
    }));
  };

  const handleUpdateQuiz = (
    uid: string,
    patch: Partial<ListeningQuizForm>
  ) => {
    onChange((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((q) => (q.uid === uid ? { ...q, ...patch } : q)),
    }));
  };

  const handleUpdateQuizOption = (
    uid: string,
    optIdx: number,
    text: string
  ) => {
    onChange((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((q) => {
        if (q.uid !== uid) return q;
        return {
          ...q,
          options: q.options.map((o, idx) =>
            idx === optIdx ? { ...o, text } : o
          ),
        };
      }),
    }));
  };

  const handleSetCorrectOption = (uid: string, optIdx: number) => {
    onChange((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((q) => {
        if (q.uid !== uid) return q;
        return {
          ...q,
          options: q.options.map((o, idx) => ({
            ...o,
            is_correct: idx === optIdx,
          })),
        };
      }),
    }));
  };

  const handleRemoveQuiz = (uid: string) => {
    onChange((prev) => ({
      ...prev,
      quizzes: prev.quizzes.filter((q) => q.uid !== uid),
    }));
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  };

  const validLineCount = state.scriptLines.filter((l) => l.text.trim()).length;
  const validQuizCount = state.quizzes.filter((q) => q.question.trim()).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 1. TOP BAR GỌN GÀNG, CHỈ CHỨA HÀNH ĐỘNG CHÍNH */}
      <div className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Quay lại</span>
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                <Headphones className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {state.lessonTitle.trim() ||
                    (mode === "create"
                      ? "Bài Luyện Nghe mới"
                      : "Chỉnh sửa bài Luyện Nghe")}
                </p>
                {sectionName && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {sectionName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAiPanelOpen((v) => !v)}
              className={`gap-1.5 ${
                aiPanelOpen
                  ? "border-primary bg-primary-light text-primary"
                  : ""
              }`}
            >
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Tạo bằng AI</span>
            </Button>
            {onPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPreview}
                className="gap-1.5"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Xem trước</span>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => onSave(audioDirty || !state.audioUrl)}
              disabled={isSubmitting || isRenderingAudio || isGeneratingAi}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSubmitting
                ? "Đang lưu..."
                : mode === "create"
                  ? "Tạo bài học"
                  : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. THÂN TRANG TẬP TRUNG (SINGLE-FOCUS WORKSPACE) */}
      <div className="mx-auto max-w-6xl space-y-5 px-4 pt-6 sm:px-6">
        {error && (
          <Alert variant="destructive" title="Có lỗi xảy ra">
            {error}
          </Alert>
        )}
        {savedBanner && (
          <Alert variant="success" title="Đã lưu thành công">
            {savedBanner}
          </Alert>
        )}

        {/* Thanh nhập Tên bài học + Ngôn ngữ trên cùng (1 hàng sạch đẹp) */}
        <Card className="border-border bg-surface p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-8">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Tên bài Luyện Nghe <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={state.lessonTitle}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, lessonTitle: e.target.value }))
                }
                placeholder="VD: Đặt phòng khách sạn tại London (B1)"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-base font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Ngôn ngữ giọng đọc
              </label>
              <select
                value={state.langCode}
                onChange={(e) => handleChangeLanguage(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {LISTENING_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* BẢNG TRỢ LÝ AI (MỞ/ĐÓNG GỌN NGAY ĐẦU TRANG) */}
        {aiPanelOpen && (
          <Card className="border-primary-pastel bg-gradient-to-br from-primary-light/60 via-surface to-accent/25 p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Tạo nhanh bằng AI (Kịch bản + Giọng đọc + Câu hỏi)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Nhập tình huống hoặc chọn Video bài giảng — AI sẽ tự viết hội thoại 2 nhân vật và bộ câu hỏi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiPanelOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                aria-label="Đóng bảng AI"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="space-y-3 md:col-span-8">
                <div className="inline-flex rounded-xl border border-border bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setAiSourceMode("topic")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      aiSourceMode === "topic"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Nhập chủ đề tự do
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSourceMode("video")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      aiSourceMode === "video"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Lấy từ Video khóa học
                  </button>
                </div>

                {aiSourceMode === "topic" ? (
                  <textarea
                    rows={4}
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="VD: Cuộc gọi đặt bàn ăn tối cho 4 người tại nhà hàng Ý, hỏi về món chay và giờ mở cửa (trình độ B1)..."
                    className="min-h-[108px] w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-foreground outline-none focus:border-primary"
                  />
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-3.5">
                    {videoSections.length === 0 ? (
                      <p className="py-3 text-center text-xs text-muted-foreground">
                        Chưa có bài Video nào đã phân tích AI trong khóa học này.
                      </p>
                    ) : (
                      videoSections.map((group) => (
                        <div key={group.sectionId} className="space-y-1">
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            {group.sectionTitle}
                          </p>
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {group.videos.map((v) => (
                              <label
                                key={v.id}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs hover:bg-primary-light/40"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedVideoIds.includes(v.id)}
                                  onChange={() => toggleVideoSelection(v.id)}
                                  className="h-3.5 w-3.5 accent-primary"
                                />
                                <span className="truncate text-foreground">
                                  {v.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between gap-3 md:col-span-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Số câu thoại
                    </label>
                    <select
                      value={aiTurns}
                      onChange={(e) => setAiTurns(Number(e.target.value))}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground outline-none"
                    >
                      {[6, 8, 10, 12, 14].map((n) => (
                        <option key={n} value={n}>
                          {n} câu
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Số câu hỏi
                    </label>
                    <select
                      value={aiQuestionCount}
                      onChange={(e) =>
                        setAiQuestionCount(Number(e.target.value))
                      }
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground outline-none"
                    >
                      {[3, 4, 5, 6, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} câu
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={autoAudioAfterAi}
                    onChange={(e) => setAutoAudioAfterAi(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>Tự ghép Audio ngay sau khi viết xong</span>
                </label>

                <Button
                  type="button"
                  onClick={handleGenerateWithAi}
                  disabled={isGeneratingAi || isRenderingAudio}
                  className="w-full gap-2"
                >
                  {isGeneratingAi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                  {isGeneratingAi
                    ? aiStatusText || "Đang xử lý..."
                    : "Bắt đầu tạo bằng AI"}
                </Button>
              </div>
            </div>

            {aiError && (
              <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs text-destructive">
                {aiError}
              </p>
            )}
          </Card>
        )}

        {/* 3. THANH 3 BƯỚC RÕ RÀNG */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveStep("script")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeStep === "script"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-muted-foreground hover:bg-primary-light/50 hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              1. Kịch bản &amp; Audio
              <span className="rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-bold text-foreground">
                {validLineCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep("quizzes")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeStep === "quizzes"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-muted-foreground hover:bg-primary-light/50 hover:text-foreground"
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              2. Câu hỏi Nghe-Hiểu
              <span className="rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-bold text-foreground">
                {validQuizCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep("settings")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeStep === "settings"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-muted-foreground hover:bg-primary-light/50 hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              3. Cài đặt Phòng thi
            </button>
          </div>

          {/* Trạng thái Audio nhanh */}
          <div className="flex items-center gap-2">
            {state.audioUrl ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                  audioDirty
                    ? "border-warning-border bg-warning-bg text-warning-foreground"
                    : "border-success-border bg-success-bg text-success-foreground"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {audioDirty
                  ? "Kịch bản đã sửa · Cần ghép lại Audio"
                  : `Audio sẵn sàng (${formatSeconds(state.durationSeconds)})`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
                Chưa có file Audio
              </span>
            )}
          </div>
        </div>

        {/* =========================================
            BƯỚC 1: KỊCH BẢN & AUDIO (TOÀN CHIỀU RỘNG)
           ========================================= */}
        {activeStep === "script" && (
          <div className="space-y-4">
            {/* Dải Dàn Nhân Vật nằm ngang gọn đẹp */}
            <Card className="border-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Dàn nhân vật &amp; Giọng đọc ({state.speakers.length}/4)
                  </h3>
                </div>
                {state.speakers.length < 4 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddSpeaker}
                    className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary-light"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm nhân vật
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {state.speakers.map((speaker, idx) => {
                  const style = getSpeakerStyle(speaker.color, idx);
                  return (
                    <div
                      key={speaker.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/60 p-2.5"
                    >
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.avatar}`}
                      >
                        {speaker.name.slice(0, 1).toUpperCase() || "A"}
                      </span>
                      <input
                        type="text"
                        value={speaker.name}
                        onChange={(e) =>
                          handleUpdateSpeaker(speaker.id, {
                            name: e.target.value,
                          })
                        }
                        placeholder="Tên nhân vật"
                        className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary sm:w-36"
                      />
                      <select
                        value={speaker.voice_id}
                        onChange={(e) =>
                          handleUpdateSpeaker(speaker.id, {
                            voice_id: e.target.value,
                          })
                        }
                        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                      >
                        {filteredVoices.map((v) => (
                          <option key={v.voice_id} value={v.voice_id}>
                            {v.label}
                          </option>
                        ))}
                        {!filteredVoices.some(
                          (v) => v.voice_id === speaker.voice_id
                        ) && (
                          <option value={speaker.voice_id}>
                            {speaker.voice_id}
                          </option>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => handlePreviewVoice(speaker)}
                        disabled={previewingVoiceId === speaker.id}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-surface px-2 text-xs text-foreground transition hover:border-primary hover:text-primary"
                        title="Nghe thử giọng"
                      >
                        {previewingVoiceId === speaker.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {state.speakers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSpeaker(speaker.id)}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Xóa nhân vật"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Thanh Audio Master Bar gọn, rõ ràng */}
            <Card className="border-primary-pastel bg-primary-light/35 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    onClick={handleRenderAudio}
                    disabled={
                      isRenderingAudio ||
                      isGeneratingAi ||
                      validLineCount === 0
                    }
                    size="sm"
                    className="gap-2"
                  >
                    {isRenderingAudio ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {isRenderingAudio
                      ? "Đang ghép giọng đọc..."
                      : state.audioUrl
                        ? "Ghép lại Audio"
                        : "Tạo Audio Hội Thoại"}
                  </Button>

                  {state.audioUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={togglePlayAudio}
                      className="gap-1.5 bg-surface"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {isPlaying ? "Tạm dừng" : "Nghe thử"}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {state.audioUrl && (
                    <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-0.5">
                      {[0.75, 1, 1.25].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setPlaybackRate(rate)}
                          className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                            playbackRate === rate
                              ? "bg-primary-light text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowTranslations((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {showTranslations ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        Ẩn dòng dịch
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Hiện dòng dịch
                      </>
                    )}
                  </button>
                </div>
              </div>

              {state.audioUrl && (
                <div className="mt-3 rounded-xl border border-border bg-surface px-3 py-1.5">
                  <audio
                    ref={audioRef}
                    src={state.audioUrl}
                    controls
                    className="h-9 w-full"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onTimeUpdate={(e) =>
                      setCurrentTimeMs(
                        Math.floor(e.currentTarget.currentTime * 1000)
                      )
                    }
                  />
                </div>
              )}
            </Card>

            {/* Trình biên tập Kịch bản kiểu Podcast Script — Sạch, Gọn, Dễ Đọc */}
            <Card className="overflow-hidden border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border bg-background/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Mẹo: Bấm vào <strong>tên nhân vật</strong> bên trái để đổi người nói nhanh. Bấm nút <strong>▶</strong> để nghe đúng câu đó.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  className="h-8 gap-1.5 bg-surface text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm câu thoại
                </Button>
              </div>

              <div className="divide-y divide-border/70">
                {state.scriptLines.map((line, index) => {
                  const info = speakerMap.get(line.speaker_id);
                  const speakerIdx = info?.idx ?? 0;
                  const speakerName = info?.speaker.name || "Nhân vật";
                  const style = getSpeakerStyle(
                    info?.speaker.color,
                    speakerIdx
                  );
                  const isActive = activeLineId === line.id;
                  const hasTiming =
                    typeof line.end_ms === "number" &&
                    typeof line.start_ms === "number" &&
                    line.end_ms > line.start_ms;

                  return (
                    <div
                      key={line.id}
                      className={`group flex flex-col gap-2.5 border-l-4 px-4 py-3 transition sm:flex-row sm:items-start ${
                        style.rowAccent
                      } ${
                        isActive
                          ? "bg-primary-light/55"
                          : "hover:bg-background/60"
                      }`}
                    >
                      {/* Cột Nhân vật + Mốc thời gian */}
                      <div className="flex shrink-0 items-center justify-between gap-2 sm:w-36 sm:flex-col sm:items-start">
                        <button
                          type="button"
                          onClick={() => handleCycleLineSpeaker(line)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-85 ${style.pill}`}
                          title="Bấm để đổi nhanh sang nhân vật khác"
                        >
                          <span className="text-[10px] opacity-70">
                            {index + 1}.
                          </span>
                          <span className="max-w-[92px] truncate">
                            {speakerName}
                          </span>
                        </button>

                        {hasTiming && (
                          <button
                            type="button"
                            onClick={() => seekToLine(line)}
                            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 font-mono text-[11px] text-primary hover:bg-primary-light"
                            title="Phát từ câu này"
                          >
                            <Play className="h-3 w-3" />
                            {formatMs(line.start_ms)}
                          </button>
                        )}
                      </div>

                      {/* Cột Nội dung câu thoại + Dịch */}
                      <div className="min-w-0 flex-1 space-y-2">
                        <textarea
                          rows={2}
                          value={line.text}
                          onChange={(e) =>
                            handleUpdateLine(line.id, { text: e.target.value })
                          }
                          placeholder="Nhập lời thoại ngoại ngữ..."
                          className="min-h-[62px] w-full resize-y rounded-xl border border-border/70 bg-background/60 px-3.5 py-2.5 text-sm leading-relaxed font-medium text-foreground outline-none transition hover:border-border focus:border-primary focus:bg-surface"
                        />
                        {showTranslations && (
                          <textarea
                            rows={2}
                            value={line.translation || ""}
                            onChange={(e) =>
                              handleUpdateLine(line.id, {
                                translation: e.target.value,
                              })
                            }
                            placeholder="Bản dịch tiếng Việt (tuỳ chọn)..."
                            className="min-h-[54px] w-full resize-y rounded-xl border border-border/60 bg-background/40 px-3.5 py-2 text-sm leading-relaxed text-muted-foreground outline-none transition hover:border-border focus:border-primary focus:bg-surface focus:text-foreground"
                          />
                        )}
                      </div>

                      {/* Nút thao tác gọn nhẹ */}
                      <div className="flex shrink-0 items-center justify-end gap-0.5 opacity-80 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleMoveLine(index, -1)}
                          disabled={index === 0}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-background disabled:opacity-25"
                          aria-label="Lên trên"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveLine(index, 1)}
                          disabled={index === state.scriptLines.length - 1}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-background disabled:opacity-25"
                          aria-label="Xuống dưới"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Xóa câu thoại"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-border bg-background/40 px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddLine}
                  className="gap-1.5 text-primary hover:bg-primary-light"
                >
                  <Plus className="h-4 w-4" />
                  Thêm lượt thoại tiếp theo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveStep("quizzes")}
                  className="gap-1.5 bg-surface"
                >
                  Tiếp tục: Soạn câu hỏi ({validQuizCount}) →
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* =========================================
            BƯỚC 2: CÂU HỎI NGHE-HIỂU + ĐỐI CHIẾU KỊCH BẢN
           ========================================= */}
        {activeStep === "quizzes" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Cột trái 8 cột: Soạn câu hỏi */}
            <div className="space-y-4 lg:col-span-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Bộ câu hỏi Nghe-Hiểu ({state.quizzes.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Bấm vào chữ cái A/B/C/D để chọn đáp án đúng.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddQuiz}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Thêm câu hỏi
                </Button>
              </div>

              {state.quizzes.length === 0 ? (
                <Card className="border-dashed border-border bg-surface p-10 text-center">
                  <HelpCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-semibold text-foreground">
                    Chưa có câu hỏi nào
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bạn có thể bấm &quot;Tạo bằng AI&quot; ở góc trên hoặc tự thêm câu hỏi mới.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddQuiz}
                    className="mt-4 gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm câu hỏi đầu tiên
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {state.quizzes.map((quiz, qIdx) => (
                    <Card
                      key={quiz.uid}
                      className="space-y-3 border-border bg-surface p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="border-primary-pastel bg-primary-light text-primary"
                        >
                          Câu {qIdx + 1}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuiz(quiz.uid)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Xóa câu hỏi"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={quiz.question}
                        onChange={(e) =>
                          handleUpdateQuiz(quiz.uid, {
                            question: e.target.value,
                          })
                        }
                        placeholder="Nhập câu hỏi dựa trên đoạn hội thoại..."
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
                      />

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {quiz.options.map((opt, optIdx) => {
                          const letter = ["A", "B", "C", "D"][optIdx] || "?";
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition ${
                                opt.is_correct
                                  ? "border-success-border bg-success-bg/75"
                                  : "border-border bg-background/50"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetCorrectOption(quiz.uid, optIdx)
                                }
                                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                                  opt.is_correct
                                    ? "border-success-foreground bg-success-foreground text-white"
                                    : "border-border bg-surface text-muted-foreground hover:border-primary"
                                }`}
                                title="Đặt làm đáp án đúng"
                              >
                                {opt.is_correct ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  letter
                                )}
                              </button>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) =>
                                  handleUpdateQuizOption(
                                    quiz.uid,
                                    optIdx,
                                    e.target.value
                                  )
                                }
                                placeholder={`Phương án ${letter}...`}
                                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <textarea
                        rows={2}
                        value={quiz.explanation}
                        onChange={(e) =>
                          handleUpdateQuiz(quiz.uid, {
                            explanation: e.target.value,
                          })
                        }
                        placeholder="Giải thích đáp án (hiển thị sau khi học viên nộp bài)..."
                        className="min-h-[60px] w-full resize-y rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none focus:border-primary"
                      />
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Cột phải 4 cột: Khung đối chiếu Kịch bản thu gọn */}
            <div className="lg:col-span-4">
              <Card className="sticky top-20 flex max-h-[75vh] flex-col border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Đối chiếu kịch bản ({validLineCount} câu)
                  </h3>
                </div>
                <div className="flex-1 space-y-2.5 overflow-y-auto p-4 text-sm">
                  {state.scriptLines
                    .filter((l) => l.text.trim())
                    .map((line, i) => {
                      const info = speakerMap.get(line.speaker_id);
                      return (
                        <div
                          key={line.id}
                          className="rounded-xl border border-border/70 bg-background/60 p-2.5"
                        >
                          <p className="font-semibold text-primary">
                            {i + 1}. {info?.speaker.name || "Nhân vật"}
                          </p>
                          <p className="mt-0.5 text-foreground">{line.text}</p>
                          {line.translation && (
                            <p className="mt-0.5 italic text-muted-foreground">
                              {line.translation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* =========================================
            BƯỚC 3: CÀI ĐẶT PHÒNG THI (GỌN, TRỰC QUAN)
           ========================================= */}
        {activeStep === "settings" && (
          <Card className="mx-auto max-w-3xl space-y-6 border-border bg-surface p-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Cài đặt Phòng Luyện Nghe
              </h2>
              <p className="text-xs text-muted-foreground">
                Tùy chỉnh trải nghiệm nghe cho học viên (chế độ tự luyện hay phòng thi IELTS/TOEIC).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Mô tả bối cảnh tình huống (hiển thị phía trên trình phát audio)
              </label>
              <textarea
                rows={3}
                value={state.scenario}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, scenario: e.target.value }))
                }
                placeholder="VD: Bạn sẽ nghe cuộc hội thoại giữa lễ tân khách sạn và khách du lịch khi nhận phòng..."
                className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Giới hạn số lần nghe trước khi nộp bài
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { value: 0, label: "Không giới hạn", sub: "Tự luyện thoải mái" },
                  { value: 1, label: "1 lượt nghe", sub: "Chuẩn thi thật" },
                  { value: 2, label: "2 lượt nghe", sub: "Chuẩn IELTS/HSK" },
                  { value: 3, label: "3 lượt nghe", sub: "Dễ thở hơn" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({ ...prev, maxPlays: opt.value }))
                    }
                    className={`rounded-xl border p-3 text-left transition ${
                      state.maxPlays === opt.value
                        ? "border-primary bg-primary-light/70 text-primary"
                        : "border-border bg-background/60 text-foreground hover:border-primary/40"
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {opt.sub}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Điểm tối thiểu để hoàn thành bài học
                </label>
                <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-bold text-primary">
                  {state.passPercent}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={10}
                value={state.passPercent}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    passPercent: Number(e.target.value),
                  }))
                }
                className="w-full cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>50%</span>
                <span>70% (Khuyên dùng)</span>
                <span>100%</span>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/60 p-4">
              <input
                type="checkbox"
                checked={state.showTranscriptBeforeSubmit}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    showTranscriptBeforeSubmit: e.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Cho phép xem phụ đề Karaoke trước khi nộp bài
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mặc định tắt để học viên tập trung luyện nghe; phụ đề Karaoke + bản dịch sẽ tự động mở khóa ngay sau khi học viên nộp bài.
                </p>
              </div>
            </label>
          </Card>
        )}
      </div>
    </div>
  );
}
