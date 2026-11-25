"use client";

import {
  FillBlankStudio,
  FillBlankStudioState,
} from "@/components/lecturer/lessons/shared/fill-blank-studio";
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

function createInitialState(): FillBlankStudioState {
  return {
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
  };
}

export default function CreateFillBlankLesson() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const [state, setState] = useState<FillBlankStudioState>(() =>
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
    try {
      const createRes = await api.post("/lecturer/lessons/create", {
        section_id: sectionId,
        title: state.lessonTitle.trim(),
        description: state.translation.trim() || state.promptText.slice(0, 200),
        lesson_type: "fill_blank",
      });
      const lessonId = createRes.data?.id as string | undefined;
      if (!lessonId) {
        throw new Error("Không nhận được ID bài học từ máy chủ.");
      }

      await api.post("/lecturer/lessons/fill-blank/save", {
        lesson_id: lessonId,
        section_id: sectionId,
        course_id: courseId,
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

      showToast.success(
        `Đã tạo bài Điền từ "${state.lessonTitle.trim()}" thành công!`
      );
      router.push(`/lecturer/lessons/${lessonId}/edit`);
    } catch (err: unknown) {
      const msg = formatApiError(err, "Đã xảy ra lỗi khi tạo bài Điền từ");
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
    <FillBlankStudio
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
