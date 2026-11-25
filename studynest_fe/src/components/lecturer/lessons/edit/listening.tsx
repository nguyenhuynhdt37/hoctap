"use client";

import {
  createDefaultSpeakers,
  createEmptyScriptLine,
  createListeningUid,
  ListeningStudio,
  ListeningStudioState,
} from "@/components/lecturer/lessons/shared/listening-studio";
import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { LessonDetail } from "@/types/lecturer/lesson-api";
import { ListeningLessonPayload } from "@/types/lecturer/listening";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

export default function EditListeningLesson() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id as string | undefined;

  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<ListeningStudioState>(() => {
    const speakers = createDefaultSpeakers("en-GB");
    return {
      lessonTitle: "",
      lessonDescription: "",
      langCode: "en-GB",
      scenario: "",
      speakers,
      scriptLines: [createEmptyScriptLine(speakers[0].id)],
      audioUrl: "",
      durationSeconds: 0,
      maxPlays: 0,
      showTranscriptBeforeSubmit: false,
      passPercent: 70,
      quizzes: [],
    };
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
    data: listeningData,
    isLoading: isLoadingListening,
    mutate: mutateListening,
  } = useSWR<ListeningLessonPayload | null>(
    lessonId ? `/lecturer/lessons/${lessonId}/listening` : null,
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
    if (hydrated || !lessonDetail || isLoadingListening) return;
    const speakers =
      listeningData?.speakers && listeningData.speakers.length > 0
        ? listeningData.speakers
        : createDefaultSpeakers(listeningData?.lang_code || "en-GB");

    const scriptLines =
      listeningData?.script_lines && listeningData.script_lines.length > 0
        ? listeningData.script_lines
        : [createEmptyScriptLine(speakers[0].id)];

    const quizzes = (listeningData?.quizzes || []).map((q) => ({
      uid: createListeningUid("q"),
      id: q.id,
      question: q.question || "",
      difficulty_level: q.difficulty_level || 1,
      explanation: q.explanation || "",
      options: (q.options || [])
        .sort((a, b) => a.position - b.position)
        .map((o, idx) => ({
          text: o.text || "",
          is_correct: Boolean(o.is_correct),
          feedback: o.feedback || "",
          position: idx,
        })),
    }));

    setState({
      lessonTitle: lessonDetail.title || "",
      lessonDescription: lessonDetail.description || "",
      langCode: listeningData?.lang_code || "en-GB",
      scenario: listeningData?.scenario || lessonDetail.description || "",
      speakers,
      scriptLines,
      audioUrl: listeningData?.audio_url || "",
      durationSeconds: Number(listeningData?.duration_seconds || 0),
      maxPlays: Number(listeningData?.max_plays || 0),
      showTranscriptBeforeSubmit: Boolean(
        listeningData?.show_transcript_before_submit
      ),
      passPercent: Number(listeningData?.pass_percent || 70),
      quizzes,
    });
    setHydrated(true);
  }, [hydrated, lessonDetail, listeningData, isLoadingListening]);

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
      setError("Vui lòng nhập tên bài Luyện Nghe.");
      return;
    }
    const validLines = state.scriptLines.filter((l) => l.text.trim().length > 0);
    if (validLines.length === 0) {
      setError("Vui lòng nhập ít nhất 1 câu thoại trong kịch bản.");
      return;
    }

    const validQuizzes = state.quizzes
      .filter((q) => q.question.trim().length > 0)
      .map((q) => {
        const cleanedOpts = q.options
          .filter((o) => o.text.trim().length > 0)
          .map((o, idx) => ({
            text: o.text.trim(),
            is_correct: Boolean(o.is_correct),
            feedback: o.feedback?.trim() || "",
            position: idx,
          }));
        if (cleanedOpts.length > 0 && !cleanedOpts.some((o) => o.is_correct)) {
          cleanedOpts[0].is_correct = true;
        }
        return {
          question: q.question.trim(),
          difficulty_level: q.difficulty_level || 1,
          explanation: q.explanation.trim(),
          options: cleanedOpts,
        };
      })
      .filter((q) => q.options.length >= 2);

    setIsSubmitting(true);
    setError(null);
    setSavedBanner(null);
    try {
      if (state.lessonTitle.trim() !== (lessonDetail.title || "").trim()) {
        await api.put(`/lecturer/lessons/${lessonId}/rename`, {
          title: state.lessonTitle.trim(),
        });
      }

      const saveRes = await api.post("/lecturer/lessons/listening/save", {
        lesson_id: lessonId,
        section_id: lessonDetail.section_id,
        course_id: lessonDetail.course_id,
        lang_code: state.langCode,
        scenario: state.scenario.trim(),
        speakers: state.speakers,
        script_lines: validLines.map((l) => ({
          id: l.id,
          speaker_id: l.speaker_id,
          text: l.text.trim(),
          translation: (l.translation || "").trim(),
          start_ms: l.start_ms || 0,
          end_ms: l.end_ms || 0,
        })),
        audio_url: state.audioUrl || null,
        duration_seconds: state.durationSeconds || 0,
        max_plays: state.maxPlays,
        show_transcript_before_submit: state.showTranscriptBeforeSubmit,
        pass_percent: state.passPercent,
        auto_render_audio: autoRenderAudio,
        quizzes: validQuizzes,
      });

      if (saveRes.data?.audio_url) {
        setState((prev) => ({
          ...prev,
          audioUrl: saveRes.data.audio_url,
          durationSeconds: Number(
            saveRes.data.duration_seconds || prev.durationSeconds
          ),
        }));
      }

      await Promise.all([mutateDetail(), mutateListening()]);
      setSavedBanner("Đã cập nhật bài Luyện Nghe Hội Thoại thành công.");
      showToast.success("Đã lưu thay đổi bài Luyện Nghe!");
    } catch (err: unknown) {
      const msg = formatApiError(err, "Không thể lưu thay đổi bài Luyện Nghe");
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDetail || isLoadingListening || !hydrated) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Skeleton className="h-[520px] rounded-2xl lg:col-span-4" />
            <Skeleton className="h-[520px] rounded-2xl lg:col-span-8" />
          </div>
        </div>
      </div>
    );
  }

  if (!lessonDetail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border p-6 text-center">
          <Alert variant="destructive" title="Không tìm thấy bài học">
            Bài Luyện Nghe không tồn tại hoặc bạn không có quyền chỉnh sửa.
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
    <ListeningStudio
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
