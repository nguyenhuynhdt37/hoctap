"use client";

import {
  createDefaultSpeakers,
  createEmptyListeningQuiz,
  createEmptyScriptLine,
  ListeningStudio,
  ListeningStudioState,
} from "@/components/lecturer/lessons/shared/listening-studio";
import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

function createInitialState(): ListeningStudioState {
  const speakers = createDefaultSpeakers("en-GB");
  return {
    lessonTitle: "",
    lessonDescription: "",
    langCode: "en-GB",
    scenario: "",
    speakers,
    scriptLines: [
      createEmptyScriptLine(speakers[0].id),
      createEmptyScriptLine(speakers[1].id),
    ],
    audioUrl: "",
    durationSeconds: 0,
    maxPlays: 0,
    showTranscriptBeforeSubmit: false,
    passPercent: 70,
    quizzes: [createEmptyListeningQuiz()],
  };
}

export default function CreateListeningLesson() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const [state, setState] = useState<ListeningStudioState>(() =>
    createInitialState()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: chaptersData } = useSWR(
    courseId ? `/lecturer/chapters/${courseId}` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const sectionName: string =
    chaptersData?.sections?.find(
      (s: { section_id?: string; section_title?: string }) =>
        s.section_id === sectionId
    )?.section_title || "";

  const videoSections = useMemo<StudioVideoSectionGroup[]>(() => {
    const sections = Array.isArray(chaptersData?.sections)
      ? chaptersData.sections
      : [];
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
          isCurrent: sec.section_id === sectionId,
          videos,
        });
      }
    }
    groups.sort(
      (a, b) => Number(Boolean(b.isCurrent)) - Number(Boolean(a.isCurrent))
    );
    return groups;
  }, [chaptersData, sectionId]);

  const handleSave = async (autoRenderAudio: boolean) => {
    if (!sectionId || !courseId) {
      setError("Thiếu thông tin section_id hoặc course_id.");
      return;
    }
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
    try {
      const createRes = await api.post("/lecturer/lessons/create", {
        section_id: sectionId,
        title: state.lessonTitle.trim(),
        description: state.scenario.trim() || state.lessonDescription.trim(),
        lesson_type: "listening",
      });
      const lessonId = createRes.data?.id as string | undefined;
      if (!lessonId) {
        throw new Error("Không nhận được ID bài học từ máy chủ.");
      }

      await api.post("/lecturer/lessons/listening/save", {
        lesson_id: lessonId,
        section_id: sectionId,
        course_id: courseId,
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

      showToast.success(
        `Đã tạo bài Luyện Nghe "${state.lessonTitle.trim()}" thành công!`
      );
      router.push(`/lecturer/lessons/${lessonId}/edit`);
    } catch (err: unknown) {
      const msg = formatApiError(
        err,
        "Đã xảy ra lỗi khi tạo bài Luyện Nghe Hội Thoại"
      );
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sectionId || !courseId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border border-border p-6 text-center">
          <Alert variant="destructive" title="Thiếu thông tin cần thiết">
            Thiếu tham số section_id hoặc course_id. Vui lòng quay lại trang Chương &amp; bài học.
          </Alert>
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Quay lại
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ListeningStudio
      mode="create"
      sectionName={sectionName}
      videoSections={videoSections}
      state={state}
      onChange={setState}
      onSave={handleSave}
      onBack={() => router.push(`/lecturer/chapters?course_id=${courseId}`)}
      isSubmitting={isSubmitting}
      error={error}
    />
  );
}
