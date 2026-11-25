"use client";

import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  FlashcardStudioItem,
  TtsVoiceOption,
} from "@/types/lecturer/flashcard";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  FolderOpen,
  Globe,
  Layers,
  Lightbulb,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Video,
  Volume2,
  X,
} from "pulsoicon-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

// ============================================
// CONSTANTS & HELPERS
// ============================================

export const DEFAULT_TTS_VOICES: TtsVoiceOption[] = [
  {
    voice_id: "edge-tts/en-US-AriaNeural",
    lang_code: "en-US",
    language: "Tiếng Anh (Mỹ)",
    label: "Aria — Nữ (Anh-Mỹ tự nhiên)",
    gender: "female",
    badge: "US",
  },
  {
    voice_id: "edge-tts/en-US-GuyNeural",
    lang_code: "en-US",
    language: "Tiếng Anh (Mỹ)",
    label: "Guy — Nam (Anh-Mỹ chuẩn)",
    gender: "male",
    badge: "US",
  },
  {
    voice_id: "edge-tts/en-GB-SoniaNeural",
    lang_code: "en-GB",
    language: "Tiếng Anh (Anh — IELTS)",
    label: "Sonia — Nữ (Anh-Anh chuẩn IELTS)",
    gender: "female",
    badge: "UK",
  },
  {
    voice_id: "edge-tts/en-GB-RyanNeural",
    lang_code: "en-GB",
    language: "Tiếng Anh (Anh — IELTS)",
    label: "Ryan — Nam (Anh-Anh chuẩn IELTS)",
    gender: "male",
    badge: "UK",
  },
  {
    voice_id: "edge-tts/zh-CN-XiaoxiaoNeural",
    lang_code: "zh-CN",
    language: "Tiếng Trung (Phổ thông — HSK)",
    label: "Xiaoxiao — Nữ (Phổ thông chuẩn HSK)",
    gender: "female",
    badge: "CN",
  },
  {
    voice_id: "edge-tts/zh-CN-YunxiNeural",
    lang_code: "zh-CN",
    language: "Tiếng Trung (Phổ thông — HSK)",
    label: "Yunxi — Nam (Phổ thông Bắc Kinh)",
    gender: "male",
    badge: "CN",
  },
  {
    voice_id: "edge-tts/vi-VN-HoaiMyNeural",
    lang_code: "vi-VN",
    language: "Tiếng Việt",
    label: "Hoài My — Nữ (Tiếng Việt chuẩn)",
    gender: "female",
    badge: "VN",
  },
  {
    voice_id: "edge-tts/vi-VN-NamMinhNeural",
    lang_code: "vi-VN",
    language: "Tiếng Việt",
    label: "Nam Minh — Nam (Tiếng Việt chuẩn)",
    gender: "male",
    badge: "VN",
  },
  {
    voice_id: "edge-tts/ja-JP-NanamiNeural",
    lang_code: "ja-JP",
    language: "Tiếng Nhật (JLPT)",
    label: "Nanami — Nữ (Chuẩn Tokyo)",
    gender: "female",
    badge: "JP",
  },
  {
    voice_id: "edge-tts/ko-KR-SunHiNeural",
    lang_code: "ko-KR",
    language: "Tiếng Hàn (TOPIK)",
    label: "SunHi — Nữ (Chuẩn Seoul)",
    gender: "female",
    badge: "KR",
  },
];

const QUICK_LANG_PRESETS = [
  { badge: "US", label: "Anh-Mỹ", voice_id: "edge-tts/en-US-AriaNeural" },
  { badge: "UK", label: "Anh-Anh", voice_id: "edge-tts/en-GB-SoniaNeural" },
  { badge: "CN", label: "Trung HSK", voice_id: "edge-tts/zh-CN-XiaoxiaoNeural" },
  { badge: "VN", label: "Tiếng Việt", voice_id: "edge-tts/vi-VN-HoaiMyNeural" },
  { badge: "JP", label: "Tiếng Nhật", voice_id: "edge-tts/ja-JP-NanamiNeural" },
  { badge: "KR", label: "Tiếng Hàn", voice_id: "edge-tts/ko-KR-SunHiNeural" },
];

const PART_OF_SPEECH_SUGGESTIONS = [
  "noun",
  "verb",
  "adj",
  "adv",
  "idiom",
  "phrase",
  "concept",
];

const DIFFICULTY_META: Record<
  number,
  { short: string; cls: string; dot: string }
> = {
  1: {
    short: "Dễ",
    cls: "bg-success-bg text-success-foreground border-success-border",
    dot: "bg-success",
  },
  2: {
    short: "TB",
    cls: "bg-warning-bg text-warning-foreground border-warning-border",
    dot: "bg-warning",
  },
  3: {
    short: "Khó",
    cls: "bg-secondary-light text-secondary-foreground border-secondary-pastel",
    dot: "bg-secondary-foreground",
  },
};

