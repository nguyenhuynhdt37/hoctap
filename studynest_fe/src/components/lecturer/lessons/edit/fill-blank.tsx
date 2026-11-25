"use client";

import {
  FillBlankStudio,
  FillBlankStudioState,
} from "@/components/lecturer/lessons/shared/fill-blank-studio";
import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { FillBlankLessonPayload } from "@/types/lecturer/fill-blank";
import { LessonDetail } from "@/types/lecturer/lesson-api";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

export default function EditFillBlankLesson() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id as string | undefined;

  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<FillBlankStudioState>({
    lessonTitle: "",
    langCode: "en-GB",
    mode: "typing",
    promptText: "",
    translation: "",
    blanks: [],
    distractors: [],
    voiceId: "",
    audioUrl: "",
    durationSeconds: 0,
    caseSensitive: false,
    allowHint: true,
    passPercent: 70,
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
    data: fillBlankData,
    isLoading: isLoadingFillBlank,
    mutate: mutateFillBlank,
  } = useSWR<FillBlankLessonPayload | null>(
    lessonId ? `/lecturer/lessons/${lessonId}/fill-blank` : null,
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
    if (hydrated || !lessonDetail || isLoadingFillBlank) return;
    setState({
      lessonTitle: lessonDetail.title || "",
      langCode: fillBlankData?.lang_code || "en-GB",
      mode: fillBlankData?.mode || "typing",
      promptText: fillBlankData?.prompt_text || "",
      translation: fillBlankData?.translation || "",
      blanks: Array.isArray(fillBlankData?.blanks) ? fillBlankData.blanks : [],
      distractors: Array.isArray(fillBlankData?.distractors)
        ? fillBlankData.distractors
        : [],
      voiceId: fillBlankData?.voice_id || "",
      audioUrl: fillBlankData?.audio_url || "",
      durationSeconds: Number(fillBlankData?.duration_seconds || 0),
      caseSensitive: Boolean(fillBlankData?.case_sensitive),
      allowHint: fillBlankData?.allow_hint ?? true,
      passPercent: Number(fillBlankData?.pass_percent || 70),
    });
    setHydrated(true);
  }, [hydrated, lessonDetail, fillBlankData, isLoadingFillBlank]);

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

  const handleSave = async (autoRenderAudio: boolean) => {
    if (!lessonId || !lessonDetail) return;
    if (!state.lessonTitle.trim()) {
      setError("Vui lòng nhập tên bài Điền từ.");
      return;
    }
    if (!state.promptText.trim()) {
      setError("Vui lòng nhập đoạn văn bài tập.");
      return;
    }
    const validBlanks = state.blanks
      .map((b) => ({
        ...b,
        answers: b.answers.map((a) => a.trim()).filter(Boolean),
      }))
      .filter((b) => b.answers.length > 0);
    if (validBlanks.length === 0) {
      setError("Cần ít nhất 1 chỗ trống có đáp án hợp lệ.");
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

      const saveRes = await api.post("/lecturer/lessons/fill-blank/save", {
        lesson_id: lessonId,
        section_id: lessonDetail.section_id,
        course_id: lessonDetail.course_id,
        lang_code: state.langCode,
        mode: state.mode,
        prompt_text: state.promptText.trim(),
        translation: state.translation.trim(),
        blanks: validBlanks,
        distractors: state.distractors.map((d) => d.trim()).filter(Boolean),
        voice_id: state.voiceId || null,
        audio_url: state.audioUrl || null,
        duration_seconds: state.durationSeconds || 0,
        case_sensitive: state.caseSensitive,
        allow_hint: state.allowHint,
        pass_percent: state.passPercent,
        auto_render_audio: autoRenderAudio,
      });

      if (saveRes.data?.audio_url) {
        setState((prev) => ({
          ...prev,
          audioUrl: saveRes.data.audio_url,
          voiceId: saveRes.data.voice_id || prev.voiceId,
        }));
      }

      await Promise.all([mutateDetail(), mutateFillBlank()]);
      setSavedBanner("Đã lưu thay đổi bài Điền từ vào chỗ trống.");
      showToast.success("Đã lưu thay đổi thành công!");
    } catch (err: unknown) {
      const msg = formatApiError(err, "Không thể lưu thay đổi bài Điền từ");
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDetail || isLoadingFillBlank || !hydrated) {
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
    <FillBlankStudio
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
