"use client";

import {
  cleanCodeDescription,
  CodeStudio,
  createEmptyCodeExercise,
  createExerciseSnapshot,
  getCodeFileExtension,
  getExerciseIssues,
} from "@/components/lecturer/lessons/shared/code-studio";
import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { CodeExercise, CodeLanguage } from "@/types/lecturer/lesson-api";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const CreateCodeLesson = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const [lessonTitle, setLessonTitle] = useState("");
  const [selectedLanguageId, setSelectedLanguageId] = useState("");
  const [exercises, setExercises] = useState<CodeExercise[]>(() => [
    createEmptyCodeExercise("py"),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);

  const { data: languagesData, isLoading: isLoadingLanguages } = useSWR<
    CodeLanguage[]
  >(
    "/lecturer/lessons/code_languages",
    async (url: string) => {
      const res = await api.get<CodeLanguage[]>(url);
      return Array.isArray(res.data) ? res.data : [];
    },
    { revalidateOnFocus: false }
  );

  const codeLanguages = useMemo(
    () => (languagesData || []).filter((l) => l.is_active !== false),
    [languagesData]
  );

  useEffect(() => {
    if (!selectedLanguageId && codeLanguages.length > 0) {
      const python = codeLanguages.find((l) =>
        l.name.toLowerCase().includes("python")
      );
      setSelectedLanguageId((python || codeLanguages[0]).id);
    }
  }, [codeLanguages, selectedLanguageId]);

  const { data: chaptersData } = useSWR(
    courseId ? `/lecturer/chapters/${courseId}` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const { data: videoLessonsData } = useSWR(
    sectionId ? `/lecturer/lessons/${sectionId}` : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch {
        return [];
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
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

    if (groups.length === 0 && Array.isArray(videoLessonsData) && sectionId) {
      const fallback = videoLessonsData
        .filter(
          (l: {
            lesson_type?: string;
            has_embedding?: boolean;
            chunk_count?: number;
          }) =>
            l.lesson_type === "video" &&
            (l.has_embedding === true || (l.chunk_count ?? 0) > 0)
        )
        .map((l: { id: string; title?: string }) => ({
          id: l.id,
          title: l.title || "Bài giảng video",
        }));
      if (fallback.length > 0) {
        groups.push({
          sectionId,
          sectionTitle: sectionName || "Chương hiện tại",
          isCurrent: true,
          videos: fallback,
        });
      }
    }

    groups.sort(
      (a, b) => Number(Boolean(b.isCurrent)) - Number(Boolean(a.isCurrent))
    );
    return groups;
  }, [chaptersData, videoLessonsData, sectionId, sectionName]);

  const handleLanguageChange = (nextLangId: string) => {
    setSelectedLanguageId(nextLangId);
    const nextLang = codeLanguages.find((l) => l.id === nextLangId);
    if (!nextLang) return;
    const ext = getCodeFileExtension(nextLang.name);
    setExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        codeFiles: ex.codeFiles.map((f) => ({
          ...f,
          filename: f.filename.includes(".")
            ? `${f.filename.replace(/\.[^.]+$/, "")}.${ext}`
            : `${f.filename}.${ext}`,
        })),
        starterCodeFiles: ex.starterCodeFiles.map((f) => ({
          ...f,
          filename: f.filename.includes(".")
            ? `${f.filename.replace(/\.[^.]+$/, "")}.${ext}`
            : `${f.filename}.${ext}`,
        })),
      }))
    );
  };

  const canSaveReason = useMemo(() => {
    if (!lessonTitle.trim()) return "Vui lòng nhập tiêu đề bài học.";
    if (!selectedLanguageId) return "Vui lòng chọn ngôn ngữ lập trình.";
    if (exercises.length === 0) return "Cần ít nhất 1 bài tập lập trình.";
    for (let i = 0; i < exercises.length; i++) {
      const issues = getExerciseIssues(exercises[i], selectedLanguageId, true);
      if (issues.length > 0) {
        return `Bài ${i + 1}: ${issues[0]}.`;
      }
    }
    return null;
  }, [lessonTitle, selectedLanguageId, exercises]);

  const handleSubmit = async () => {
    if (canSaveReason) {
      showToast.error(canSaveReason);
      return;
    }
    if (!sectionId || !courseId) {
      setError("Thiếu thông tin section_id hoặc course_id.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createRes = await api.post("/lecturer/lessons/create", {
        section_id: sectionId,
        title: lessonTitle.trim(),
        lesson_type: "code",
      });
      const lessonId = createRes.data?.id as string | undefined;
      if (!lessonId) {
        throw new Error("Không nhận được ID bài học từ máy chủ.");
      }

      const payload = exercises.map((ex) => ({
        language_id: selectedLanguageId,
        title: ex.title.trim(),
        description: cleanCodeDescription(ex.description),
        difficulty: ex.difficulty,
        time_limit: ex.testResult?.time_limit || 500,
        memory_limit: (ex.testResult?.memory_limit || 256000000) * 2,
        starter_files: ex.starterCodeFiles.map((f) => ({
          filename: f.filename.trim(),
          content: f.content || "",
          is_main: Boolean(f.is_main),
        })),
        solution_files: ex.codeFiles.map((f) => ({
          filename: f.filename.trim(),
          content: f.content || "",
          is_main: Boolean(f.is_main),
        })),
        testcases: ex.testCases.map((t, index) => ({
          input: t.input || "",
          expected_output: t.expected_output || "",
          is_sample: Boolean(t.is_sample),
          order_index: index,
        })),
      }));

      await api.post(`/lecturer/lessons/${lessonId}/code/create`, payload);

      // Giữ snapshot mới nhất sau khi tạo thành công
      setExercises((prev) =>
        prev.map((ex) => ({
          ...ex,
          lastTestedSnapshot: createExerciseSnapshot(ex, selectedLanguageId),
        }))
      );
      setCreatedLessonId(lessonId);
      showToast.success(
        `Đã tạo bài học Lập trình với ${payload.length} bài tập thành công.`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = formatApiError(err, "Đã xảy ra lỗi khi tạo bài học lập trình");
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
    <CodeStudio
      mode="create"
      sectionName={sectionName}
      lessonTitle={lessonTitle}
      onLessonTitleChange={setLessonTitle}
      selectedLanguageId={selectedLanguageId}
      onLanguageChange={handleLanguageChange}
      codeLanguages={codeLanguages}
      isLoadingLanguages={isLoadingLanguages}
      exercises={exercises}
      onExercisesChange={setExercises}
      videoSections={videoSections}
      isSubmitting={isSubmitting}
      canSaveReason={canSaveReason}
      error={error}
      onClearError={() => setError(null)}
      successBanner={
        createdLessonId
          ? {
              title: "Tạo bài học Lập trình thành công!",
              description: `Bài học "${lessonTitle.trim()}" với ${exercises.length} bài tập đã được lưu vào chương học.`,
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
      onOpenPreview={(id) => router.push(`/lecturer/lessons/${id}/preview`)}
    />
  );
};

export default CreateCodeLesson;
