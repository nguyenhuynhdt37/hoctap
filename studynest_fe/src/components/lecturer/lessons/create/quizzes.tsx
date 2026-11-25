"use client";

import {
  createEmptyQuizItem,
  QuizStudio,
  QuizStudioItem,
  StudioVideoSectionGroup,
  validateQuizStudioForm,
} from "@/components/lecturer/lessons/shared/quiz-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { QuizFormData } from "@/types/lecturer/lesson-api";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

const CreateQuizLesson = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);

  const [formData, setFormData] = useState<QuizFormData>({
    title: "",
    description: "",
  });

  const [quizzes, setQuizzes] = useState<QuizStudioItem[]>(() => [
    createEmptyQuizItem(),
  ]);

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
      (section: { section_id?: string; section_title?: string }) =>
        section.section_id === sectionId
    )?.section_title || "";

  const { data: videoLessonsData } = useSWR(
    sectionId ? `/lecturer/lessons/${sectionId}` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const videoSections = useMemo<StudioVideoSectionGroup[]>(() => {
    const sections = Array.isArray(chaptersData?.sections)
      ? chaptersData.sections
      : [];
    const groups: StudioVideoSectionGroup[] = [];

    for (const sec of sections) {
      const secLessons = Array.isArray(sec.lessons) ? sec.lessons : [];
      const videos = secLessons
        .filter(
          (l: { lesson_type?: string; has_embedding?: boolean; chunk_count?: number }) =>
            l.lesson_type === "video" &&
            (l.has_embedding === true || (l.chunk_count ?? 0) > 0)
        )
        .map((l: { lesson_id?: string; id?: string; lesson_title?: string; title?: string }) => ({
          id: l.lesson_id || l.id || "",
          title: l.lesson_title || l.title || "Bài giảng video",
        }))
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

    // Fallback nếu API chapters chưa kèm lessons
    if (groups.length === 0 && Array.isArray(videoLessonsData) && sectionId) {
      const fallbackVideos = videoLessonsData
        .filter(
          (lesson: { lesson_type?: string; has_embedding?: boolean; chunk_count?: number }) =>
            lesson.lesson_type === "video" &&
            (lesson.has_embedding === true || (lesson.chunk_count ?? 0) > 0)
        )
        .map((lesson: { id: string; title?: string; duration?: number | null }) => ({
          id: lesson.id,
          title: lesson.title || "Bài giảng video",
          duration: lesson.duration ?? null,
        }));
      if (fallbackVideos.length > 0) {
        groups.push({
          sectionId,
          sectionTitle: sectionName || "Chương hiện tại",
          isCurrent: true,
          videos: fallbackVideos,
        });
      }
    }

    // Đưa chương hiện tại lên đầu danh sách
    groups.sort((a, b) => Number(Boolean(b.isCurrent)) - Number(Boolean(a.isCurrent)));
    return groups;
  }, [chaptersData, videoLessonsData, sectionId, sectionName]);

  const handleSubmit = async () => {
    const check = validateQuizStudioForm(formData, quizzes);
    if (!check.valid) {
      setError(check.message || "Vui lòng kiểm tra lại thông tin bài học.");
      return;
    }

    if (!sectionId || !courseId) {
      setError("Thiếu thông tin section_id hoặc course_id.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createResponse = await api.post("/lecturer/lessons/create", {
        section_id: sectionId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        lesson_type: "quiz",
      });

      const lessonId = createResponse.data?.id as string | undefined;
      if (!lessonId) {
        throw new Error("Không nhận được ID bài học từ máy chủ.");
      }

      const quizzesPayload = quizzes.map((quiz) => ({
        question: quiz.question.trim(),
        explanation: quiz.explanation.trim(),
        difficulty_level: quiz.difficulty_level || 1,
        options: quiz.options.map((opt, idx) => ({
          text: opt.text.trim(),
          is_correct: Boolean(opt.is_correct),
          feedback: opt.feedback.trim(),
          position: idx,
        })),
      }));

      await api.post("/lecturer/lessons/quizzes/bulk", {
        lesson_id: lessonId,
        created_by: "lecturer",
        section_id: sectionId,
        course_id: courseId,
        quizzes: quizzesPayload,
      });

      setCreatedLessonId(lessonId);
      showToast.success(
        `Đã tạo bài trắc nghiệm với ${quizzesPayload.length} câu hỏi thành công.`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const message = formatApiError(err, "Đã xảy ra lỗi khi tạo bài học trắc nghiệm");
      setError(message);
      showToast.error(message);
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
              leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            >
              Quay lại
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <QuizStudio
      mode="create"
      courseId={courseId}
      sectionName={sectionName}
      formData={formData}
      onFormDataChange={setFormData}
      quizzes={quizzes}
      onQuizzesChange={setQuizzes}
      videoSections={videoSections}
      isSubmitting={isSubmitting}
      error={error}
      onClearError={() => setError(null)}
      successBanner={
        createdLessonId
          ? {
              title: "Tạo bài học Trắc nghiệm thành công!",
              description: `Bài học "${formData.title.trim()}" với ${quizzes.length} câu hỏi đã được lưu vào chương học.`,
              lessonId: createdLessonId,
            }
          : null
      }
      onSubmit={handleSubmit}
      onBackToChapters={() =>
        router.push(`/lecturer/chapters?course_id=${courseId}`)
      }
      onOpenResources={(id) => router.push(`/lecturer/resources?lesson_id=${id}`)}
      onOpenEdit={(id) => router.push(`/lecturer/lessons/${id}/edit`)}
    />
  );
};

export default CreateQuizLesson;
