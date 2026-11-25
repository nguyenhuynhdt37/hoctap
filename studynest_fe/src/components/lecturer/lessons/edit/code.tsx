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
import { Alert, Skeleton } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  CodeExercise,
  CodeFile,
  CodeLanguage,
  LessonDetail,
  TestCase,
} from "@/types/lecturer/lesson-api";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "pulsoicon-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

interface ApiCodeFile {
  id: string;
  filename: string;
  content: string;
  role: "starter" | "solution" | string;
  is_main: boolean;
}

interface ApiCodeTestCase {
  id: string;
  input: string | null;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
}

interface ApiCodeExercise {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  language_id?: string;
  time_limit?: number;
  memory_limit?: number;
  starter_files: ApiCodeFile[];
  solution_files: ApiCodeFile[];
  testcases: ApiCodeTestCase[];
}

const EditCodeLesson = () => {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id as string | undefined;

  const [mounted, setMounted] = useState(false);
  const [exercisesHydrated, setExercisesHydrated] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [selectedLanguageId, setSelectedLanguageId] = useState("");
  const [exercises, setExercises] = useState<CodeExercise[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

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
    data: codeExercisesData,
    isLoading: isLoadingCode,
    mutate: mutateCodeExercises,
  } = useSWR<ApiCodeExercise[]>(
    lessonId ? `/lecturer/lessons/${lessonId}/code` : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return Array.isArray(res.data) ? res.data : [];
      } catch (err: any) {
        if (err?.response?.status === 404) return [];
        throw err;
      }
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (err: any) => err?.response?.status !== 404,
    }
  );

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
      try {
        const res = await api.get(url);
        return res.data;
      } catch {
        return [];
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

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

    if (groups.length === 0 && Array.isArray(videoLessonsData) && currentSecId) {
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
          sectionId: currentSecId,
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
  }, [chaptersData, videoLessonsData, lessonDetail?.section_id, sectionName]);

  useEffect(() => {
    if (lessonDetail && !mounted) {
      setLessonTitle(lessonDetail.title || "");
      setMounted(true);
    }
  }, [lessonDetail, mounted]);

  useEffect(() => {
    if (
      codeExercisesData !== undefined &&
      codeLanguages.length > 0 &&
      !exercisesHydrated
    ) {
      let resolvedLangId = selectedLanguageId;
      if (codeExercisesData.length > 0) {
        const firstApi = codeExercisesData[0];
        const matched = codeLanguages.find(
          (l) =>
            (firstApi.language_id && l.id === firstApi.language_id) ||
            l.name.toLowerCase() === (firstApi.language || "").toLowerCase()
        );
        resolvedLangId = (matched || codeLanguages[0]).id;
        setSelectedLanguageId(resolvedLangId);

        const mapped: CodeExercise[] = codeExercisesData.map((apiEx) => {
          const solFiles: CodeFile[] = (apiEx.solution_files || []).map((f) => ({
            id: f.id,
            filename: f.filename,
            content: f.content || "",
            is_main: Boolean(f.is_main),
          }));
          const startFiles: CodeFile[] = (apiEx.starter_files || []).map((f) => ({
            id: f.id,
            filename: f.filename,
            content: f.content || "",
            is_main: Boolean(f.is_main),
          }));
          const tests: TestCase[] = [...(apiEx.testcases || [])]
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((t) => ({
              id: t.id,
              input: t.input || "",
              expected_output: t.expected_output || "",
              is_sample: Boolean(t.is_sample),
            }));

          const item: CodeExercise = {
            id: apiEx.id,
            title: apiEx.title || "",
            difficulty: apiEx.difficulty || "medium",
            description: apiEx.description || "",
            codeFiles:
              solFiles.length > 0
                ? solFiles
                : [{ id: `file-${apiEx.id}`, filename: "main.py", content: "", is_main: true }],
            starterCodeFiles:
              startFiles.length > 0
                ? startFiles
                : [{ id: `starter-${apiEx.id}`, filename: "main.py", content: "", is_main: true }],
            testCases:
              tests.length > 0
                ? tests
                : [{ id: `test-${apiEx.id}`, input: "", expected_output: "", is_sample: true }],
            activeFileId:
              solFiles.find((f) => f.is_main)?.id || solFiles[0]?.id || `file-${apiEx.id}`,
            activeStarterFileId:
              startFiles.find((f) => f.is_main)?.id ||
              startFiles[0]?.id ||
              `starter-${apiEx.id}`,
            renamingFileId: null,
            renameValue: "",
            testResult: {
              status: "passed",
              passed: tests.length,
              failed: 0,
              total: tests.length,
              language: matched?.name || apiEx.language || "",
              version: matched?.version || "",
              details: [],
              time_limit: apiEx.time_limit || 500,
              memory_limit: Math.round((apiEx.memory_limit || 512000000) / 2),
            },
            lastTestedSnapshot: null,
          };
          item.lastTestedSnapshot = createExerciseSnapshot(item, resolvedLangId);
          return item;
        });
        setExercises(mapped);
      } else {
        const python = codeLanguages.find((l) =>
          l.name.toLowerCase().includes("python")
        );
        const fallbackLang = python || codeLanguages[0];
        setSelectedLanguageId(fallbackLang.id);
        setExercises([
          createEmptyCodeExercise(getCodeFileExtension(fallbackLang.name)),
        ]);
      }
      setExercisesHydrated(true);
    }
  }, [codeExercisesData, codeLanguages, exercisesHydrated, selectedLanguageId]);

  const selectedLang = useMemo(
    () => codeLanguages.find((l) => l.id === selectedLanguageId) || null,
    [codeLanguages, selectedLanguageId]
  );

  const hasLessonChanges = useMemo(() => {
    if (!lessonDetail) return false;
    return lessonTitle.trim() !== (lessonDetail.title || "").trim();
  }, [lessonTitle, lessonDetail]);

  const hasCodeExercisesChanges = useMemo(() => {
    if (!exercisesHydrated) return false;
    const baseline = codeExercisesData || [];
    if (baseline.length === 0) return exercises.length > 0;
    if (exercises.length !== baseline.length) return true;

    const apiMap = new Map(baseline.map((ex) => [ex.id, ex]));
    for (const ex of exercises) {
      const orig = apiMap.get(ex.id);
      if (!orig) return true;
      if (
        ex.title.trim() !== (orig.title || "").trim() ||
        cleanCodeDescription(ex.description) !==
          cleanCodeDescription(orig.description || "") ||
        ex.difficulty !== orig.difficulty ||
        (selectedLang?.name || "").toLowerCase() !==
          (orig.language || "").toLowerCase()
      ) {
        return true;
      }
      if (
        ex.codeFiles.length !== (orig.solution_files || []).length ||
        ex.starterCodeFiles.length !== (orig.starter_files || []).length ||
        ex.testCases.length !== (orig.testcases || []).length
      ) {
        return true;
      }
      const solMap = new Map((orig.solution_files || []).map((f) => [f.id, f]));
      for (const f of ex.codeFiles) {
        const of = solMap.get(f.id);
        if (
          !of ||
          f.filename.trim() !== of.filename.trim() ||
          (f.content || "") !== (of.content || "") ||
          Boolean(f.is_main) !== Boolean(of.is_main)
        ) {
          return true;
        }
      }
      const startMap = new Map((orig.starter_files || []).map((f) => [f.id, f]));
      for (const f of ex.starterCodeFiles) {
        const of = startMap.get(f.id);
        if (
          !of ||
          f.filename.trim() !== of.filename.trim() ||
          (f.content || "") !== (of.content || "") ||
          Boolean(f.is_main) !== Boolean(of.is_main)
        ) {
          return true;
        }
      }
      const tcMap = new Map((orig.testcases || []).map((t) => [t.id, t]));
      for (const t of ex.testCases) {
        const ot = tcMap.get(t.id);
        if (
          !ot ||
          (t.input || "") !== (ot.input || "") ||
          (t.expected_output || "") !== (ot.expected_output || "") ||
          Boolean(t.is_sample) !== Boolean(ot.is_sample)
        ) {
          return true;
        }
      }
    }
    return false;
  }, [exercises, codeExercisesData, exercisesHydrated, selectedLang]);

  const hasChanges = hasLessonChanges || hasCodeExercisesChanges;

  const canSaveReason = useMemo(() => {
    if (!lessonTitle.trim()) return "Vui lòng nhập tiêu đề bài học.";
    if (!selectedLanguageId) return "Vui lòng chọn ngôn ngữ lập trình.";
    if (hasLessonChanges && !hasCodeExercisesChanges) return null;
    for (let i = 0; i < exercises.length; i++) {
      const issues = getExerciseIssues(
        exercises[i],
        selectedLanguageId,
        hasCodeExercisesChanges
      );
      if (issues.length > 0) {
        return `Bài ${i + 1}: ${issues[0]}.`;
      }
    }
    return null;
  }, [
    lessonTitle,
    selectedLanguageId,
    exercises,
    hasLessonChanges,
    hasCodeExercisesChanges,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!lessonId) return;
    if (canSaveReason) {
      showToast.error(canSaveReason);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSavedBanner(null);

    try {
      if (hasLessonChanges) {
        await api.put(`/lecturer/lessons/${lessonId}`, {
          title: lessonTitle.trim(),
        });
        await mutateLessonDetail();
      }

      if (hasCodeExercisesChanges) {
        const baseline = codeExercisesData || [];
        const apiMap = new Map(baseline.map((ex) => [ex.id, ex]));
        const formIds = new Set(exercises.map((ex) => ex.id));

        const deletedExercises: any[] = [];
        for (const apiEx of baseline) {
          if (!formIds.has(apiEx.id)) {
            deletedExercises.push({
              lesson_code_id: apiEx.id,
              type: "delete",
              title: null,
              description: null,
              difficulty: null,
              language_id: null,
              time_limit: null,
              memory_limit: null,
              files: [
                ...(apiEx.solution_files || []).map((f) => ({
                  id: f.id,
                  filename: f.filename || null,
                  content: f.content || null,
                  role: "solution",
                  is_main: Boolean(f.is_main),
                  type: "delete",
                })),
                ...(apiEx.starter_files || []).map((f) => ({
                  id: f.id,
                  filename: f.filename || null,
                  content: f.content || null,
                  role: "starter",
                  is_main: Boolean(f.is_main),
                  type: "delete",
                })),
              ],
              testcases: (apiEx.testcases || []).map((t) => ({
                id: t.id,
                input: t.input || null,
                expected_output: t.expected_output || null,
                is_sample: Boolean(t.is_sample),
                order_index: t.order_index ?? null,
                type: "delete",
              })),
            });
          }
        }

        const payload = exercises.map((ex) => {
          const apiEx = apiMap.get(ex.id);
          const exerciseType = apiEx ? "update" : "create";
          const files: any[] = [];
          const testcases: any[] = [];

          if (apiEx) {
            const apiFilesMap = new Map<string, ApiCodeFile>();
            for (const f of apiEx.solution_files || []) {
              apiFilesMap.set(f.id, { ...f, role: "solution" });
            }
            for (const f of apiEx.starter_files || []) {
              apiFilesMap.set(f.id, { ...f, role: "starter" });
            }
            const formFileIds = new Set<string>();

            for (const f of ex.codeFiles) {
              formFileIds.add(f.id);
              if (apiFilesMap.has(f.id)) {
                files.push({
                  id: f.id,
                  filename: f.filename.trim(),
                  content: f.content || "",
                  role: "solution",
                  is_main: Boolean(f.is_main),
                  type: "update",
                });
              } else {
                files.push({
                  filename: f.filename.trim(),
                  content: f.content || "",
                  role: "solution",
                  is_main: Boolean(f.is_main),
                  type: "create",
                });
              }
            }

            for (const f of ex.starterCodeFiles) {
              formFileIds.add(f.id);
              if (apiFilesMap.has(f.id)) {
                files.push({
                  id: f.id,
                  filename: f.filename.trim(),
                  content: f.content || "",
                  role: "starter",
                  is_main: Boolean(f.is_main),
                  type: "update",
                });
              } else {
                files.push({
                  filename: f.filename.trim(),
                  content: f.content || "",
                  role: "starter",
                  is_main: Boolean(f.is_main),
                  type: "create",
                });
              }
            }

            apiFilesMap.forEach((apiFile, fid) => {
              if (!formFileIds.has(fid)) {
                files.push({
                  id: fid,
                  filename: apiFile.filename || null,
                  content: apiFile.content || null,
                  role: apiFile.role === "solution" ? "solution" : "starter",
                  is_main: Boolean(apiFile.is_main),
                  type: "delete",
                });
              }
            });

            const apiTcMap = new Map(
              (apiEx.testcases || []).map((t) => [t.id, t])
            );
            const formTcIds = new Set<string>();
            ex.testCases.forEach((t, idx) => {
              formTcIds.add(t.id);
              if (apiTcMap.has(t.id)) {
                testcases.push({
                  id: t.id,
                  input: t.input || "",
                  expected_output: t.expected_output || "",
                  is_sample: Boolean(t.is_sample),
                  order_index: idx,
                  type: "update",
                });
              } else {
                testcases.push({
                  input: t.input || "",
                  expected_output: t.expected_output || "",
                  is_sample: Boolean(t.is_sample),
                  order_index: idx,
                  type: "create",
                });
              }
            });
            apiTcMap.forEach((apiTc, tid) => {
              if (!formTcIds.has(tid)) {
                testcases.push({
                  id: tid,
                  input: apiTc.input || null,
                  expected_output: apiTc.expected_output || null,
                  is_sample: Boolean(apiTc.is_sample),
                  order_index: apiTc.order_index ?? null,
                  type: "delete",
                });
              }
            });
          } else {
            for (const f of ex.codeFiles) {
              files.push({
                filename: f.filename.trim(),
                content: f.content || "",
                role: "solution",
                is_main: Boolean(f.is_main),
                type: "create",
              });
            }
            for (const f of ex.starterCodeFiles) {
              files.push({
                filename: f.filename.trim(),
                content: f.content || "",
                role: "starter",
                is_main: Boolean(f.is_main),
                type: "create",
              });
            }
            ex.testCases.forEach((t, idx) => {
              testcases.push({
                input: t.input || "",
                expected_output: t.expected_output || "",
                is_sample: Boolean(t.is_sample),
                order_index: idx,
                type: "create",
              });
            });
          }

          const item: any = {
            type: exerciseType,
            title: ex.title.trim(),
            description: cleanCodeDescription(ex.description),
            difficulty: ex.difficulty,
            language_id: selectedLanguageId,
            time_limit: ex.testResult?.time_limit || 500,
            memory_limit: ex.testResult?.memory_limit
              ? ex.testResult.memory_limit * 2
              : 256000000,
            files,
            testcases,
          };
          if (exerciseType === "update") {
            item.lesson_code_id = ex.id;
          }
          return item;
        });

        await api.put(`/lecturer/lessons/${lessonId}/code`, [
          ...payload,
          ...deletedExercises,
        ]);
        await mutateCodeExercises();
        setExercisesHydrated(false);
      }

      const msg = `Đã lưu bài học Lập trình "${lessonTitle.trim()}" thành công.`;
      setSavedBanner(msg);
      showToast.success(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = formatApiError(err, "Đã xảy ra lỗi khi cập nhật bài học lập trình");
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    lessonId,
    canSaveReason,
    hasLessonChanges,
    hasCodeExercisesChanges,
    lessonTitle,
    codeExercisesData,
    exercises,
    selectedLanguageId,
    mutateLessonDetail,
    mutateCodeExercises,
  ]);

  if (!lessonId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border border-border p-6 text-center">
          <Alert variant="destructive" title="Thiếu mã bài học">
            Không tìm thấy mã bài học lập trình cần chỉnh sửa.
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

  if ((isLoadingDetail || isLoadingCode) && !mounted) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
            <div className="space-y-4 lg:col-span-4">
              <Skeleton className="h-72 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CodeStudio
      mode="edit"
      sectionName={sectionName}
      lessonTitle={lessonTitle}
      onLessonTitleChange={setLessonTitle}
      selectedLanguageId={selectedLanguageId}
      onLanguageChange={setSelectedLanguageId}
      codeLanguages={codeLanguages}
      isLoadingLanguages={isLoadingLanguages}
      exercises={exercises}
      onExercisesChange={setExercises}
      videoSections={videoSections}
      isSubmitting={isSubmitting}
      hasChanges={hasChanges}
      canSaveReason={canSaveReason}
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
      onOpenPreview={(id) => router.push(`/lecturer/lessons/${id}/preview`)}
    />
  );
};

export default EditCodeLesson;