export function createFlashcardUid(): string {
  return `fc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyFlashcard(
  langCode = "en-US",
  voiceId = "edge-tts/en-US-AriaNeural"
): FlashcardStudioItem {
  return {
    uid: createFlashcardUid(),
    front_text: "",
    back_text: "",
    phonetic: "",
    part_of_speech: "",
    example_sentence: "",
    example_translation: "",
    hint: "",
    lang_code: langCode,
    voice_id: voiceId,
    audio_url: "",
    example_audio_url: "",
    difficulty_level: 1,
    position: 0,
  };
}

export function getFlashcardIssues(card: FlashcardStudioItem): string[] {
  const issues: string[] = [];
  if (!card.front_text.trim()) issues.push("Thiếu Mặt trước");
  if (!card.back_text.trim()) issues.push("Thiếu Mặt sau");
  return issues;
}

// ============================================
// PROPS
// ============================================

export interface FlashcardStudioProps {
  mode: "create" | "edit";
  sectionName?: string;
  lessonTitle: string;
  onLessonTitleChange: (val: string) => void;
  lessonDescription: string;
  onLessonDescriptionChange: (val: string) => void;
  cards: FlashcardStudioItem[];
  onCardsChange: (
    updater: (prev: FlashcardStudioItem[]) => FlashcardStudioItem[]
  ) => void;
  videoSections: StudioVideoSectionGroup[];
  isSubmitting: boolean;
  hasChanges?: boolean;
  error: string | null;
  onClearError?: () => void;
  successBanner?: {
    title: string;
    description: string;
    lessonId?: string | null;
  } | null;
  onSubmit: (autoGenerateAudio: boolean) => Promise<void> | void;
  onBackToChapters: () => void;
  onOpenResources?: (lessonId: string) => void;
  onOpenEdit?: (lessonId: string) => void;
  onOpenPreview?: (lessonId: string) => void;
}

// ============================================
// MAIN VISUAL DECK STUDIO COMPONENT
// ============================================

export function FlashcardStudio({
  mode,
  sectionName,
  lessonTitle,
  onLessonTitleChange,
  lessonDescription,
  onLessonDescriptionChange,
  cards,
  onCardsChange,
  videoSections,
  isSubmitting,
  hasChanges = true,
  error,
  onClearError,
  successBanner,
  onSubmit,
  onBackToChapters,
  onOpenResources,
  onOpenEdit,
  onOpenPreview,
}: FlashcardStudioProps) {
  // Chế độ làm việc: "deck" (Danh sách thẻ 2 mặt song song) | "stage" (Lật thử 3D toàn bộ bộ thẻ)
  const [workspaceMode, setWorkspaceMode] = useState<"deck" | "stage">("deck");
  const [stageIndex, setStageIndex] = useState(0);
  const [stageFlipped, setStageFlipped] = useState(false);

  // Các bảng công cụ mở nhanh (AI / Bulk Import)
  const [activeTool, setActiveTool] = useState<"none" | "ai" | "import">("none");
  const [bulkImportText, setBulkImportText] = useState("");
  const [expandedExtras, setExpandedExtras] = useState<Record<string, boolean>>({});

  // Cấu hình giọng đọc & AI
  const [defaultVoiceId, setDefaultVoiceId] = useState("edge-tts/en-US-AriaNeural");
  const [autoGenerateOnSave, setAutoGenerateOnSave] = useState(true);
  const [aiScopeMode, setAiScopeMode] = useState<"single" | "multiple" | "chapter">(
    "multiple"
  );
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [aiApplyMode, setAiApplyMode] = useState<"append" | "replace">("append");

  // Loading states
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [isBatchSynthesizing, setIsBatchSynthesizing] = useState(false);
  const [synthesizingMap, setSynthesizingMap] = useState<Record<string, boolean>>(
    {}
  );

  // Audio playback
  const [playbackRate, setPlaybackRate] = useState<0.75 | 1 | 1.25>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toolPanelRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: voicesData } = useSWR<{ voices: TtsVoiceOption[] }>(
    "/lecturer/lessons/flashcards/voices",
    async (url: string) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch {
        return { voices: DEFAULT_TTS_VOICES };
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const voices =
    voicesData?.voices && voicesData.voices.length > 0
      ? voicesData.voices
      : DEFAULT_TTS_VOICES;

  const selectedDefaultVoice = useMemo(
    () => voices.find((v) => v.voice_id === defaultVoiceId) || voices[0],
    [voices, defaultVoiceId]
  );

  const allVideoLessons = useMemo(
    () => videoSections.flatMap((g) => g.videos),
    [videoSections]
  );

  useEffect(() => {
    if (stageIndex >= cards.length && cards.length > 0) {
      setStageIndex(cards.length - 1);
    }
  }, [cards.length, stageIndex]);

  // Phím tắt Cmd/Ctrl + Enter để thêm nhanh thẻ mới khi đang soạn
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && workspaceMode === "deck") {
        e.preventDefault();
        const item = createEmptyFlashcard(
          selectedDefaultVoice.lang_code,
          selectedDefaultVoice.voice_id
        );
        onCardsChange((prev) => [...prev, item]);
        requestAnimationFrame(() => {
          cardRefs.current[item.uid]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
      }
      if (workspaceMode === "stage" && cards.length > 0) {
        if (e.code === "Space") {
          e.preventDefault();
          setStageFlipped((v) => !v);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setStageFlipped(false);
          setStageIndex((i) => Math.min(cards.length - 1, i + 1));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setStageFlipped(false);
          setStageIndex((i) => Math.max(0, i - 1));
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [workspaceMode, cards.length, selectedDefaultVoice, onCardsChange]);

  const stats = useMemo(() => {
    const total = cards.length;
    const validCount = cards.filter(
      (c) => getFlashcardIssues(c).length === 0
    ).length;
    const withAudioCount = cards.filter((c) => Boolean(c.audio_url?.trim())).length;
    const hasTitle = lessonTitle.trim().length > 0;
    const readinessPercent = Math.min(
      100,
      (hasTitle ? 20 : 0) +
        (total > 0 ? Math.round((validCount / total) * 60) : 0) +
        (total > 0 ? Math.round((withAudioCount / total) * 20) : 0)
    );
    const firstInvalidIdx = cards.findIndex(
      (c) => getFlashcardIssues(c).length > 0
    );
    return {
      total,
      validCount,
      withAudioCount,
      hasTitle,
      readinessPercent,
      firstInvalidIdx,
    };
  }, [cards, lessonTitle]);

  // ============================================
  // AUDIO & TTS
  // ============================================

  const playAudioUrl = (url: string, rate = playbackRate) => {
    if (!url) return;
    try {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audio.playbackRate = rate;
      audioRef.current = audio;
      void audio.play().catch(() => {
        showToast.error("Hãy bấm lại nút Loa để nghe âm thanh.");
      });
    } catch {
      showToast.error("Không thể phát âm thanh.");
    }
  };

  const updateCardByUid = (
    uid: string,
    updater: (card: FlashcardStudioItem) => FlashcardStudioItem
  ) => {
    onCardsChange((prev) =>
      prev.map((c) => (c.uid === uid ? updater(c) : c))
    );
  };

  const handleSynthesizeCard = async (
    card: FlashcardStudioItem,
    target: "front" | "example"
  ) => {
    const text =
      target === "front"
        ? card.front_text.trim()
        : card.example_sentence.trim();
    if (!text) {
      showToast.error(
        target === "front"
          ? "Nhập nội dung Mặt trước trước khi tạo giọng đọc."
          : "Nhập Câu ví dụ trước khi tạo giọng đọc."
      );
      return;
    }

    const key = `${card.uid}_${target}`;
    const voiceObj =
      voices.find((v) => v.voice_id === card.voice_id) || selectedDefaultVoice;
    setSynthesizingMap((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await api.post<{
        audio_url: string;
        lang_code: string;
        voice_id: string;
      }>("/lecturer/lessons/flashcards/tts/preview", {
        text,
        lang_code: voiceObj.lang_code,
        voice_id: voiceObj.voice_id,
      });
      const url = res.data?.audio_url;
      if (!url) throw new Error("Không nhận được tệp âm thanh.");
      updateCardByUid(card.uid, (c) => ({
        ...c,
        lang_code: res.data.lang_code || voiceObj.lang_code,
        voice_id: res.data.voice_id || voiceObj.voice_id,
        ...(target === "front"
          ? { audio_url: url }
          : { example_audio_url: url }),
      }));
      playAudioUrl(url);
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Không thể tạo giọng đọc"));
    } finally {
      setSynthesizingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSelectQuickVoice = (voiceId: string) => {
    setDefaultVoiceId(voiceId);
    const v = voices.find((x) => x.voice_id === voiceId);
    if (!v) return;
    // Tự động cập nhật cho các thẻ chưa có nội dung hoặc chưa sinh âm thanh
    onCardsChange((prev) =>
      prev.map((c) =>
        !c.audio_url
          ? { ...c, lang_code: v.lang_code, voice_id: v.voice_id }
          : c
      )
    );
  };

  const handleApplyVoiceToAll = () => {
    onCardsChange((prev) =>
      prev.map((c) => ({
        ...c,
        lang_code: selectedDefaultVoice.lang_code,
        voice_id: selectedDefaultVoice.voice_id,
        audio_url: "",
        example_audio_url: "",
      }))
    );
    showToast.success(
      `Đã đổi toàn bộ ${cards.length} thẻ sang giọng ${selectedDefaultVoice.label}.`
    );
  };

  const handleBatchSynthesizeAll = async () => {
    const targets = cards.filter(
      (c) => c.front_text.trim() && !c.audio_url?.trim()
    );
    if (targets.length === 0) {
      showToast.success("Tất cả các thẻ đều đã có giọng đọc!");
      return;
    }
    setIsBatchSynthesizing(true);
    let done = 0;
    try {
      for (const card of targets) {
        const voiceObj =
          voices.find((v) => v.voice_id === card.voice_id) ||
          selectedDefaultVoice;
        try {
          const res = await api.post<{ audio_url: string }>(
            "/lecturer/lessons/flashcards/tts/preview",
            {
              text: card.front_text.trim(),
              lang_code: voiceObj.lang_code,
              voice_id: voiceObj.voice_id,
            }
          );
          let exUrl = card.example_audio_url || "";
          if (card.example_sentence.trim() && !exUrl) {
            const exRes = await api.post<{ audio_url: string }>(
              "/lecturer/lessons/flashcards/tts/preview",
              {
                text: card.example_sentence.trim(),
                lang_code: voiceObj.lang_code,
                voice_id: voiceObj.voice_id,
              }
            );
            exUrl = exRes.data?.audio_url || "";
          }
          updateCardByUid(card.uid, (item) => ({
            ...item,
            lang_code: voiceObj.lang_code,
            voice_id: voiceObj.voice_id,
            audio_url: res.data?.audio_url || item.audio_url,
            example_audio_url: exUrl,
          }));
          done += 1;
        } catch {
          // Tiếp tục thẻ kế tiếp
        }
      }
      showToast.success(`Đã tạo giọng đọc cho ${done}/${targets.length} thẻ!`);
    } finally {
      setIsBatchSynthesizing(false);
    }
  };

  // ============================================
  // BULK IMPORT (DÁN NHANH TỪ EXCEL / NOTION)
  // ============================================

  const handleApplyBulkImport = () => {
    const lines = bulkImportText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      showToast.error("Vui lòng dán ít nhất 1 dòng dữ liệu.");
      return;
    }

    const parsed: FlashcardStudioItem[] = [];
    for (const line of lines) {
      // Hỗ trợ phân tách bằng | hoặc Tab (copy từ Excel/Sheets) hoặc dấu " - "
      const parts = line.includes("\t")
        ? line.split("\t")
        : line.includes("|")
          ? line.split("|")
          : line.split(/\s+-\s+/);
      const front = (parts[0] || "").trim();
      const back = (parts[1] || "").trim();
      if (!front || !back) continue;
      parsed.push({
        uid: createFlashcardUid(),
        front_text: front,
        back_text: back,
        phonetic: (parts[2] || "").trim(),
        part_of_speech: "",
        example_sentence: (parts[3] || "").trim(),
        example_translation: (parts[4] || "").trim(),
        hint: "",
        lang_code: selectedDefaultVoice.lang_code,
        voice_id: selectedDefaultVoice.voice_id,
        audio_url: "",
        example_audio_url: "",
        difficulty_level: 1,
        position: parsed.length,
      });
    }

    if (parsed.length === 0) {
      showToast.error(
        "Chưa nhận diện được thẻ hợp lệ. Dùng định dạng: Mặt trước | Mặt sau | Phiên âm (tùy chọn)."
      );
      return;
    }

    const onlySingleEmpty =
      cards.length === 1 &&
      !cards[0].front_text.trim() &&
      !cards[0].back_text.trim();

    if (onlySingleEmpty) {
      onCardsChange(() => parsed);
    } else {
      onCardsChange((prev) => [...prev, ...parsed]);
    }

    setBulkImportText("");
    setActiveTool("none");
    showToast.success(`Đã nhập nhanh ${parsed.length} thẻ Flashcard!`);
  };

  // ============================================
  // AI GENERATE
  // ============================================

  const toggleTool = (tool: "ai" | "import") => {
    setActiveTool((prev) => {
      const next = prev === tool ? "none" : tool;
      if (next !== "none") {
        setWorkspaceMode("deck");
        requestAnimationFrame(() => {
          toolPanelRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }
      return next;
    });
  };

  const handleToggleLesson = (id: string) => {
    if (aiScopeMode === "single") {
      setSelectedLessonIds([id]);
      return;
    }
    setSelectedLessonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSectionVideos = (section: StudioVideoSectionGroup) => {
    const ids = section.videos.map((v) => v.id);
    setSelectedLessonIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      return allSelected
        ? prev.filter((id) => !ids.includes(id))
        : Array.from(new Set([...prev, ...ids]));
    });
  };

  const handleSwitchScopeMode = (nextMode: "single" | "multiple" | "chapter") => {
    setAiScopeMode(nextMode);
    if (nextMode === "single") {
      setSelectedLessonIds((prev) => (prev.length > 0 ? [prev[0]] : []));
    } else if (nextMode === "chapter") {
      setSelectedLessonIds((prev) => {
        if (prev.length > 0) return prev;
        const currentGroup =
          videoSections.find((g) => g.isCurrent) || videoSections[0];
        return currentGroup ? currentGroup.videos.map((v) => v.id) : [];
      });
    }
  };

  const handleGenerateTitle = async () => {
    if (!lessonTitle.trim()) {
      showToast.error("Vui lòng nhập tiêu đề nháp trước.");
      return;
    }
    setIsGeneratingTitle(true);
    try {
      const res = await api.post("/lecturers/chat/lesson/rewrite_the_title", {
        title: lessonTitle.trim(),
      });
      if (typeof res.data === "string" && res.data.trim()) {
        onLessonTitleChange(res.data.trim());
        showToast.success("Đã tối ưu tiêu đề bằng AI.");
      }
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Không thể tối ưu tiêu đề"));
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleGenerateCardsFromVideos = async () => {
    if (selectedLessonIds.length === 0) {
      showToast.error("Vui lòng chọn ít nhất một bài giảng video.");
      return;
    }
    setIsGeneratingCards(true);
    onClearError?.();
    try {
      const res = await api.post(
        `/lecturers/chat/lesson/flashcards?lang_code=${encodeURIComponent(
          selectedDefaultVoice.lang_code
        )}`,
        { lesson_ids: selectedLessonIds }
      );
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length === 0) {
        showToast.error("AI chưa sinh được thẻ nào. Vui lòng thử lại.");
        return;
      }

      const formatted: FlashcardStudioItem[] = list.map((c: any, idx: number) => ({
        uid: createFlashcardUid(),
        front_text: c.front_text || "",
        back_text: c.back_text || "",
        phonetic: c.phonetic || "",
        part_of_speech: c.part_of_speech || "",
        example_sentence: c.example_sentence || "",
        example_translation: c.example_translation || "",
        hint: c.hint || "",
        lang_code: selectedDefaultVoice.lang_code,
        voice_id: selectedDefaultVoice.voice_id,
        audio_url: "",
        example_audio_url: "",
        difficulty_level:
          c.difficulty_level === 2 || c.difficulty_level === 3
            ? c.difficulty_level
            : 1,
        position: idx,
      }));

      const onlySingleEmpty =
        cards.length === 1 &&
        !cards[0].front_text.trim() &&
        !cards[0].back_text.trim();

      if (aiApplyMode === "replace" || onlySingleEmpty) {
        onCardsChange(() => formatted);
      } else {
        onCardsChange((prev) => [...prev, ...formatted]);
      }

      showToast.success(
        `Đã sinh ${formatted.length} thẻ Flashcard (${selectedDefaultVoice.language})!`
      );
      setSelectedLessonIds([]);
      setActiveTool("none");
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Không thể sinh bộ thẻ từ video"));
    } finally {
      setIsGeneratingCards(false);
    }
  };

  // ============================================
  // CARD LIST ACTIONS
  // ============================================

  const handleAddCard = () => {
    const item = createEmptyFlashcard(
      selectedDefaultVoice.lang_code,
      selectedDefaultVoice.voice_id
    );
    onCardsChange((prev) => [...prev, item]);
    setWorkspaceMode("deck");
    requestAnimationFrame(() => {
      cardRefs.current[item.uid]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const handleDuplicateCard = (idx: number) => {
    const src = cards[idx];
    if (!src) return;
    const copy: FlashcardStudioItem = { ...src, uid: createFlashcardUid() };
    onCardsChange((prev) => [
      ...prev.slice(0, idx + 1),
      copy,
      ...prev.slice(idx + 1),
    ]);
    showToast.success(`Đã nhân bản thẻ #${idx + 1}.`);
  };

  const handleMoveCard = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= cards.length) return;
    onCardsChange((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleRemoveCard = (idx: number) => {
    if (cards.length <= 1) {
      showToast.error("Bộ Flashcard cần ít nhất 1 thẻ.");
      return;
    }
    onCardsChange((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleTriggerSubmit = () => {
    if (!lessonTitle.trim()) {
      showToast.error("Vui lòng nhập tiêu đề bộ Flashcard.");
      return;
    }
    if (stats.firstInvalidIdx !== -1) {
      const target = cards[stats.firstInvalidIdx];
      showToast.error(
        `Thẻ #${stats.firstInvalidIdx + 1}: ${getFlashcardIssues(target)[0]}.`
      );
      setWorkspaceMode("deck");
      requestAnimationFrame(() => {
        cardRefs.current[target.uid]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }
    void onSubmit(autoGenerateOnSave);
  };

  const stageCard = cards[stageIndex] ?? null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── STICKY TOP DECK HEADER (CLOUDY BLUE PASTEL) ── */}
      <div className="border-b border-border bg-gradient-to-b from-secondary-light/40 via-primary-light/45 to-surface">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={onBackToChapters}
                className="mb-1.5 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Quay lại Chương &amp; bài học
              </button>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <Layers className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <h1 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">
                  {lessonTitle.trim() ||
                    (mode === "create"
                      ? "Tạo bộ Flashcard mới"
                      : "Chỉnh sửa bộ Flashcard")}
                </h1>
                {sectionName && (
                  <Badge variant="primary" size="sm">
                    Chương: {sectionName}
                  </Badge>
                )}
                {mode === "edit" && (
                  <Badge variant={hasChanges ? "warning" : "success"} size="sm">
                    {hasChanges ? "Chưa lưu" : "Đã đồng bộ"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Chuyển đổi Soạn bộ thẻ ↔ Lật thử 3D */}
              <div className="inline-flex rounded-xl border border-primary-pastel bg-surface p-1 text-xs shadow-xs">
                <button
                  type="button"
                  onClick={() => setWorkspaceMode("deck")}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    workspaceMode === "deck"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  Soạn thẻ ({cards.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStageFlipped(false);
                    setWorkspaceMode("stage");
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    workspaceMode === "stage"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Lật thử 3D
                </button>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleTriggerSubmit}
                disabled={isSubmitting || (mode === "edit" && !hasChanges)}
                isLoading={isSubmitting}
                loadingText={mode === "create" ? "Đang tạo..." : "Đang lưu..."}
                leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
              >
                {mode === "create" ? "Tạo bài Flashcard" : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTAINER (FULL-WIDTH VISUAL DECK) ── */}
      <div className="mx-auto max-w-6xl space-y-5 px-4 pt-6 sm:px-6 lg:px-8">
        {successBanner && (
          <Alert variant="success" title={successBanner.title}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">{successBanner.description}</p>
              <div className="flex flex-wrap items-center gap-2">
                {successBanner.lessonId && onOpenPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => onOpenPreview(successBanner.lessonId!)}
                  >
                    Xem trước 3 chế độ học
                  </Button>
                )}
                {successBanner.lessonId && onOpenEdit && mode === "create" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenEdit(successBanner.lessonId!)}
                  >
                    Chỉnh sửa tiếp
                  </Button>
                )}
                {successBanner.lessonId && onOpenResources && (
                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    leftIcon={<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => onOpenResources(successBanner.lessonId!)}
                  >
                    Tài nguyên
                  </Button>
                )}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onBackToChapters}
                >
                  Về Chương &amp; bài học
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" title="Có lỗi xảy ra">
            {error}
          </Alert>
        )}

        {/* ── THANH THIẾT LẬP BỘ THẺ & GIỌNG ĐỌC NHANH ── */}
        <Card className="border border-border bg-surface p-5 shadow-xs">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-7">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tên bộ Flashcard <span className="text-destructive">*</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateTitle}
                  disabled={isGeneratingTitle || !lessonTitle.trim()}
                  isLoading={isGeneratingTitle}
                  loadingText="Đang tối ưu..."
                  leftIcon={<Bot className="h-3.5 w-3.5" aria-hidden="true" />}
                  className="h-7 text-xs text-primary"
                >
                  AI tối ưu tiêu đề
                </Button>
              </div>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => onLessonTitleChange(e.target.value)}
                placeholder="Ví dụ: 30 Từ vựng IELTS Listening — Chủ đề Môi trường"
                className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="text"
                value={lessonDescription}
                onChange={(e) => onLessonDescriptionChange(e.target.value)}
                placeholder="Mô tả ngắn hoặc mục tiêu ôn tập (tùy chọn)..."
                className="w-full rounded-xl border border-border/80 bg-background/40 px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-primary-pastel/70 bg-primary-light/25 p-4 lg:col-span-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    Giọng đọc bản xứ mặc định
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyVoiceToAll}
                    className="cursor-pointer text-[11px] font-semibold text-primary hover:underline"
                  >
                    Áp dụng tất cả
                  </button>
                </div>

                {/* Preset cờ ngôn ngữ bấm chọn 1 chạm */}
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {QUICK_LANG_PRESETS.map((preset) => {
                    const active = defaultVoiceId === preset.voice_id;
                    return (
                      <button
                        key={preset.voice_id}
                        type="button"
                        onClick={() => handleSelectQuickVoice(preset.voice_id)}
                        className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold transition-all ${
                          active
                            ? "border-primary bg-primary text-white shadow-xs"
                            : "border-border bg-surface text-foreground hover:border-primary-pastel"
                        }`}
                      >
                        <span className="mr-1 opacity-80">{preset.badge}</span>
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <select
                  value={defaultVoiceId}
                  onChange={(e) => handleSelectQuickVoice(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      [{v.badge}] {v.language} — {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Thanh công cụ thông minh + Sức khỏe bộ thẻ */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {allVideoLessons.length > 0 && (
                <Button
                  type="button"
                  variant={activeTool === "ai" ? "primary" : "pastel"}
                  size="sm"
                  onClick={() => toggleTool("ai")}
                  leftIcon={<Bot className="h-4 w-4" aria-hidden="true" />}
                >
                  AI sinh từ Video ({allVideoLessons.length})
                </Button>
              )}
              <Button
                type="button"
                variant={activeTool === "import" ? "primary" : "outline"}
                size="sm"
                onClick={() => toggleTool("import")}
                leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
              >
                Nhập nhanh hàng loạt
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBatchSynthesizeAll}
                disabled={isBatchSynthesizing}
                isLoading={isBatchSynthesizing}
                loadingText="Đang tạo giọng..."
                leftIcon={<Volume2 className="h-4 w-4" aria-hidden="true" />}
              >
                Tạo giọng đọc tất cả
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <CheckCircle2
                  className="h-4 w-4 text-success-foreground"
                  aria-hidden="true"
                />
                {stats.validCount}/{stats.total} thẻ hợp lệ
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Volume2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {stats.withAudioCount}/{stats.total} có âm thanh
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoGenerateOnSave}
                  onChange={(e) => setAutoGenerateOnSave(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-primary"
                />
                Tự tạo âm thanh khi Lưu
              </label>
            </div>
          </div>
        </Card>

        {/* ── BẢNG CÔNG CỤ MỞ NHANH: AI SINH THẺ HOẶC NHẬP HÀNG LOẠT ── */}
        {activeTool !== "none" && (
          <div ref={toolPanelRef}>
            {activeTool === "import" ? (
              <Card
                variant="pastel-blue"
                className="border-2 border-primary-pastel p-5 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Nhập nhanh hàng loạt từ Excel / Notion / Văn bản
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Mỗi dòng là 1 thẻ theo cú pháp{" "}
                      <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-primary">
                        Mặt trước | Mặt sau | Phiên âm | Câu ví dụ | Dịch ví dụ
                      </code>{" "}
                      (hoặc dán trực tiếp bảng 2–5 cột từ Excel/Google Sheets).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTool("none")}
                    aria-label="Đóng bảng nhập nhanh"
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-primary-pastel bg-surface text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  placeholder={`sustainable | bền vững | /səˈsteɪ.nə.bəl/ | We need sustainable energy. | Chúng ta cần năng lượng bền vững.\naccomplish | hoàn thành, đạt được | /əˈkʌm.plɪʃ/`}
                  className="w-full rounded-xl border border-primary-pastel bg-surface p-3.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />

                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTool("none")}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleApplyBulkImport}
                    leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
                  >
                    Tạo thẻ từ danh sách
                  </Button>
                </div>
              </Card>
            ) : (
              <Card
                variant="pastel-blue"
                className="border-2 border-primary-pastel p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                      <Bot className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        AI sinh bộ Flashcard từ Video đã có chỉ mục AI
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Ngôn ngữ mục tiêu đang chọn:{" "}
                        <strong className="text-primary">
                          {selectedDefaultVoice.language}
                        </strong>
                        . Chọn 1 bài, một vài bài hoặc cả chương.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTool("none")}
                    aria-label="Đóng bảng AI"
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-primary-pastel bg-surface text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl border border-primary-pastel bg-surface p-1 text-xs">
                    {[
                      { id: "single", label: "Theo 1 bài" },
                      { id: "multiple", label: "Một vài bài" },
                      { id: "chapter", label: "Cả chương" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          handleSwitchScopeMode(
                            opt.id as "single" | "multiple" | "chapter"
                          )
                        }
                        className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold ${
                          aiScopeMode === opt.id
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Đã chọn{" "}
                    <strong className="text-primary">
                      {selectedLessonIds.length}
                    </strong>{" "}
                    video
                  </span>
                </div>

                {aiScopeMode === "chapter" ? (
                  <div className="mb-4 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {videoSections.map((group) => {
                      const ids = group.videos.map((v) => v.id);
                      const allSelected =
                        ids.length > 0 &&
                        ids.every((id) => selectedLessonIds.includes(id));
                      return (
                        <button
                          key={group.sectionId}
                          type="button"
                          onClick={() => handleToggleSectionVideos(group)}
                          className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left ${
                            allSelected
                              ? "border-primary bg-surface shadow-xs"
                              : "border-border bg-surface/85 hover:border-primary-pastel"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-md border ${
                                allSelected
                                  ? "border-primary bg-primary text-white"
                                  : "border-border bg-surface"
                              }`}
                            >
                              {allSelected && (
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {group.sectionTitle}
                                </span>
                                {group.isCurrent && (
                                  <Badge variant="primary" size="sm">
                                    Chương hiện tại
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {group.videos.length} video đã embedding
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-primary">
                            {allSelected ? "Bỏ chọn" : "Chọn cả chương"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mb-4 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                    {videoSections.map((group) => (
                      <div key={group.sectionId} className="space-y-1.5">
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs font-bold text-foreground">
                            {group.sectionTitle}
                          </span>
                          {group.isCurrent && (
                            <Badge variant="primary" size="sm">
                              Chương hiện tại
                            </Badge>
                          )}
                        </div>
                        {group.videos.map((lesson) => {
                          const checked = selectedLessonIds.includes(lesson.id);
                          return (
                            <label
                              key={lesson.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                                checked
                                  ? "border-primary bg-surface shadow-xs"
                                  : "border-border bg-surface/80 hover:border-primary-pastel"
                              }`}
                            >
                              <input
                                type={
                                  aiScopeMode === "single" ? "radio" : "checkbox"
                                }
                                name={
                                  aiScopeMode === "single"
                                    ? "ai-fc-single-video"
                                    : undefined
                                }
                                checked={checked}
                                onChange={() => handleToggleLesson(lesson.id)}
                                className="h-4 w-4 border-border text-primary"
                              />
                              <Video
                                className="h-4 w-4 shrink-0 text-primary"
                                aria-hidden="true"
                              />
                              <span className="flex-1 truncate text-sm font-medium text-foreground">
                                {lesson.title}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-primary-pastel/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex rounded-xl border border-primary-pastel bg-surface p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setAiApplyMode("append")}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold ${
                        aiApplyMode === "append"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      Nối thêm thẻ
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiApplyMode("replace")}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold ${
                        aiApplyMode === "replace"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      Thay thế bộ thẻ
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateCardsFromVideos}
                    disabled={isGeneratingCards || selectedLessonIds.length === 0}
                    isLoading={isGeneratingCards}
                    loadingText="AI đang tạo thẻ..."
                    leftIcon={<Bot className="h-4 w-4" aria-hidden="true" />}
                  >
                    Sinh Flashcard ({selectedLessonIds.length} video)
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── CHẾ ĐỘ 1: BẢNG XẾP THẺ 2 MẶT SONG SONG (SIDE-BY-SIDE VISUAL DECK) ── */}
        {workspaceMode === "deck" && (
          <div className="space-y-4">
            {cards.map((card, idx) => {
              const issues = getFlashcardIssues(card);
              const isValid = issues.length === 0;
              const isSynthFront = Boolean(synthesizingMap[`${card.uid}_front`]);
              const isSynthEx = Boolean(synthesizingMap[`${card.uid}_example`]);
              const hasExtrasContent = Boolean(
                card.example_sentence.trim() ||
                  card.example_translation.trim() ||
                  card.hint.trim()
              );
              const showExtras =
                expandedExtras[card.uid] ?? hasExtrasContent;
              const cardVoice =
                voices.find((v) => v.voice_id === card.voice_id) ||
                selectedDefaultVoice;

              return (
                <div
                  key={card.uid}
                  ref={(el) => {
                    cardRefs.current[card.uid] = el;
                  }}
                >
                  <Card
                    className={`overflow-hidden border transition-all ${
                      isValid
                        ? "border-border bg-surface shadow-xs hover:border-primary-pastel"
                        : "border-warning-border bg-surface shadow-xs"
                    }`}
                  >
                    {/* Thanh đầu từng tấm thẻ */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/60 px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                          {idx + 1}
                        </span>
                        <select
                          value={card.voice_id || defaultVoiceId}
                          onChange={(e) => {
                            const v =
                              voices.find((x) => x.voice_id === e.target.value) ||
                              selectedDefaultVoice;
                            updateCardByUid(card.uid, (c) => ({
                              ...c,
                              voice_id: v.voice_id,
                              lang_code: v.lang_code,
                              audio_url: "",
                              example_audio_url: "",
                            }));
                          }}
                          className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-foreground focus:border-primary focus:outline-none"
                        >
                          {voices.map((v) => (
                            <option key={v.voice_id} value={v.voice_id}>
                              [{v.badge}] {v.label}
                            </option>
                          ))}
                        </select>

                        {/* 3 pill độ khó nhỏ gọn */}
                        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[11px]">
                          {[1, 2, 3].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() =>
                                updateCardByUid(card.uid, (c) => ({
                                  ...c,
                                  difficulty_level: lvl,
                                }))
                              }
                              className={`cursor-pointer rounded-md px-2 py-0.5 font-semibold ${
                                (card.difficulty_level || 1) === lvl
                                  ? "bg-primary-light text-primary"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {DIFFICULTY_META[lvl].short}
                            </button>
                          ))}
                        </div>

                        {!isValid && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning-foreground">
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            {issues.join(" · ")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setStageIndex(idx);
                            setStageFlipped(false);
                            setWorkspaceMode("stage");
                          }}
                          title="Lật thử 3D thẻ này"
                          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-border bg-surface px-2 text-[11px] font-semibold text-primary hover:bg-primary-light"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          Lật thử
                        </button>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveCard(idx, -1)}
                          aria-label="Di chuyển thẻ lên"
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-primary-light hover:text-primary disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === cards.length - 1}
                          onClick={() => handleMoveCard(idx, 1)}
                          aria-label="Di chuyển thẻ xuống"
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-primary-light hover:text-primary disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateCard(idx)}
                          aria-label="Nhân bản thẻ"
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-primary-light hover:text-primary"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {cards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCard(idx)}
                            aria-label={`Xóa thẻ ${idx + 1}`}
                            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive-bg hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2 MẶT ĐỐI XỨNG TRÁI (MẶT TRƯỚC) — PHẢI (MẶT SAU) */}
                    <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
                      {/* NỬA TRÁI: MẶT TRƯỚC */}
                      <div className="space-y-3 bg-primary-light/15 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                            Mặt trước · Thuật ngữ ({cardVoice.badge})
                          </span>
                          <button
                            type="button"
                            disabled={isSynthFront || !card.front_text.trim()}
                            onClick={() => {
                              if (card.audio_url) {
                                playAudioUrl(card.audio_url);
                              } else {
                                void handleSynthesizeCard(card, "front");
                              }
                            }}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all disabled:opacity-45 ${
                              card.audio_url
                                ? "border-success-border bg-success-bg text-success-foreground hover:bg-success hover:text-white"
                                : "border-primary-pastel bg-surface text-primary hover:bg-primary hover:text-white"
                            }`}
                          >
                            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {isSynthFront
                              ? "Đang tạo..."
                              : card.audio_url
                                ? "Nghe phát âm"
                                : "Tạo & Nghe"}
                          </button>
                        </div>

                        <textarea
                          rows={2}
                          value={card.front_text}
                          onChange={(e) =>
                            updateCardByUid(card.uid, (c) => ({
                              ...c,
                              front_text: e.target.value,
                              audio_url: "",
                            }))
                          }
                          placeholder="Nhập từ vựng, cụm từ, câu hoặc khái niệm..."
                          className="w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base font-bold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            value={card.phonetic}
                            onChange={(e) =>
                              updateCardByUid(card.uid, (c) => ({
                                ...c,
                                phonetic: e.target.value,
                              }))
                            }
                            placeholder="Phiên âm IPA / Pinyin..."
                            className="w-full rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-xs text-primary placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          />
                          <input
                            type="text"
                            list="fc-pos-list"
                            value={card.part_of_speech}
                            onChange={(e) =>
                              updateCardByUid(card.uid, (c) => ({
                                ...c,
                                part_of_speech: e.target.value,
                              }))
                            }
                            placeholder="Loại từ (noun, verb, idiom...)"
                            className="w-full rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* NỬA PHẢI: MẶT SAU */}
                      <div className="flex flex-col justify-between space-y-3 bg-surface p-4 sm:p-5">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              Mặt sau · Nghĩa / Giải thích
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedExtras((prev) => ({
                                  ...prev,
                                  [card.uid]: !showExtras,
                                }))
                              }
                              className="cursor-pointer text-[11px] font-semibold text-primary hover:underline"
                            >
                              {showExtras
                                ? "Thu gọn ví dụ"
                                : "+ Ví dụ & Mẹo nhớ"}
                            </button>
                          </div>

                          <textarea
                            rows={2}
                            value={card.back_text}
                            onChange={(e) =>
                              updateCardByUid(card.uid, (c) => ({
                                ...c,
                                back_text: e.target.value,
                              }))
                            }
                            placeholder="Nhập nghĩa tiếng Việt ngắn gọn, rõ ràng..."
                            className="w-full resize-none rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        {showExtras && (
                          <div className="space-y-2 rounded-xl border border-border/80 bg-background/50 p-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={card.example_sentence}
                                onChange={(e) =>
                                  updateCardByUid(card.uid, (c) => ({
                                    ...c,
                                    example_sentence: e.target.value,
                                    example_audio_url: "",
                                  }))
                                }
                                placeholder="Câu ví dụ ngữ cảnh (bằng ngôn ngữ mặt trước)..."
                                className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                              />
                              <button
                                type="button"
                                disabled={
                                  isSynthEx || !card.example_sentence.trim()
                                }
                                onClick={() => {
                                  if (card.example_audio_url) {
                                    playAudioUrl(card.example_audio_url);
                                  } else {
                                    void handleSynthesizeCard(card, "example");
                                  }
                                }}
                                title="Nghe câu ví dụ"
                                className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border disabled:opacity-40 ${
                                  card.example_audio_url
                                    ? "border-success-border bg-success-bg text-success-foreground"
                                    : "border-primary-pastel bg-surface text-primary hover:bg-primary hover:text-white"
                                }`}
                              >
                                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <input
                                type="text"
                                value={card.example_translation}
                                onChange={(e) =>
                                  updateCardByUid(card.uid, (c) => ({
                                    ...c,
                                    example_translation: e.target.value,
                                  }))
                                }
                                placeholder="Dịch nghĩa câu ví dụ..."
                                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                              />
                              <input
                                type="text"
                                value={card.hint}
                                onChange={(e) =>
                                  updateCardByUid(card.uid, (c) => ({
                                    ...c,
                                    hint: e.target.value,
                                  }))
                                }
                                placeholder="Mẹo ghi nhớ (Hint)..."
                                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}

            <datalist id="fc-pos-list">
              {PART_OF_SPEECH_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            {/* Nút lớn thêm thẻ mới ở cuối danh sách */}
            <button
              type="button"
              onClick={handleAddCard}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-pastel bg-primary-light/20 py-5 text-sm font-bold text-primary transition-all hover:border-primary hover:bg-primary-light/45"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              Thêm thẻ Flashcard mới{" "}
              <span className="font-normal text-muted-foreground">
                (hoặc nhấn Ctrl/⌘ + Enter)
              </span>
            </button>
          </div>
        )}

        {/* ── CHẾ ĐỘ 2: SÂN KHẤU LẬT THỬ 3D TOÀN BỘ BỘ THẺ ── */}
        {workspaceMode === "stage" && stageCard && (
          <div className="mx-auto max-w-2xl space-y-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Thẻ <strong className="text-foreground">{stageIndex + 1}</strong> /{" "}
                {cards.length} · Nhấn{" "}
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
                  Space
                </kbd>{" "}
                để lật,{" "}
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
                  ←
                </kbd>{" "}
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
                  →
                </kbd>{" "}
                chuyển thẻ
              </span>
              <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[11px]">
                {([0.75, 1, 1.25] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPlaybackRate(r)}
                    className={`cursor-pointer rounded-md px-2 py-0.5 font-semibold ${
                      playbackRate === r
                        ? "bg-primary text-white"
                        : "text-muted-foreground"
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            <div
              onClick={() => setStageFlipped((v) => !v)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") setStageFlipped((v) => !v);
              }}
              className="relative min-h-[340px] cursor-pointer rounded-3xl border border-primary-pastel bg-gradient-to-br from-surface via-primary-light/35 to-secondary-light/30 p-8 shadow-[0_24px_48px_-14px_rgba(53,111,167,0.2)] transition-all hover:shadow-[0_28px_56px_-14px_rgba(53,111,167,0.26)]"
            >
              <div className="mb-4 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="rounded-full bg-surface px-3 py-1 text-primary shadow-xs">
                  {stageFlipped ? "MẶT SAU · NGHĨA & VÍ DỤ" : "MẶT TRƯỚC · THUẬT NGỮ"}
                </span>
                <span className="inline-flex items-center gap-1 text-primary">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Chạm để lật mặt
                </span>
              </div>

              {!stageFlipped ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                  {stageCard.part_of_speech && (
                    <Badge variant="lavender" size="sm" className="mb-3">
                      {stageCard.part_of_speech}
                    </Badge>
                  )}
                  <p className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                    {stageCard.front_text.trim() || "(Chưa nhập Mặt trước)"}
                  </p>
                  {stageCard.phonetic && (
                    <p className="mt-2.5 text-base font-medium text-primary">
                      {stageCard.phonetic}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (stageCard.audio_url) {
                        playAudioUrl(stageCard.audio_url, playbackRate);
                      } else {
                        void handleSynthesizeCard(stageCard, "front");
                      }
                    }}
                    className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    {stageCard.audio_url
                      ? `Nghe phát âm (${playbackRate}x)`
                      : "Tạo & Nghe thử"}
                  </button>
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col justify-center space-y-4">
                  <p className="text-center font-display text-2xl font-bold text-foreground">
                    {stageCard.back_text.trim() || "(Chưa nhập Mặt sau)"}
                  </p>
                  {stageCard.example_sentence && (
                    <div className="rounded-2xl border border-primary-pastel/80 bg-surface/90 p-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium italic text-foreground">
                          &ldquo;{stageCard.example_sentence}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (stageCard.example_audio_url) {
                              playAudioUrl(stageCard.example_audio_url);
                            } else {
                              void handleSynthesizeCard(stageCard, "example");
                            }
                          }}
                          aria-label="Nghe câu ví dụ"
                          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary-light text-primary hover:bg-primary hover:text-white"
                        >
                          <Volume2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      {stageCard.example_translation && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {stageCard.example_translation}
                        </p>
                      )}
                    </div>
                  )}
                  {stageCard.hint && (
                    <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-3.5 py-1 text-xs font-medium text-warning-foreground">
                      <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                      {stageCard.hint}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={stageIndex <= 0}
                onClick={() => {
                  setStageFlipped(false);
                  setStageIndex((i) => Math.max(0, i - 1));
                }}
                leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
              >
                Thẻ trước
              </Button>
              <Button
                type="button"
                variant="pastel"
                size="sm"
                onClick={() => setWorkspaceMode("deck")}
              >
                Quay lại sửa bộ thẻ
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={stageIndex >= cards.length - 1}
                onClick={() => {
                  setStageFlipped(false);
                  setStageIndex((i) => Math.min(cards.length - 1, i + 1));
                }}
                rightIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
              >
                Thẻ tiếp theo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
