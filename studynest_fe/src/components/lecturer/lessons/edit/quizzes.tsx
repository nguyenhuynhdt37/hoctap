"use client";

import {
  createEmptyQuizItem,
  createQuizUid,
  QuizStudio,
  QuizStudioItem,
  StudioVideoSectionGroup,
  validateQuizStudioForm,
} from "@/components/lecturer/lessons/shared/quiz-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { LessonDetail, QuizFormData } from "@/types/lecturer/lesson-api";
import { LessonQuiz } from "@/types/lecturer/quiz";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const EditQuizLesson = () => {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id as string | undefined;

  const [mounted, setMounted] = useState(false);
  const [quizzesHydrated, setQuizzesHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const [formData, setFormData] = useState<QuizFormData>({
    title: "",
    description: "",
  });

  const [quizzes, setQuizzes] = useState<QuizStudioItem[]>([]);

  const {
    data: lessonDetail,
    isLoading: isLoadingDetail,
    mutate: mutateLessonDetail,
  } = useSWR<LessonDetail>(
    lessonId ? `/lecturer/lessons/${lessonId}/detail` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const {
    data: quizzesData,
    isLoading: isLoadingQuizzes,
    mutate: mutateQuizzes,
  } = useSWR<LessonQuiz[]>(
    lessonId ? `/lecturer/lessons/${lessonId}/quizzes` : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return Array.isArray(res.data) ? res.data : [];
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return [];
        }
        throw err;
      }
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (err: any) => err?.response?.status !== 404,
    }
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

  const { data: videoLessonsData } = useSWR(
    lessonDetail?.section_id
      ? `/lecturer/lessons/${lessonDetail.section_id}`
      : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const sectionName = useMemo(() => {
    if (!chaptersData?.sections || !lessonDetail?.section_id) return "";
    return (
      chaptersData.sections.find(
        (section: { section_id?: string; section_title?: string }) =>
          section.section_id === lessonDetail.section_id
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
          isCurrent: sec.section_id === currentSecId,
          videos,
        });
      }
    }

    if (groups.length === 0 && Array.isArray(videoLessonsData) && currentSecId) {
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
          sectionId: currentSecId,
          sectionTitle: sectionName || "Chương hiện tại",
          isCurrent: true,
          videos: fallbackVideos,
        });
      }
    }

    groups.sort((a, b) => Number(Boolean(b.isCurrent)) - Number(Boolean(a.isCurrent)));
    return groups;
  }, [chaptersData, videoLessonsData, lessonDetail?.section_id, sectionName]);

  useEffect(() => {
    if (lessonDetail && !mounted) {
      setFormData({
        title: lessonDetail.title || "",
        description: lessonDetail.description || "",
      });
      setMounted(true);
    }
  }, [lessonDetail, mounted]);

  useEffect(() => {
    if (quizzesData !== undefined && !quizzesHydrated) {
      if (quizzesData.length > 0) {
        setQuizzes(
          quizzesData.map((quiz) => ({
            uid: quiz.id || createQuizUid(),
            question: quiz.question || "",
            explanation: quiz.explanation || "",
            difficulty_level: quiz.difficulty_level || 1,
            options: (quiz.options || []).map((opt, idx) => ({
              text: opt.text || "",
              is_correct: Boolean(opt.is_correct),
              feedback: opt.feedback || "",
              position: typeof opt.position === "number" ? opt.position : idx,
            })),
          }))
        );
      } else {
        setQuizzes([createEmptyQuizItem()]);
      }
      setQuizzesHydrated(true);
    }
  }, [quizzesData, quizzesHydrated]);

  const hasLessonChanges = useMemo(() => {
    if (!lessonDetail) return false;
    return (
      formData.title.trim() !== (lessonDetail.title || "").trim() ||
      formData.description.trim() !== (lessonDetail.description || "").trim()
    );
  }, [formData, lessonDetail]);

  const hasQuizzesChanges = useMemo(() => {
    if (!quizzesHydrated) return false;
    const baseline = quizzesData || [];
    if (quizzes.length !== baseline.length) return true;

    for (let i = 0; i < quizzes.length; i++) {
      const q = quizzes[i];
      const orig = baseline[i];
      if (!orig) return true;
      if (
        q.question.trim() !== (orig.question || "").trim() ||
        q.explanation.trim() !== (orig.explanation || "").trim() ||
        (q.difficulty_level || 1) !== (orig.difficulty_level || 1) ||
        q.options.length !== (orig.options || []).length
      ) {
        return true;
      }
      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        const origOpt = orig.options[j];
        if (
          !origOpt ||
          opt.text.trim() !== (origOpt.text || "").trim() ||
          Boolean(opt.is_correct) !== Boolean(origOpt.is_correct) ||
          opt.feedback.trim() !== (origOpt.feedback || "").trim()
        ) {
          return true;
        }
      }
    }
    return false;
  }, [quizzes, quizzesData, quizzesHydrated]);

  const hasChanges = hasLessonChanges || hasQuizzesChanges;

  const handleSubmit = useCallback(async () => {
    if (!lessonId) {
      setError("Thiếu thông tin mã bài học.");
      return;
    }
    const check = validateQuizStudioForm(formData, quizzes);
    if (!check.valid) {
      setError(check.message || "Vui lòng kiểm tra lại bộ câu hỏi.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSavedBanner(null);

    try {
      if (hasLessonChanges) {
        await api.put(`/lecturer/lessons/${lessonId}`, {
          title: formData.title.trim(),
          description: formData.description.trim(),
        });
        await mutateLessonDetail();
      }

      if (hasQuizzesChanges) {
        if (!lessonDetail?.course_id || !lessonDetail?.section_id) {
          throw new Error("Thiếu thông tin course_id hoặc section_id.");
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
          section_id: lessonDetail.section_id,
          course_id: lessonDetail.course_id,
          quizzes: quizzesPayload,
        });
        await mutateQuizzes();
      }

      const summary =
        hasLessonChanges || hasQuizzesChanges
          ? `Đã lưu bài trắc nghiệm "${formData.title.trim()}" với ${quizzes.length} câu hỏi.`
          : "Bộ câu hỏi hiện tại đã được đồng bộ.";
      setSavedBanner(summary);
      showToast.success(summary);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = formatApiError(err, "Đã xảy ra lỗi khi cập nhật bài học trắc nghiệm");
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    lessonId,
    formData,
    quizzes,
    hasLessonChanges,
    hasQuizzesChanges,
    lessonDetail,
    mutateLessonDetail,
    mutateQuizzes,
  ]);

  if (!lessonId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border border-border p-6 text-center">
          <Alert variant="destructive" title="Thiếu mã bài học">
            Không tìm thấy mã bài học cần chỉnh sửa.
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

  if ((isLoadingDetail || isLoadingQuizzes) && !mounted) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
            <div className="space-y-4 lg:col-span-4">
              <Skeleton className="h-72 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QuizStudio
      mode="edit"
      courseId={lessonDetail?.course_id}
      sectionName={sectionName}
      formData={formData}
      onFormDataChange={setFormData}
      quizzes={quizzes}
      onQuizzesChange={setQuizzes}
      videoSections={videoSections}
      isSubmitting={isSubmitting}
      hasChanges={hasChanges}
      error={error}
      onClearError={() => setError(null)}
      successBanner={
        savedBanner
          ? {
              title: "Lưu thay đổi thành công!",
              description: savedBanner,
              lessonId,
            }
          : null
      }
      onSubmit={handleSubmit}
      onBackToChapters={() =>
        router.push(
          lessonDetail?.course_id
            ? `/lecturer/chapters?course_id=${lessonDetail.course_id}`
            : "/lecturer/chapters"
        )
      }
      onOpenResources={(id) => router.push(`/lecturer/resources?lesson_id=${id}`)}
    />
  );
};

export default EditQuizLesson;
