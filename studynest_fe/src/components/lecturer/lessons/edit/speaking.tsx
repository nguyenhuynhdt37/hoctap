"use client";

import {
  createSpeakingUid,
  SpeakingStudio,
  SpeakingStudioState,
} from "@/components/lecturer/lessons/shared/speaking-studio";
import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { LessonDetail } from "@/types/lecturer/lesson-api";
import { SpeakingLessonPayload } from "@/types/lecturer/speaking";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

export default function EditSpeakingLesson() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id as string | undefined;

  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<SpeakingStudioState>({
    lessonTitle: "",
    langCode: "en-GB",
    level: "B1",
    scenario: "",
    studentRole: "",
    aiPersona: {
      name: "Emma",
      role: "Đối tác hội thoại",
      personality: "Thân thiện",
      voice_id: "edge-tts/en-GB-SoniaNeural",
      opening_line: "",
      opening_translation: "",
      opening_audio_url: "",
    },
    missions: [{ id: createSpeakingUid("m1"), title: "", hint: "" }],
    samplePhrases: [],
    maxTurns: 8,
    passPercent: 70,
    allowTranslation: true,
    allowSuggestion: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const {
    data: lessonDetail,
    isLoading: isLoadingDetail,
    mutate: mutateDetail,
  } = useSWR<LessonDetail>(
    lessonId ? `/lecturer/lessons/${lessonId}/detail` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const {
    data: speakingData,
    isLoading: isLoadingSpeaking,
    mutate: mutateSpeaking,
  } = useSWR<SpeakingLessonPayload | null>(
    lessonId ? `/lecturer/lessons/${lessonId}/speaking` : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: chaptersData } = useSWR(
    lessonDetail?.course_id
      ? `/lecturer/chapters/${lessonDetail.course_id}`
      : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (hydrated || !lessonDetail || isLoadingSpeaking) return;
    const p = speakingData?.ai_persona;
    setState({
      lessonTitle: lessonDetail.title || "",
      langCode: speakingData?.lang_code || "en-GB",
      level: speakingData?.level || "B1",
      scenario: speakingData?.scenario || lessonDetail.description || "",
      studentRole: speakingData?.student_role || "",
      aiPersona: {
        name: p?.name || "Emma",
        role: p?.role || "Đối tác hội thoại",
        personality: p?.personality || "Thân thiện",
        voice_id: p?.voice_id || "",
        opening_line: p?.opening_line || "",
        opening_translation: p?.opening_translation || "",
        opening_audio_url: p?.opening_audio_url || "",
      },
      missions:
        Array.isArray(speakingData?.missions) && speakingData.missions.length > 0
          ? speakingData.missions
          : [{ id: createSpeakingUid("m1"), title: "", hint: "" }],
      samplePhrases: Array.isArray(speakingData?.sample_phrases)
        ? speakingData.sample_phrases
        : [],
      maxTurns: Number(speakingData?.max_turns || 8),
      passPercent: Number(speakingData?.pass_percent || 70),
      allowTranslation: speakingData?.allow_translation ?? true,
      allowSuggestion: speakingData?.allow_suggestion ?? true,
    });
    setHydrated(true);
  }, [hydrated, lessonDetail, speakingData, isLoadingSpeaking]);

  const sectionName = useMemo(() => {
    if (!chaptersData?.sections || !lessonDetail?.section_id) return "";
    return (
      chaptersData.sections.find(
        (s: { section_id?: string; section_title?: string }) =>
          s.section_id === lessonDetail.section_id
      )?.section_title || ""
    );
  }, [chaptersData, lessonDetail]);

  const videoSections = useMemo<StudioVideoSectionGroup[]>(() => {
    const sections = Array.isArray(chaptersData?.sections)
      ? chaptersData.sections
      : [];
    const currentSecId = lessonDetail?.section_id;
    const groups: StudioVideoSectionGroup[] = [];
    for (const sec of sections) {
      const secLessons = Array.isArray(sec.lessons) ? sec.lessons : [];
      const videos = secLessons
        .filter(
          (l: {
            lesson_type?: string;
            has_embedding?: boolean;
            chunk_count?: number;
          }) =>
            l.lesson_type === "video" &&
            (l.has_embedding === true || (l.chunk_count ?? 0) > 0)
        )
        .map(
          (l: {
            lesson_id?: string;
            id?: string;
            lesson_title?: string;
            title?: string;
          }) => ({
            id: l.lesson_id || l.id || "",
            title: l.lesson_title || l.title || "Bài giảng video",
          })
        )
        .filter((v: { id: string }) => Boolean(v.id));

      if (videos.length > 0) {
        groups.push({
          sectionId: sec.section_id,
          sectionTitle: sec.section_title || "Chương học",
          isCurrent: sec.section_id === currentSecId,
          videos,
        });
      }
    }
    groups.sort(
      (a, b) => Number(Boolean(b.isCurrent)) - Number(Boolean(a.isCurrent))
    );
    return groups;
  }, [chaptersData, lessonDetail]);

  const handleSave = async () => {
    if (!lessonId || !lessonDetail) return;
    if (!state.lessonTitle.trim()) {
      setError("Vui lòng nhập tên bài Giao tiếp AI.");
      return;
    }
    if (!state.scenario.trim()) {
      setError("Vui lòng nhập bối cảnh tình huống.");
      return;
    }
    if (!state.aiPersona.opening_line.trim()) {
      setError("Vui lòng nhập câu mở màn của nhân vật AI.");
      return;
    }
    const validMissions = state.missions.filter((m) => m.title.trim().length > 0);
    if (validMissions.length === 0) {
      setError("Cần ít nhất 1 nhiệm vụ qua bài.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSavedBanner(null);
    try {
      if (state.lessonTitle.trim() !== (lessonDetail.title || "").trim()) {
        await api.put(`/lecturer/lessons/${lessonId}/rename`, {
          title: state.lessonTitle.trim(),
        });
      }

      const saveRes = await api.post("/lecturer/lessons/speaking/save", {
        lesson_id: lessonId,
        section_id: lessonDetail.section_id,
        course_id: lessonDetail.course_id,
        lang_code: state.langCode,
        level: state.level,
        scenario: state.scenario.trim(),
        student_role: state.studentRole.trim(),
        ai_persona: state.aiPersona,
        missions: validMissions,
        sample_phrases: state.samplePhrases.filter((p) => p.phrase.trim()),
        max_turns: state.maxTurns,
        pass_percent: state.passPercent,
        allow_translation: state.allowTranslation,
        allow_suggestion: state.allowSuggestion,
        auto_render_opening_audio: true,
      });

      if (saveRes.data?.opening_audio_url) {
        setState((prev) => ({
          ...prev,
          aiPersona: {
            ...prev.aiPersona,
            opening_audio_url: saveRes.data.opening_audio_url,
          },
        }));
      }

      await Promise.all([mutateDetail(), mutateSpeaking()]);
      setSavedBanner("Đã lưu thay đổi bài Giao tiếp & Đóng vai AI.");
      showToast.success("Đã lưu thay đổi thành công!");
    } catch (err: unknown) {
      const msg = formatApiError(err, "Không thể lưu thay đổi bài Giao tiếp AI");
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDetail || isLoadingSpeaking || !hydrated) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-[460px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!lessonDetail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border p-6 text-center">
          <Alert variant="destructive" title="Không tìm thấy bài học">
            Bài học không tồn tại hoặc bạn không có quyền chỉnh sửa.
          </Alert>
          <Button
            variant="outline"
            className="mt-4 gap-1.5"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <SpeakingStudio
      mode="edit"
      sectionName={sectionName}
      videoSections={videoSections}
      state={state}
      onChange={setState}
      onSave={handleSave}
      onBack={() =>
        router.push(
          lessonDetail.course_id
            ? `/lecturer/chapters?course_id=${lessonDetail.course_id}`
            : "/lecturer/courses"
        )
      }
      onPreview={
        lessonId
          ? () => router.push(`/lecturer/lessons/${lessonId}/preview`)
          : undefined
      }
      isSubmitting={isSubmitting}
      error={error}
      savedBanner={savedBanner}
    />
  );
}
