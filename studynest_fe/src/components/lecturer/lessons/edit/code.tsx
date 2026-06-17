"use client";

import CodeEditor from "@/components/shared/code-editor";
import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  CodeExercise,
  CodeExerciseFromAPI,
  CodeFile,
  CodeLanguage,
  LessonDetail,
  TestCase,
  TestResult,
} from "@/types/lecturer/lesson-api";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiCheckCircle,
  HiChevronLeft,
  HiChevronRight,
  HiCode,
  HiLightningBolt,
  HiPencil,
  HiPlay,
  HiPlus,
  HiSparkles,
  HiTrash,
  HiVideoCamera,
  HiX,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";

// ============================================
// HELPER FUNCTIONS
// ============================================

// Helper function to format error messages from API
const formatError = (error: any): string => {
  if (!error) return "Đã xảy ra lỗi không xác định";

  // If it's already a string, return it
  if (typeof error === "string") return error;

  // If it's an array of validation errors (FastAPI format)
  if (Array.isArray(error)) {
    return error
      .map((err: any) => {
        if (typeof err === "string") return err;
        if (err?.msg) {
          const loc = Array.isArray(err.loc) ? err.loc.join(".") : err.loc;
          return `${loc}: ${err.msg}`;
        }
        return JSON.stringify(err);
      })
      .join("\n");
  }

  // If it's an object
  if (typeof error === "object") {
    // Try common error message fields
    if (error.message) return error.message;
    if (error.msg) return error.msg;
    if (error.detail) {
      // Recursively format detail
      return formatError(error.detail);
    }
    // Fallback to JSON string
    return JSON.stringify(error);
  }

  // Fallback
  return String(error);
};

const stripMarkdown = (text: string): string => {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .trim();
};

// Language mapping cho Monaco Editor
const getMonacoLanguage = (languageName: string): string => {
  const mapping: Record<string, string> = {
    python: "python",
    javascript: "javascript",
    typescript: "typescript",
    java: "java",
    "c++": "cpp",
    c: "c",
    go: "go",
    rust: "rust",
    php: "php",
    ruby: "ruby",
    kotlin: "kotlin",
    bash: "shell",
    fortran: "fortran",
    d: "d",
  };
  return mapping[languageName.toLowerCase()] || "plaintext";
};

// Template generator cho các ngôn ngữ
const getLanguageTemplate = (languageName: string): string => {
  const templates: Record<string, string> = {
    python: `def main():
    # Viết code của bạn ở đây
    pass

if __name__ == "__main__":
    main()`,
    javascript: `function main() {
    // Viết code của bạn ở đây
}

main();`,
    typescript: `function main(): void {
    // Viết code của bạn ở đây
}

main();`,
    java: `public class Main {
    public static void main(String[] args) {
        // Viết code của bạn ở đây
    }
}`,
    "c++": `#include <iostream>
using namespace std;

int main() {
    // Viết code của bạn ở đây
    return 0;
}`,
    c: `#include <stdio.h>

int main() {
    // Viết code của bạn ở đây
    return 0;
}`,
    go: `package main

import "fmt"

func main() {
    // Viết code của bạn ở đây
}`,
    rust: `fn main() {
    // Viết code của bạn ở đây
}`,
    php: `<?php
// Viết code của bạn ở đây
?>`,
    ruby: `# Viết code của bạn ở đây`,
    kotlin: `fun main() {
    // Viết code của bạn ở đây
}`,
    bash: `#!/bin/bash
# Viết code của bạn ở đây`,
  };
  return templates[languageName.toLowerCase()] || "// Viết code của bạn ở đây";
};

// File extension mapping
const getFileExtension = (languageName: string): string => {
  const extensions: Record<string, string> = {
    python: "py",
    javascript: "js",
    typescript: "ts",
    java: "java",
    "c++": "cpp",
    c: "c",
    go: "go",
    rust: "rs",
    php: "php",
    ruby: "rb",
    kotlin: "kt",
    bash: "sh",
    fortran: "f90",
    d: "d",
  };
  return extensions[languageName.toLowerCase()] || "txt";
};

// ============================================
// MAIN COMPONENT
// ============================================

const EditCodeLesson = () => {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id as string;

  // ============================================
  // STATE
  // ============================================

  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>("");
  const [exercises, setExercises] = useState<CodeExercise[]>([]);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [lessonTitle, setLessonTitle] = useState("");
  const [codeLanguages, setCodeLanguages] = useState<CodeLanguage[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isTestingCode, setIsTestingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [generateMode, setGenerateMode] = useState<"add" | "replace">("add");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasChangedAfterTest = useRef(false);
  const lastCodeFilesStructure = useRef<string>("");

  const [errors, setErrors] = useState<Partial<Record<"title", string>>>({});

  const totalSteps = 2;

  // ============================================
  // DATA FETCHING
  // ============================================

  const { data: lessonDetail, mutate: mutateLessonDetail } =
    useSWR<LessonDetail>(
      lessonId ? `/lecturer/lessons/${lessonId}/detail` : null,
      async (url: string) => {
        const res = await api.get(url);
        return res.data;
      },
      { revalidateOnFocus: false }
    );

  const { data: codeExercisesData, mutate: mutateCodeExercises } = useSWR<
    CodeExerciseFromAPI[]
  >(
    lessonId ? `/lecturer/lessons/${lessonId}/code` : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return [];
        }
        throw error;
      }
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (error: any) => {
        return error?.response?.status !== 404;
      },
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

  // ============================================
  // FETCH VIDEO LESSONS
  // ============================================

  // Fetch video lessons from section
  const { data: videoLessonsData } = useSWR(
    lessonDetail?.section_id
      ? `/lecturer/lessons/${lessonDetail.section_id}`
      : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Filter only video lessons (exclude current lesson)
  const videoLessons =
    videoLessonsData?.filter(
      (lesson: any) => lesson.lesson_type === "video" && lesson.id !== lessonId
    ) || [];

  // ============================================
  // FETCH LANGUAGES
  // ============================================

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setIsLoadingLanguages(true);
        const response = await api.get<CodeLanguage[]>(
          "/lecturer/lessons/code_languages"
        );
        setCodeLanguages(response.data.filter((lang) => lang.is_active));
      } catch (error) {
        console.error("Lỗi khi tải danh sách ngôn ngữ:", error);
      } finally {
        setIsLoadingLanguages(false);
      }
    };

    fetchLanguages();
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const selectedLang = useMemo(() => {
    if (!selectedLanguageId) return undefined;
    return codeLanguages.find((lang) => lang.id === selectedLanguageId);
  }, [codeLanguages, selectedLanguageId]);

  const monacoLang = useMemo(() => {
    if (!selectedLang) return "plaintext";
    return getMonacoLanguage(selectedLang.name);
  }, [selectedLang]);

  const activeExercise = exercises[activeExerciseIndex];

  const activeFile = useMemo(() => {
    if (!activeExercise?.codeFiles || !activeExercise?.activeFileId)
      return undefined;
    return activeExercise.codeFiles.find(
      (f) => f.id === activeExercise.activeFileId
    );
  }, [
    activeExercise?.codeFiles?.map((f) => `${f.id}-${f.content}`).join(","),
    activeExercise?.activeFileId,
    activeExerciseIndex,
  ]);

  const activeStarterFile = useMemo(() => {
    if (
      !activeExercise?.starterCodeFiles ||
      !activeExercise?.activeStarterFileId
    )
      return undefined;
    return activeExercise.starterCodeFiles.find(
      (f) => f.id === activeExercise.activeStarterFileId
    );
  }, [activeExercise?.starterCodeFiles, activeExercise?.activeStarterFileId]);

  const progressPercentage = useMemo(
    () => ((currentStep + 1) / totalSteps) * 100,
    [currentStep, totalSteps]
  );

  // Kiểm tra thay đổi lesson (chỉ title)
  const hasLessonChanges = useMemo(() => {
    if (!lessonDetail) return false;

    const titleChanged =
      lessonTitle.trim() !== (lessonDetail.title || "").trim();

    return titleChanged;
  }, [lessonTitle, lessonDetail]);

  // Kiểm tra thay đổi code exercises
  const hasCodeExercisesChanges = useMemo(() => {
    if (!codeExercisesData || codeExercisesData.length === 0) {
      // Nếu không có data từ API nhưng có exercises trong form -> có thay đổi (tạo mới)
      return exercises.length > 0;
    }

    // Tạo map từ API exercises theo id
    const apiExercisesMap = new Map(codeExercisesData.map((ex) => [ex.id, ex]));

    // Kiểm tra số lượng exercises
    if (exercises.length !== codeExercisesData.length) {
      return true;
    }

    // So sánh từng exercise theo id (không phải index)
    for (const exercise of exercises) {
      const existingExercise = apiExercisesMap.get(exercise.id);

      // Nếu exercise không có trong API -> exercise mới được thêm
      if (!existingExercise) {
        return true;
      }

      // So sánh title
      if (exercise.title.trim() !== (existingExercise.title || "").trim()) {
        return true;
      }

      // So sánh description (strip HTML tags để so sánh)
      let exerciseDescription = exercise.description.trim();
      let apiDescription = (existingExercise.description || "").trim();

      // Strip HTML tags từ cả hai để so sánh
      exerciseDescription = exerciseDescription
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      apiDescription = apiDescription
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      if (exerciseDescription !== apiDescription) {
        return true;
      }

      // So sánh difficulty
      if (exercise.difficulty !== existingExercise.difficulty) {
        return true;
      }

      // So sánh language - so sánh language_id với language string từ API
      const exerciseLanguageId = selectedLanguageId || "";
      const apiLanguageName = existingExercise.language.toLowerCase();
      const exerciseLanguageName = selectedLang?.name?.toLowerCase() || "";

      // So sánh theo tên ngôn ngữ
      if (exerciseLanguageName !== apiLanguageName) {
        return true;
      }

      // So sánh solution files - so sánh theo id từ API
      if (
        exercise.codeFiles.length !== existingExercise.solution_files.length
      ) {
        return true;
      }

      // Tạo map để so sánh theo id
      const existingSolutionFilesMap = new Map(
        existingExercise.solution_files.map((f) => [f.id, f])
      );

      for (const file of exercise.codeFiles) {
        const existingFile = existingSolutionFilesMap.get(file.id);

        // Nếu file không có trong API, đây là file mới được thêm
        if (!existingFile) {
          return true;
        }

        // So sánh nội dung file
        if (
          file.filename !== existingFile.filename ||
          file.content !== existingFile.content ||
          file.is_main !== existingFile.is_main
        ) {
          return true;
        }
      }

      // Kiểm tra xem có file nào trong API bị xóa không
      const exerciseSolutionFilesIds = new Set(
        exercise.codeFiles.map((f) => f.id)
      );
      for (const existingFile of existingExercise.solution_files) {
        if (!exerciseSolutionFilesIds.has(existingFile.id)) {
          return true; // File đã bị xóa
        }
      }

      // So sánh starter files - so sánh theo id từ API
      if (
        exercise.starterCodeFiles.length !==
        existingExercise.starter_files.length
      ) {
        return true;
      }

      // Tạo map để so sánh theo id
      const existingStarterFilesMap = new Map(
        existingExercise.starter_files.map((f) => [f.id, f])
      );

      for (const file of exercise.starterCodeFiles) {
        const existingFile = existingStarterFilesMap.get(file.id);

        // Nếu file không có trong API, đây là file mới được thêm
        if (!existingFile) {
          return true;
        }

        // So sánh nội dung file
        if (
          file.filename !== existingFile.filename ||
          file.content !== existingFile.content ||
          file.is_main !== existingFile.is_main
        ) {
          return true;
        }
      }

      // Kiểm tra xem có file nào trong API bị xóa không
      const exerciseStarterFilesIds = new Set(
        exercise.starterCodeFiles.map((f) => f.id)
      );
      for (const existingFile of existingExercise.starter_files) {
        if (!exerciseStarterFilesIds.has(existingFile.id)) {
          return true; // File đã bị xóa
        }
      }

      // So sánh test cases - so sánh theo id từ API
      if (exercise.testCases.length !== existingExercise.testcases.length) {
        return true;
      }

      // Tạo map để so sánh theo id
      const existingTestCasesMap = new Map(
        existingExercise.testcases.map((t) => [t.id, t])
      );

      for (const testCase of exercise.testCases) {
        const existingTestCase = existingTestCasesMap.get(testCase.id);

        // Nếu test case không có trong API, đây là test case mới được thêm
        if (!existingTestCase) {
          return true;
        }

        // So sánh nội dung test case
        if (
          (testCase.input || "") !== (existingTestCase.input || "") ||
          testCase.expected_output !== existingTestCase.expected_output ||
          testCase.is_sample !== existingTestCase.is_sample
        ) {
          return true;
        }
      }

      // Kiểm tra xem có test case nào trong API bị xóa không
      const exerciseTestCasesIds = new Set(exercise.testCases.map((t) => t.id));
      for (const existingTestCase of existingExercise.testcases) {
        if (!exerciseTestCasesIds.has(existingTestCase.id)) {
          return true; // Test case đã bị xóa
        }
      }
    }

    // Kiểm tra xem có exercise nào trong API bị xóa không (có trong API nhưng không có trong form)
    const formExerciseIds = new Set(exercises.map((ex) => ex.id));
    for (const apiExercise of codeExercisesData) {
      if (!formExerciseIds.has(apiExercise.id)) {
        return true; // Exercise đã bị xóa
      }
    }

    return false;
  }, [exercises, codeExercisesData, selectedLang, selectedLanguageId]);

  // Tổng hợp thay đổi
  const hasChanges = hasLessonChanges || hasCodeExercisesChanges;

  // ============================================
  // HANDLERS - TEST CODE
  // ============================================

  const createSnapshot = useCallback(
    (ex: CodeExercise): string => {
      return JSON.stringify({
        languageId: selectedLanguageId,
        codeFiles: ex.codeFiles.map((f) => ({
          filename: f.filename,
          content: f.content,
          is_main: f.is_main,
        })),
        testCases: ex.testCases.map((t) => ({
          input: t.input,
          expected_output: t.expected_output,
          is_sample: t.is_sample,
        })),
      });
    },
    [selectedLanguageId]
  );

  // Kiểm tra xem có thể lưu không (phải test lại nếu solution code đã thay đổi)
  const canSave = useMemo(() => {
    // Nếu chỉ có thay đổi lesson title, không cần kiểm tra test
    if (hasLessonChanges && !hasCodeExercisesChanges) {
      return { canSave: true, reason: null };
    }

    // Kiểm tra tất cả exercises
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];

      // Kiểm tra exercise có solution code đã thay đổi không
      const apiExercise = codeExercisesData?.find(
        (apiEx) => apiEx.id === ex.id
      );

      if (apiExercise) {
        // Exercise đã tồn tại - kiểm tra solution code có thay đổi không
        const apiSolutionFilesMap = new Map(
          apiExercise.solution_files.map((f) => [f.id, f])
        );

        let solutionChanged = false;

        // Kiểm tra số lượng files
        if (ex.codeFiles.length !== apiExercise.solution_files.length) {
          solutionChanged = true;
        } else {
          // Kiểm tra nội dung từng file
          for (const file of ex.codeFiles) {
            const apiFile = apiSolutionFilesMap.get(file.id);
            if (!apiFile) {
              // File mới được thêm
              solutionChanged = true;
              break;
            }
            if (
              file.filename !== apiFile.filename ||
              file.content !== apiFile.content ||
              file.is_main !== apiFile.is_main
            ) {
              // File đã thay đổi
              solutionChanged = true;
              break;
            }
          }

          // Kiểm tra file bị xóa
          if (!solutionChanged) {
            const exerciseFileIds = new Set(ex.codeFiles.map((f) => f.id));
            for (const apiFile of apiExercise.solution_files) {
              if (!exerciseFileIds.has(apiFile.id)) {
                solutionChanged = true;
                break;
              }
            }
          }
        }

        // Nếu solution code đã thay đổi, phải test lại
        if (solutionChanged) {
          // Kiểm tra test đã pass chưa
          if (!ex.testResult || ex.testResult.status !== "passed") {
            return {
              canSave: false,
              reason: `Bài code ${
                i + 1
              }: Solution code đã thay đổi. Vui lòng test lại và đảm bảo tất cả test cases đều pass!`,
            };
          }

          // Kiểm tra snapshot có khớp không
          const currentSnapshot = createSnapshot(ex);
          if (currentSnapshot !== ex.lastTestedSnapshot) {
            return {
              canSave: false,
              reason: `Bài code ${
                i + 1
              }: Solution code đã thay đổi sau khi test. Vui lòng test lại!`,
            };
          }
        }
      } else {
        // Exercise mới - phải test và pass
        if (!ex.testResult || ex.testResult.status !== "passed") {
          return {
            canSave: false,
            reason: `Bài code ${
              i + 1
            }: Vui lòng test code và đảm bảo tất cả test cases đều pass!`,
          };
        }

        // Kiểm tra snapshot có khớp không
        const currentSnapshot = createSnapshot(ex);
        if (currentSnapshot !== ex.lastTestedSnapshot) {
          return {
            canSave: false,
            reason: `Bài code ${
              i + 1
            }: Code đã thay đổi sau khi test. Vui lòng test lại!`,
          };
        }
      }
    }

    return { canSave: true, reason: null };
  }, [
    exercises,
    codeExercisesData,
    createSnapshot,
    selectedLanguageId,
    hasLessonChanges,
    hasCodeExercisesChanges,
  ]);

  // ============================================
  // INITIALIZE FORM DATA
  // ============================================

  useEffect(() => {
    if (lessonDetail && !mounted) {
      setLessonTitle(lessonDetail.title || "");
      setMounted(true);
    }
  }, [lessonDetail, mounted]);

  // Load code exercises into form when codeExercisesData is loaded
  useEffect(() => {
    if (
      codeExercisesData &&
      codeExercisesData.length > 0 &&
      exercises.length === 0 &&
      codeLanguages.length > 0
    ) {
      const formattedExercises: CodeExercise[] = codeExercisesData.map(
        (ex, index) => {
          // Map language string sang language_id
          const languageId =
            codeLanguages.find(
              (lang) => lang.name.toLowerCase() === ex.language.toLowerCase()
            )?.id || "";

          // Format solution files - sử dụng id từ API
          const codeFiles: CodeFile[] = ex.solution_files.map((file) => ({
            id: file.id,
            filename: file.filename,
            content: file.content || "",
            is_main: file.is_main || false,
          }));

          // Format starter files - sử dụng id từ API
          const starterCodeFiles: CodeFile[] = ex.starter_files.map((file) => ({
            id: file.id,
            filename: file.filename,
            content: file.content || "",
            is_main: file.is_main || false,
          }));

          // Format test cases - sử dụng id từ API
          const testCases: TestCase[] = ex.testcases
            .sort((a, b) => a.order_index - b.order_index)
            .map((test) => ({
              id: test.id,
              input: test.input || "",
              expected_output: test.expected_output || "",
              is_sample: test.is_sample || false,
            }));

          return {
            id: ex.id,
            title: ex.title || "",
            difficulty: ex.difficulty || "medium",
            description: ex.description || "",
            codeFiles:
              codeFiles.length > 0
                ? codeFiles
                : [
                    {
                      id: `file-${ex.id}-0`,
                      filename: `main.${getFileExtension(ex.language)}`,
                      content: "",
                      is_main: true,
                    },
                  ],
            starterCodeFiles:
              starterCodeFiles.length > 0
                ? starterCodeFiles
                : [
                    {
                      id: `starter-${ex.id}-0`,
                      filename: `main.${getFileExtension(ex.language)}`,
                      content: "",
                      is_main: true,
                    },
                  ],
            testCases:
              testCases.length > 0
                ? testCases
                : [
                    {
                      id: `test-${ex.id}-0`,
                      input: "",
                      expected_output: "",
                      is_sample: false,
                    },
                  ],
            activeFileId: codeFiles[0]?.id || `file-${ex.id}-0`,
            activeStarterFileId:
              starterCodeFiles[0]?.id || `starter-${ex.id}-0`,
            renamingFileId: null,
            renameValue: "",
            testResult: null,
            lastTestedSnapshot: null,
          };
        }
      );

      setExercises(formattedExercises);

      // Set selected language từ exercise đầu tiên
      if (formattedExercises.length > 0 && codeExercisesData[0]) {
        const firstLanguage = codeExercisesData[0].language;
        const languageId = codeLanguages.find(
          (lang) => lang.name.toLowerCase() === firstLanguage.toLowerCase()
        )?.id;
        if (languageId) {
          setSelectedLanguageId(languageId);
        }
      }

      setIsLoading(false);
    } else if (
      codeExercisesData &&
      codeExercisesData.length === 0 &&
      exercises.length === 0
    ) {
      // Nếu không có exercises, tạo một exercise mặc định
      const defaultLanguageId = codeLanguages[0]?.id || "";
      const defaultLanguage = codeLanguages[0]?.name || "python";
      const extension = getFileExtension(defaultLanguage);

      setExercises([
        {
          id: `exercise-${Date.now()}`,
          title: "",
          difficulty: "medium",
          description: "",
          codeFiles: [
            {
              id: `file-${Date.now()}-0`,
              filename: `main.${extension}`,
              content: "",
              is_main: true,
            },
          ],
          starterCodeFiles: [
            {
              id: `starter-${Date.now()}-0`,
              filename: `main.${extension}`,
              content: "",
              is_main: true,
            },
          ],
          testCases: [
            {
              id: `test-${Date.now()}-0`,
              input: "",
              expected_output: "",
              is_sample: false,
            },
          ],
          activeFileId: `file-${Date.now()}-0`,
          activeStarterFileId: `starter-${Date.now()}-0`,
          renamingFileId: null,
          renameValue: "",
          testResult: null,
          lastTestedSnapshot: null,
        },
      ]);

      if (defaultLanguageId) {
        setSelectedLanguageId(defaultLanguageId);
      }

      setIsLoading(false);
    }
  }, [codeExercisesData, codeLanguages, exercises.length, mounted]);

  // ============================================
  // HANDLERS - EXERCISE
  // ============================================

  const handleExerciseChange = useCallback(
    (exerciseIndex: number, updater: (ex: CodeExercise) => CodeExercise) => {
      setExercises((prev) =>
        prev.map((ex, idx) => (idx === exerciseIndex ? updater(ex) : ex))
      );
    },
    []
  );

  const addExercise = useCallback(() => {
    const newId = `exercise-${Date.now()}-${Math.random()}`;
    const fileId = `file-${newId}`;
    const starterId = `starter-${newId}`;
    const testId = `test-${newId}`;
    let extension = "py";
    if (selectedLanguageId && codeLanguages.length > 0) {
      const selectedLang = codeLanguages.find(
        (l) => l.id === selectedLanguageId
      );
      if (selectedLang) {
        extension = getFileExtension(selectedLang.name);
      }
    }

    const newExercise: CodeExercise = {
      id: newId,
      title: "",
      difficulty: "medium",
      description: "",
      codeFiles: [
        {
          id: fileId,
          filename: `main.${extension}`,
          content: "",
          is_main: true,
        },
      ],
      starterCodeFiles: [
        {
          id: starterId,
          filename: `main.${extension}`,
          content: "",
          is_main: true,
        },
      ],
      testCases: [
        {
          id: testId,
          input: "",
          expected_output: "",
          is_sample: false,
        },
      ],
      activeFileId: fileId,
      activeStarterFileId: starterId,
      renamingFileId: null,
      renameValue: "",
      testResult: null,
      lastTestedSnapshot: null,
    };
    setExercises((prev) => {
      const newExercises = [...prev, newExercise];
      setActiveExerciseIndex(newExercises.length - 1);
      return newExercises;
    });
  }, [selectedLanguageId, codeLanguages]);

  const removeExercise = useCallback(
    (exerciseIndex: number) => {
      if (exercises.length <= 1) {
        showToast.error("Phải có ít nhất một bài code!");
        return;
      }
      setExercises((prev) => prev.filter((_, idx) => idx !== exerciseIndex));
      if (activeExerciseIndex >= exercises.length - 1) {
        setActiveExerciseIndex(Math.max(0, exercises.length - 2));
      }
    },
    [exercises.length, activeExerciseIndex]
  );

  // ============================================
  // HANDLERS - LANGUAGE
  // ============================================

  const handleLanguageChange = useCallback(
    (languageId: string) => {
      const newLang = codeLanguages.find((lang) => lang.id === languageId);
      if (!newLang) return;

      setSelectedLanguageId(languageId);

      // Cập nhật tất cả exercises với ngôn ngữ mới
      setExercises((prev) =>
        prev.map((ex) => {
          const newExtension = getFileExtension(newLang.name);
          const mainFileExtension = getFileExtension(newLang.name);

          const updatedCodeFiles = ex.codeFiles.map((file) => {
            const nameWithoutExt = file.filename.replace(/\.[^/.]+$/, "");
            const newFilename =
              file.is_main && nameWithoutExt === "main"
                ? `main.${mainFileExtension}`
                : `${nameWithoutExt}.${newExtension}`;

            const newContent =
              file.is_main && !file.content.trim()
                ? getLanguageTemplate(newLang.name)
                : file.content;

            return {
              ...file,
              filename: newFilename,
              content: newContent,
            };
          });

          const updatedStarterFiles = ex.starterCodeFiles.map((file) => {
            const nameWithoutExt = file.filename.replace(/\.[^/.]+$/, "");
            const newFilename =
              file.is_main && nameWithoutExt === "main"
                ? `main.${mainFileExtension}`
                : `${nameWithoutExt}.${newExtension}`;

            return {
              ...file,
              filename: newFilename,
            };
          });

          return {
            ...ex,
            codeFiles: updatedCodeFiles,
            starterCodeFiles: updatedStarterFiles,
            testResult: null,
            lastTestedSnapshot: null,
          };
        })
      );
      hasChangedAfterTest.current = false;
    },
    [codeLanguages]
  );

  // ============================================
  // HANDLERS - CODE FILES
  // ============================================

  const addCodeFile = useCallback(() => {
    if (!activeExercise) return;
    handleExerciseChange(activeExerciseIndex, (ex) => {
      const newFile: CodeFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        filename: `file${ex.codeFiles.length + 1}.${getFileExtension(
          selectedLang?.name || "txt"
        )}`,
        content: "",
        is_main: ex.codeFiles.length === 0,
      };
      return {
        ...ex,
        codeFiles: [...ex.codeFiles, newFile],
        activeFileId: newFile.id,
      };
    });
    hasChangedAfterTest.current = true;
  }, [handleExerciseChange, selectedLang, activeExercise, activeExerciseIndex]);

  const removeCodeFile = useCallback(
    (fileId: string) => {
      if (!activeExercise) return;
      handleExerciseChange(activeExerciseIndex, (ex) => {
        if (ex.codeFiles.length <= 1) return ex;

        const newFiles = ex.codeFiles.filter((f) => f.id !== fileId);
        const removedFile = ex.codeFiles.find((f) => f.id === fileId);

        if (removedFile?.is_main && newFiles.length > 0) {
          newFiles[0].is_main = true;
        }

        let activeId = ex.activeFileId;
        if (activeId === fileId && newFiles.length > 0) {
          activeId = newFiles[0].id;
        }

        return {
          ...ex,
          codeFiles: newFiles,
          activeFileId: activeId,
        };
      });
      hasChangedAfterTest.current = true;
    },
    [handleExerciseChange, activeExercise, activeExerciseIndex]
  );

  const updateCodeFile = useCallback(
    (fileId: string, field: "content" | "filename", value: string) => {
      if (!activeExercise) return;
      handleExerciseChange(activeExerciseIndex, (ex) => ({
        ...ex,
        codeFiles: ex.codeFiles.map((f) =>
          f.id === fileId ? { ...f, [field]: value } : f
        ),
      }));
      hasChangedAfterTest.current = true;
    },
    [activeExercise, activeExerciseIndex, handleExerciseChange]
  );

  const setMainFile = useCallback(
    (fileId: string) => {
      if (!activeExercise) return;
      handleExerciseChange(activeExerciseIndex, (ex) => ({
        ...ex,
        codeFiles: ex.codeFiles.map((f) => ({
          ...f,
          is_main: f.id === fileId,
        })),
      }));
      hasChangedAfterTest.current = true;
    },
    [handleExerciseChange, activeExercise, activeExerciseIndex]
  );

  const startRenamingFile = useCallback(
    (fileId: string) => {
      if (!activeExercise) return;
      const file = activeExercise.codeFiles.find((f) => f.id === fileId);
      handleExerciseChange(activeExerciseIndex, (ex) => ({
        ...ex,
        renamingFileId: fileId,
        renameValue: file?.filename || "",
      }));
    },
    [activeExercise, activeExerciseIndex, handleExerciseChange]
  );

  const finishRenamingFile = useCallback(() => {
    if (!activeExercise) return;
    handleExerciseChange(activeExerciseIndex, (ex) => {
      if (!ex.renamingFileId || !ex.renameValue.trim()) return ex;

      const newFilename = ex.renameValue.trim();
      const filenameExists = ex.codeFiles.some(
        (f) => f.filename === newFilename && f.id !== ex.renamingFileId
      );

      if (filenameExists) {
        showToast.error("Tên file đã tồn tại!");
        return {
          ...ex,
          renamingFileId: null,
          renameValue: "",
        };
      }

      return {
        ...ex,
        codeFiles: ex.codeFiles.map((f) =>
          f.id === ex.renamingFileId ? { ...f, filename: newFilename } : f
        ),
        renamingFileId: null,
        renameValue: "",
      };
    });
    hasChangedAfterTest.current = true;
  }, [handleExerciseChange, activeExercise, activeExerciseIndex]);

  const cancelRenamingFile = useCallback(() => {
    if (!activeExercise) return;
    handleExerciseChange(activeExerciseIndex, (ex) => ({
      ...ex,
      renamingFileId: null,
      renameValue: "",
    }));
  }, [handleExerciseChange, activeExercise, activeExerciseIndex]);

  // ============================================
  // HANDLERS - STARTER CODE FILES
  // ============================================

  const syncStarterCodeFiles = useCallback(() => {
    if (!activeExercise) return;
    handleExerciseChange(activeExerciseIndex, (ex) => {
      const newStarterFiles: CodeFile[] = ex.codeFiles.map((file) => {
        const existingStarter = ex.starterCodeFiles.find(
          (sf) => sf.filename === file.filename
        );
        return {
          id: existingStarter?.id || `starter-${file.id}`,
          filename: file.filename,
          content: existingStarter?.content || "",
          is_main: file.is_main,
        };
      });

      const validFilenames = new Set(ex.codeFiles.map((f) => f.filename));
      const filteredStarterFiles = newStarterFiles.filter((sf) =>
        validFilenames.has(sf.filename)
      );

      let activeStarterId = ex.activeStarterFileId;
      if (
        !filteredStarterFiles.find((f) => f.id === activeStarterId) &&
        filteredStarterFiles.length > 0
      ) {
        activeStarterId = filteredStarterFiles[0].id;
      }

      return {
        ...ex,
        starterCodeFiles: filteredStarterFiles,
        activeStarterFileId: activeStarterId,
      };
    });
  }, [handleExerciseChange, activeExercise, activeExerciseIndex]);

  // Đồng bộ khi code files thay đổi (chỉ khi structure thay đổi, không phải content)
  useEffect(() => {
    if (!activeExercise?.codeFiles || !activeExercise) return;

    // Chỉ sync khi structure của codeFiles thay đổi (filename hoặc is_main)
    // Không sync khi chỉ content thay đổi
    const codeFilesStructure = activeExercise.codeFiles
      .map((f) => `${f.filename}-${f.is_main}`)
      .sort()
      .join(",");

    // Chỉ sync nếu structure thay đổi so với lần trước
    if (codeFilesStructure !== lastCodeFilesStructure.current) {
      lastCodeFilesStructure.current = codeFilesStructure;

      const starterFilesStructure = activeExercise.starterCodeFiles
        .map((f) => `${f.filename}-${f.is_main}`)
        .sort()
        .join(",");

      // Chỉ sync nếu structure khác nhau
      if (codeFilesStructure !== starterFilesStructure) {
        syncStarterCodeFiles();
      }
    }
  }, [
    activeExercise?.codeFiles
      ?.map((f) => `${f.filename}-${f.is_main}`)
      .sort()
      .join(","),
    activeExerciseIndex,
  ]);

  const updateStarterCodeFile = useCallback(
    (fileId: string, field: "content", value: string) => {
      if (!activeExercise) return;
      handleExerciseChange(activeExerciseIndex, (ex) => ({
        ...ex,
        starterCodeFiles: ex.starterCodeFiles.map((f) =>
          f.id === fileId ? { ...f, [field]: value } : f
        ),
      }));
      hasChangedAfterTest.current = true;
    },
    [handleExerciseChange, activeExercise, activeExerciseIndex]
  );

  // ============================================
  // HANDLERS - TEST CASES
  // ============================================

  const addTestCase = useCallback(() => {
    setExercises((prev) => {
      if (prev.length === 0 || activeExerciseIndex >= prev.length) return prev;
      const currentEx = prev[activeExerciseIndex];
      if (!currentEx) return prev;

      return prev.map((ex, idx) => {
        if (idx !== activeExerciseIndex) return ex;
        return {
          ...ex,
          testCases: [
            ...ex.testCases,
            {
              id: `test-${Date.now()}-${Math.random()}`,
              input: "",
              expected_output: "",
              is_sample: false,
            },
          ],
        };
      });
    });
    hasChangedAfterTest.current = true;
  }, [activeExerciseIndex]);

  const removeTestCase = useCallback(
    (testId: string) => {
      if (!activeExercise) return;
      handleExerciseChange(activeExerciseIndex, (ex) => {
        if (ex.testCases.length <= 1) return ex;
        return {
          ...ex,
          testCases: ex.testCases.filter((t) => t.id !== testId),
        };
      });
      hasChangedAfterTest.current = true;
    },
    [handleExerciseChange, activeExercise, activeExerciseIndex]
  );

  const updateTestCase = useCallback(
    (
      testId: string,
      field: "input" | "expected_output" | "is_sample",
      value: string | boolean
    ) => {
      if (!activeExercise) return;
      handleExerciseChange(activeExerciseIndex, (ex) => ({
        ...ex,
        testCases: ex.testCases.map((t) =>
          t.id === testId ? { ...t, [field]: value } : t
        ),
      }));
      hasChangedAfterTest.current = true;
    },
    [activeExercise, activeExerciseIndex, handleExerciseChange]
  );

  // ============================================
  // HANDLERS - TEMPLATES
  // ============================================

  const handleInsertTemplate = useCallback(() => {
    if (!selectedLang || !activeFile || !activeExercise) return;
    const template = getLanguageTemplate(selectedLang.name);
    updateCodeFile(activeExercise.activeFileId, "content", template);
  }, [selectedLang, activeFile, activeExercise, updateCodeFile]);

  const handleInsertStarterTemplate = useCallback(() => {
    if (!selectedLang || !activeStarterFile || !activeExercise) return;
    const template = getLanguageTemplate(selectedLang.name);
    updateStarterCodeFile(
      activeExercise.activeStarterFileId,
      "content",
      template
    );
  }, [selectedLang, activeStarterFile, activeExercise, updateStarterCodeFile]);

  // ============================================
  // HANDLERS - GENERATE CODE FROM VIDEOS
  // ============================================

  const handleToggleLesson = (lessonId: string) => {
    setSelectedLessonIds((prev) =>
      prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const handleGenerateCodeFromVideos = useCallback(async () => {
    if (selectedLessonIds.length === 0) {
      setError("Vui lòng chọn ít nhất một bài học video");
      return;
    }

    setIsGeneratingCode(true);
    setError(null);

    try {
      const response = await api.post("/lecturers/chat/lesson/code", {
        lesson_ids: selectedLessonIds,
      });

      // API trả về CodeExercise[] trực tiếp
      const generatedExercises = Array.isArray(response.data)
        ? response.data
        : [];

      if (generatedExercises.length > 0) {
        // Map API response to CodeExercise format
        const formattedExercises: CodeExercise[] = generatedExercises.map(
          (ex: any, index: number) => {
            // Generate unique IDs
            const exerciseId = `exercise-${Date.now()}-${index}-${Math.random()}`;

            // Map solution_files to codeFiles
            const codeFiles: CodeFile[] = (ex.solution_files || []).map(
              (file: any, fileIndex: number) => ({
                id: `file-${exerciseId}-${fileIndex}`,
                filename: file.filename || "main.py",
                content: file.content || "",
                is_main: file.is_main || fileIndex === 0,
              })
            );

            // Map starter_files to starterCodeFiles
            const starterCodeFiles: CodeFile[] = (ex.starter_files || []).map(
              (file: any, fileIndex: number) => ({
                id: `starter-${exerciseId}-${fileIndex}`,
                filename: file.filename || "main.py",
                content: file.content || "",
                is_main: file.is_main || fileIndex === 0,
              })
            );

            // Map testcases
            const testCases = (ex.testcases || []).map(
              (test: any, testIndex: number) => ({
                id: `test-${exerciseId}-${testIndex}`,
                input: test.input || "",
                expected_output: test.expected_output || "",
                is_sample: test.is_sample || false,
              })
            );

            // Set active file IDs
            const activeFileId =
              codeFiles.find((f) => f.is_main)?.id || codeFiles[0]?.id;
            const activeStarterFileId =
              starterCodeFiles.find((f) => f.is_main)?.id ||
              starterCodeFiles[0]?.id;

            return {
              id: exerciseId,
              title: ex.title || "",
              difficulty: ex.difficulty || "medium",
              description: ex.description || "",
              codeFiles:
                codeFiles.length > 0
                  ? codeFiles
                  : [
                      {
                        id: `file-${exerciseId}-0`,
                        filename: "main.py",
                        content: "",
                        is_main: true,
                      },
                    ],
              starterCodeFiles:
                starterCodeFiles.length > 0
                  ? starterCodeFiles
                  : [
                      {
                        id: `starter-${exerciseId}-0`,
                        filename: "main.py",
                        content: "",
                        is_main: true,
                      },
                    ],
              testCases:
                testCases.length > 0
                  ? testCases
                  : [
                      {
                        id: `test-${exerciseId}-0`,
                        input: "",
                        expected_output: "",
                        is_sample: false,
                      },
                    ],
              activeFileId: activeFileId || `file-${exerciseId}-0`,
              activeStarterFileId:
                activeStarterFileId || `starter-${exerciseId}-0`,
              renamingFileId: null,
              renameValue: "",
              testResult: null,
              lastTestedSnapshot: null,
            };
          }
        );

        // Xử lý theo mode
        if (generateMode === "replace") {
          // Làm lại từ đầu: thay thế tất cả exercises
          setExercises(formattedExercises);
          setActiveExerciseIndex(0);
        } else {
          // Thêm vào: thêm vào cuối danh sách
          setExercises((prev) => [...prev, ...formattedExercises]);
          setActiveExerciseIndex(exercises.length); // Set active to first new exercise
        }

        // Set language ID từ exercise đầu tiên (nếu có)
        if (
          formattedExercises.length > 0 &&
          generatedExercises[0]?.language_id
        ) {
          setSelectedLanguageId(generatedExercises[0].language_id);
        }

        setSuccessMessage(
          `✅ Đã ${generateMode === "replace" ? "tạo mới" : "thêm"} ${
            formattedExercises.length
          } bài code tự động từ ${selectedLessonIds.length} bài học video!`
        );
        // Clear selection after success
        setSelectedLessonIds([]);
      } else {
        setError("Không thể tạo code exercises tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        formatError(
          error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message
        ) || "Không thể tạo code exercises tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingCode(false);
    }
  }, [selectedLessonIds, generateMode, exercises.length]);

  const handleTestCode = useCallback(async () => {
    if (!activeExercise || !selectedLanguageId || !activeFile) {
      showToast.error("Vui lòng chọn ngôn ngữ và có ít nhất một file code!");
      return;
    }

    if (activeExercise.testCases.length === 0) {
      showToast.error("Vui lòng thêm ít nhất một test case!");
      return;
    }

    const invalidTest = activeExercise.testCases.find(
      (t) => !t.expected_output || !String(t.expected_output).trim()
    );
    if (invalidTest) {
      showToast.error("Vui lòng điền Expected Output cho tất cả test cases!");
      return;
    }

    try {
      setIsTestingCode(true);

      const currentExercise = exercises[activeExerciseIndex];
      if (!currentExercise) {
        showToast.error("Không tìm thấy bài code hiện tại!");
        return;
      }

      const payload = {
        language_id: selectedLanguageId,
        title: "Test",
        description: currentExercise.description || "",
        difficulty: currentExercise.difficulty,
        time_limit: 2,
        memory_limit: 256000000,
        files: currentExercise.codeFiles.map((f) => ({
          filename: f.filename,
          content: f.content || "",
          is_main: f.is_main,
        })),
        testcases: currentExercise.testCases.map((t, index) => ({
          input: t.input || "",
          expected_output: t.expected_output || "",
          is_sample: t.is_sample || false,
          order_index: index,
        })),
      };

      const response = await api.post<TestResult>(
        "/lecturer/lessons/code/run_test",
        payload
      );

      let maxCpuTime = 0;
      let maxMemory = 0;

      if (response.data.details && response.data.details.length > 0) {
        maxCpuTime = Math.max(
          ...response.data.details.map((d) => d.cpu_time || 0)
        );
        maxMemory = Math.max(
          ...response.data.details.map((d) => d.memory || 0)
        );
      }

      // time_limit: lấy max giữa maxCpuTime và 500ms
      // cpu_time là milliseconds, time_limit cũng là milliseconds
      const timeLimit = Math.max(maxCpuTime, 500); // Tối thiểu 500ms
      const memoryLimit =
        maxMemory > 0
          ? (Math.ceil(maxMemory / (1024 * 1024)) + 1) * (1024 * 1024)
          : 256000000;

      const testResultWithLimits: TestResult = {
        ...response.data,
        time_limit: timeLimit,
        memory_limit: memoryLimit,
      };

      const snapshot = createSnapshot(currentExercise);

      handleExerciseChange(activeExerciseIndex, (ex) => {
        const newStarterFiles: CodeFile[] = ex.codeFiles.map((file) => {
          const existingStarter = ex.starterCodeFiles.find(
            (sf) => sf.filename === file.filename
          );
          return {
            id: existingStarter?.id || `starter-${file.id}`,
            filename: file.filename,
            content: existingStarter?.content?.trim()
              ? existingStarter.content
              : file.content || "",
            is_main: file.is_main,
          };
        });

        let activeStarterId = ex.activeStarterFileId;
        if (
          !newStarterFiles.find((f) => f.id === activeStarterId) &&
          newStarterFiles.length > 0
        ) {
          activeStarterId = newStarterFiles[0].id;
        }

        return {
          ...ex,
          testResult: testResultWithLimits,
          lastTestedSnapshot: snapshot,
          starterCodeFiles: newStarterFiles,
          activeStarterFileId: activeStarterId,
        };
      });

      hasChangedAfterTest.current = false;
    } catch (error: any) {
      console.error("Lỗi khi test code:", error);
      showToast.error(
        error.response?.data?.detail ||
          "Có lỗi xảy ra khi test code. Vui lòng thử lại!"
      );
    } finally {
      setIsTestingCode(false);
    }
  }, [
    activeExercise,
    activeExerciseIndex,
    exercises,
    selectedLanguageId,
    activeFile,
    handleExerciseChange,
    createSnapshot,
  ]);

  // ============================================
  // HANDLERS - AI GENERATION
  // ============================================

  const handleGenerateTitle = useCallback(async () => {
    if (!lessonTitle.trim()) {
      setError("Vui lòng nhập tiêu đề bài học trước");
      return;
    }

    setIsGeneratingTitle(true);
    setError(null);

    try {
      const response = await api.post(
        "/lecturers/chat/lesson/rewrite_the_title",
        { title: lessonTitle.trim() }
      );

      const generatedTitle = response.data;
      if (generatedTitle && typeof generatedTitle === "string") {
        setLessonTitle(generatedTitle);
      } else {
        setError("Không thể tạo tiêu đề tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        formatError(
          error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message
        ) || "Không thể tạo tiêu đề tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingTitle(false);
    }
  }, [lessonTitle]);

  // ============================================
  // VALIDATION
  // ============================================

  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: Partial<Record<"title", string>> = {};

      switch (step) {
        case 0:
          if (!lessonTitle.trim()) {
            newErrors.title = "Vui lòng nhập tiêu đề bài học";
          }
          break;
        case 1:
          // Validate exercises
          for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];

            if (!ex.title.trim()) {
              setError(`Bài code ${i + 1}: Vui lòng nhập tiêu đề!`);
              return false;
            }

            if (ex.codeFiles.length === 0) {
              setError(
                `Bài code ${i + 1}: Vui lòng thêm ít nhất một file code!`
              );
              return false;
            }

            if (ex.testCases.length === 0) {
              setError(
                `Bài code ${i + 1}: Vui lòng thêm ít nhất một test case!`
              );
              return false;
            }

            const invalidTest = ex.testCases.find(
              (t) => !t.expected_output || !String(t.expected_output).trim()
            );
            if (invalidTest) {
              setError(
                `Bài code ${
                  i + 1
                }: Vui lòng điền Expected Output cho tất cả test cases!`
              );
              return false;
            }
          }
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [lessonTitle, exercises]
  );

  // ============================================
  // HANDLERS - SUBMIT
  // ============================================

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep) || !lessonId) {
      if (!lessonId) {
        setError("Thiếu thông tin lesson ID");
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const messages: string[] = [];

      // Cập nhật lesson info (chỉ khi có thay đổi)
      if (hasLessonChanges) {
        await api.put(`/lecturer/lessons/${lessonId}`, {
          title: lessonTitle.trim(),
        });
        messages.push("✅ Cập nhật thông tin bài học thành công!");
        await mutateLessonDetail();
      }

      // Cập nhật code exercises (chỉ khi có thay đổi)
      if (hasCodeExercisesChanges) {
        // Validate exercises trước khi lưu
        for (let i = 0; i < exercises.length; i++) {
          const ex = exercises[i];
          const apiExercise = codeExercisesData?.find(
            (apiEx) => apiEx.id === ex.id
          );

          if (apiExercise) {
            // Exercise đã tồn tại - kiểm tra solution code có thay đổi không
            const apiSolutionFilesMap = new Map(
              apiExercise.solution_files.map((f) => [f.id, f])
            );

            let solutionChanged = false;

            if (ex.codeFiles.length !== apiExercise.solution_files.length) {
              solutionChanged = true;
            } else {
              for (const file of ex.codeFiles) {
                const apiFile = apiSolutionFilesMap.get(file.id);
                if (!apiFile) {
                  solutionChanged = true;
                  break;
                }
                if (
                  file.filename !== apiFile.filename ||
                  file.content !== apiFile.content ||
                  file.is_main !== apiFile.is_main
                ) {
                  solutionChanged = true;
                  break;
                }
              }

              if (!solutionChanged) {
                const exerciseFileIds = new Set(ex.codeFiles.map((f) => f.id));
                for (const apiFile of apiExercise.solution_files) {
                  if (!exerciseFileIds.has(apiFile.id)) {
                    solutionChanged = true;
                    break;
                  }
                }
              }
            }

            // Nếu solution code đã thay đổi, phải test lại
            if (solutionChanged) {
              if (!ex.testResult || ex.testResult.status !== "passed") {
                setError(
                  `Bài code ${
                    i + 1
                  }: Solution code đã thay đổi. Vui lòng test lại và đảm bảo tất cả test cases đều pass!`
                );
                setIsSubmitting(false);
                return;
              }

              const currentSnapshot = createSnapshot(ex);
              if (currentSnapshot !== ex.lastTestedSnapshot) {
                setError(
                  `Bài code ${
                    i + 1
                  }: Solution code đã thay đổi sau khi test. Vui lòng test lại!`
                );
                setIsSubmitting(false);
                return;
              }
            }
          } else {
            // Exercise mới - phải test và pass
            if (!ex.testResult || ex.testResult.status !== "passed") {
              setError(
                `Bài code ${
                  i + 1
                }: Vui lòng test code và đảm bảo tất cả test cases đều pass!`
              );
              setIsSubmitting(false);
              return;
            }

            const currentSnapshot = createSnapshot(ex);
            if (currentSnapshot !== ex.lastTestedSnapshot) {
              setError(
                `Bài code ${
                  i + 1
                }: Code đã thay đổi sau khi test. Vui lòng test lại!`
              );
              setIsSubmitting(false);
              return;
            }
          }
        }

        // Tạo map từ API exercises để so sánh
        const apiExercisesMap = new Map<string, CodeExerciseFromAPI>();
        if (codeExercisesData) {
          codeExercisesData.forEach((ex) => {
            apiExercisesMap.set(ex.id, ex);
          });
        }

        // Tạo map từ API files (starter + solution) để so sánh
        const createApiFilesMap = (exercise: CodeExerciseFromAPI) => {
          const filesMap = new Map<
            string,
            {
              id: string;
              filename: string;
              content: string;
              is_main: boolean;
              role: string;
            }
          >();
          exercise.starter_files.forEach((f) => {
            filesMap.set(f.id, f);
          });
          exercise.solution_files.forEach((f) => {
            filesMap.set(f.id, f);
          });
          return filesMap;
        };

        // Tạo map từ API testcases để so sánh
        const createApiTestcasesMap = (exercise: CodeExerciseFromAPI) => {
          const testcasesMap = new Map<
            string,
            {
              id: string;
              input: string | null;
              expected_output: string;
              is_sample: boolean;
              order_index: number;
            }
          >();
          exercise.testcases.forEach((t) => {
            testcasesMap.set(t.id, t);
          });
          return testcasesMap;
        };

        // Tạo set các exercise IDs từ form để xác định exercises bị xóa
        const formExerciseIds = new Set(exercises.map((ex) => ex.id));

        // Xử lý exercises bị xóa (có trong API nhưng không có trong form)
        const deletedExercises: any[] = [];
        if (codeExercisesData) {
          codeExercisesData.forEach((apiEx) => {
            if (!formExerciseIds.has(apiEx.id)) {
              // Exercise bị xóa - đánh dấu tất cả files và testcases là delete
              const deletedFiles: Array<{
                id: string | null;
                filename: string | null;
                content: string | null;
                role: "starter" | "solution";
                is_main: boolean;
                type: "delete";
              }> = [];

              // Thêm tất cả files từ API với type: "delete"
              apiEx.starter_files.forEach((file) => {
                deletedFiles.push({
                  id: file.id || null,
                  filename: file.filename || null,
                  content: file.content || null,
                  role: "starter",
                  is_main: file.is_main || false,
                  type: "delete",
                });
              });
              apiEx.solution_files.forEach((file) => {
                deletedFiles.push({
                  id: file.id || null,
                  filename: file.filename || null,
                  content: file.content || null,
                  role: "solution",
                  is_main: file.is_main || false,
                  type: "delete",
                });
              });

              // Thêm tất cả testcases từ API với type: "delete"
              const deletedTestcases: Array<{
                id: string | null;
                input: string | null;
                expected_output: string | null;
                is_sample: boolean;
                order_index: number | null;
                type: "delete";
              }> = [];
              apiEx.testcases.forEach((testcase) => {
                deletedTestcases.push({
                  id: testcase.id || null,
                  input: testcase.input || null,
                  expected_output: testcase.expected_output || null,
                  is_sample: testcase.is_sample || false,
                  order_index: testcase.order_index || null,
                  type: "delete",
                });
              });

              deletedExercises.push({
                lesson_code_id: apiEx.id,
                type: "delete",
                title: null,
                description: null,
                difficulty: null,
                language_id: null,
                time_limit: null,
                memory_limit: null,
                files: deletedFiles,
                testcases: deletedTestcases,
              });
            }
          });
        }

        // Build payload cho exercises còn lại (create/update)
        const payload = exercises.map((ex) => {
          // Xác định type của exercise
          const apiExercise = apiExercisesMap.get(ex.id);
          const exerciseType = apiExercise ? "update" : "create";

          // Clean description
          let descriptionText = ex.description.trim();
          if (descriptionText) {
            descriptionText = descriptionText
              .replace(/<[^>]*>/g, "")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .trim();
          }

          // Xử lý files
          const files: Array<{
            id?: string | null;
            filename?: string | null;
            content?: string | null;
            role?: "starter" | "solution";
            is_main?: boolean;
            type: "update" | "create" | "delete";
          }> = [];

          if (apiExercise) {
            const apiFilesMap = createApiFilesMap(apiExercise);
            const formFilesMap = new Map<string, CodeFile>();

            // Thêm solution files từ form
            ex.codeFiles.forEach((f) => {
              formFilesMap.set(f.id, f);
              const apiFile = apiFilesMap.get(f.id);
              if (apiFile) {
                // File có trong API -> update
                files.push({
                  id: f.id,
                  filename: f.filename.trim(),
                  content: f.content || "",
                  role: "solution",
                  is_main: f.is_main || false,
                  type: "update",
                });
              } else {
                // File không có trong API -> create
                files.push({
                  filename: f.filename.trim(),
                  content: f.content || "",
                  role: "solution",
                  is_main: f.is_main || false,
                  type: "create",
                });
              }
            });

            // Thêm starter files từ form
            ex.starterCodeFiles.forEach((f) => {
              formFilesMap.set(f.id, f);
              const apiFile = apiFilesMap.get(f.id);
              if (apiFile) {
                // File có trong API -> update
                files.push({
                  id: f.id,
                  filename: f.filename.trim(),
                  content: f.content || "",
                  role: "starter",
                  is_main: f.is_main || false,
                  type: "update",
                });
              } else {
                // File không có trong API -> create
                files.push({
                  filename: f.filename.trim(),
                  content: f.content || "",
                  role: "starter",
                  is_main: f.is_main || false,
                  type: "create",
                });
              }
            });

            // Files có trong API nhưng không có trong form -> delete
            apiFilesMap.forEach((apiFile, fileId) => {
              if (!formFilesMap.has(fileId)) {
                files.push({
                  id: fileId,
                  filename: apiFile.filename || null,
                  content: apiFile.content || null,
                  role: (apiFile.role as "starter" | "solution") || "starter",
                  is_main: apiFile.is_main || false,
                  type: "delete",
                });
              }
            });
          } else {
            // Exercise mới -> tất cả files là create
            ex.codeFiles.forEach((f) => {
              files.push({
                filename: f.filename.trim(),
                content: f.content || "",
                role: "solution",
                is_main: f.is_main || false,
                type: "create",
              });
            });
            ex.starterCodeFiles.forEach((f) => {
              files.push({
                filename: f.filename.trim(),
                content: f.content || "",
                role: "starter",
                is_main: f.is_main || false,
                type: "create",
              });
            });
          }

          // Xử lý testcases
          const testcases: Array<{
            id?: string | null;
            input?: string | null;
            expected_output?: string | null;
            is_sample?: boolean;
            order_index?: number | null;
            type: "update" | "create" | "delete";
          }> = [];

          if (apiExercise) {
            const apiTestcasesMap = createApiTestcasesMap(apiExercise);
            const formTestcasesMap = new Map<string, TestCase>();

            // Thêm testcases từ form
            ex.testCases.forEach((t, index) => {
              formTestcasesMap.set(t.id, t);
              const apiTestCase = apiTestcasesMap.get(t.id);
              if (apiTestCase) {
                // Testcase có trong API -> update
                testcases.push({
                  id: t.id,
                  input: t.input || "",
                  expected_output: t.expected_output || "",
                  is_sample: t.is_sample || false,
                  order_index: index,
                  type: "update",
                });
              } else {
                // Testcase không có trong API -> create
                testcases.push({
                  input: t.input || "",
                  expected_output: t.expected_output || "",
                  is_sample: t.is_sample || false,
                  order_index: index,
                  type: "create",
                });
              }
            });

            // Testcases có trong API nhưng không có trong form -> delete
            apiTestcasesMap.forEach((apiTestCase, testcaseId) => {
              if (!formTestcasesMap.has(testcaseId)) {
                testcases.push({
                  id: testcaseId,
                  input: apiTestCase.input || null,
                  expected_output: apiTestCase.expected_output || null,
                  is_sample: apiTestCase.is_sample || false,
                  order_index: apiTestCase.order_index || null,
                  type: "delete",
                });
              }
            });
          } else {
            // Exercise mới -> tất cả testcases là create
            ex.testCases.forEach((t, index) => {
              testcases.push({
                input: t.input || "",
                expected_output: t.expected_output || "",
                is_sample: t.is_sample || false,
                order_index: index,
                type: "create",
              });
            });
          }

          // Build exercise payload
          const exercisePayload: any = {
            type: exerciseType,
            title: ex.title.trim(),
            description: descriptionText || "",
            difficulty: ex.difficulty,
            language_id: selectedLanguageId,
            // time_limit đã được tính từ maxCpuTime và 500ms (milliseconds), sử dụng trực tiếp
            time_limit: ex.testResult?.time_limit || 500,
            // Memory limit nhân đôi để có buffer cho code của sinh viên (có thể không tối ưu bằng code giảng viên)
            memory_limit: ex.testResult?.memory_limit
              ? ex.testResult.memory_limit * 2
              : 256000000,
            files,
            testcases,
          };

          // Chỉ thêm lesson_code_id khi update
          if (exerciseType === "update") {
            exercisePayload.lesson_code_id = ex.id;
          }

          return exercisePayload;
        });

        // Kết hợp payload với deleted exercises
        const finalPayload = [...payload, ...deletedExercises];

        await api.put(`/lecturer/lessons/${lessonId}/code`, finalPayload);
        messages.push("✅ Cập nhật code exercises thành công!");
        await mutateCodeExercises();
      }

      // Thông báo thành công
      if (messages.length > 0) {
        setSuccessMessage(`${messages.join(" ")} Đang chuyển hướng...`);
        window.scrollTo({ top: 0, behavior: "smooth" });

        setTimeout(() => {
          if (lessonDetail?.course_id) {
            router.push(
              `/lecturer/chapters?course_id=${lessonDetail.course_id}`
            );
          } else {
            router.push("/lecturer/chapters");
          }
        }, 3000);
      } else {
        // Không có thay đổi nào - redirect ngay lập tức
        if (lessonDetail?.course_id) {
          router.push(`/lecturer/chapters?course_id=${lessonDetail.course_id}`);
        } else {
          router.push("/lecturer/chapters");
        }
      }
    } catch (error: any) {
      const errorMessage =
        formatError(
          error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message
        ) || "Đã xảy ra lỗi khi cập nhật bài học code";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentStep,
    validateStep,
    lessonId,
    lessonTitle,
    hasLessonChanges,
    hasCodeExercisesChanges,
    exercises,
    selectedLanguageId,
    lessonDetail,
    mutateLessonDetail,
    router,
    codeExercisesData,
    mutateCodeExercises,
    createSnapshot,
  ]);

  // ============================================
  // HANDLERS - NAVIGATION
  // ============================================

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
        setError(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [currentStep, totalSteps, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
      setError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  // ============================================
  // EARLY RETURNS
  // ============================================

  if (!lessonId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 font-medium">
              Thiếu thông tin lesson ID. Vui lòng quay lại trang trước.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    isLoading ||
    !mounted ||
    !lessonDetail ||
    exercises.length === 0 ||
    !activeExercise
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-sm text-gray-600">Đang tải...</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => {
              if (lessonDetail?.course_id) {
                router.push(
                  `/lecturer/chapters?course_id=${lessonDetail.course_id}`
                );
              } else {
                router.push("/lecturer/chapters");
              }
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
          >
            <HiChevronLeft className="h-5 w-5" />
            <span className="font-medium">Quay lại danh sách bài học</span>
          </button>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Chỉnh sửa bài học Code
          </h1>
          <p className="text-gray-600">
            Cập nhật thông tin và code exercises cho bài học
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <span className="font-medium">
              Bước {currentStep + 1} / {totalSteps}
            </span>
            <span className="font-semibold text-green-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span
              className={currentStep >= 0 ? "text-green-600 font-medium" : ""}
            >
              Thông tin cơ bản
            </span>
            <span
              className={currentStep >= 1 ? "text-green-600 font-medium" : ""}
            >
              Code Editor
            </span>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 mb-6 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <HiCheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-900 mb-1">
                  Thành công!
                </h3>
                <p className="text-sm text-green-800 font-medium leading-relaxed">
                  {successMessage}
                </p>
                {successMessage.includes("chuyển hướng") && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang chuyển hướng về trang quản lý bài học...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-2">
              <HiXCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                {typeof error === "string" ? (
                  <p className="text-sm text-red-800 whitespace-pre-line">
                    {error}
                  </p>
                ) : (
                  <pre className="text-sm text-red-800 whitespace-pre-wrap">
                    {JSON.stringify(error, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-6">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Thông tin cơ bản về bài học
                </h2>
                <p className="text-gray-600">
                  Nhập thông tin cơ bản để mô tả bài học code của bạn
                </p>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Tiêu đề bài học <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateTitle}
                      disabled={isGeneratingTitle || !lessonTitle.trim()}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md"
                      title="Tự động tạo tiêu đề từ AI"
                    >
                      {isGeneratingTitle ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang tạo...
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          Tạo tiêu đề tự động
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="Ví dụ: Bài tập tính tổng hai số"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors.title
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500 focus:border-transparent"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Nhập tiêu đề và nhấn "Tạo tiêu đề tự động" để AI tối ưu
                    tiêu đề cho bạn
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Code Editor */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Exercises List - Horizontal */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Danh sách bài code ({exercises.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addExercise}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                  >
                    <HiPlus className="h-4 w-4" />
                    Thêm bài code
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {exercises.map((ex, index) => (
                    <div
                      key={ex.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all cursor-pointer min-w-[200px] flex-shrink-0 ${
                        activeExerciseIndex === index
                          ? "border-green-500 bg-green-50"
                          : "border-gray-300 bg-white hover:border-gray-400"
                      }`}
                      onClick={() => setActiveExerciseIndex(index)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-600 mb-1">
                          Bài {index + 1}
                        </div>
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {ex.title || `Bài code ${index + 1}`}
                        </div>
                        {ex.testResult && (
                          <div className="mt-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                ex.testResult.status === "passed"
                                  ? "bg-green-600 text-white"
                                  : "bg-red-600 text-white"
                              }`}
                            >
                              {ex.testResult.status === "passed"
                                ? "PASSED"
                                : "FAILED"}
                            </span>
                          </div>
                        )}
                      </div>
                      {exercises.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeExercise(index);
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                        >
                          <HiX className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Generate Code from Videos */}
              {videoLessons.length > 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-4 gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <HiSparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-green-900 mb-1">
                            Tạo code exercises tự động từ bài học video
                          </h3>
                          <p className="text-sm text-green-800">
                            Chọn một hoặc nhiều bài học video để AI tự động tạo
                            code exercises dựa trên nội dung video
                          </p>
                        </div>
                      </div>

                      {/* Mode Selection */}
                      <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Chọn cách xử lý:
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                            <input
                              type="radio"
                              name="generateMode"
                              value="add"
                              checked={generateMode === "add"}
                              onChange={(e) =>
                                setGenerateMode(
                                  e.target.value as "add" | "replace"
                                )
                              }
                              className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                Thêm vào danh sách hiện có
                              </div>
                              <div className="text-xs text-gray-600">
                                Thêm các bài code mới vào cuối danh sách hiện
                                tại
                              </div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                            <input
                              type="radio"
                              name="generateMode"
                              value="replace"
                              checked={generateMode === "replace"}
                              onChange={(e) =>
                                setGenerateMode(
                                  e.target.value as "add" | "replace"
                                )
                              }
                              className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                Làm lại từ đầu
                              </div>
                              <div className="text-xs text-gray-600">
                                Xóa tất cả bài code hiện có và tạo mới từ video
                                lessons
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Video Lessons List */}
                      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                        {videoLessons.map((lesson: any) => (
                          <label
                            key={lesson.id}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-all cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedLessonIds.includes(lesson.id)}
                              onChange={() => handleToggleLesson(lesson.id)}
                              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2 flex-1">
                              <HiVideoCamera className="h-5 w-5 text-green-600 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {lesson.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {lesson.chunk_count} phần nội dung
                                </p>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateCodeFromVideos}
                        disabled={
                          isGeneratingCode || selectedLessonIds.length === 0
                        }
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isGeneratingCode ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang tạo code exercises từ AI...
                          </>
                        ) : (
                          <>
                            <HiSparkles className="h-5 w-5" />
                            {generateMode === "replace"
                              ? "Làm lại từ đầu với"
                              : "Thêm vào danh sách từ"}{" "}
                            {selectedLessonIds.length}{" "}
                            {selectedLessonIds.length === 1
                              ? "bài học"
                              : "bài học"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Exercise Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tiêu đề bài code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={activeExercise.title}
                  onChange={(e) =>
                    handleExerciseChange(activeExerciseIndex, (ex) => ({
                      ...ex,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Tính tổng hai số"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Exercise Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mô tả chi tiết bài code
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <TiptapEditor
                    value={activeExercise.description}
                    onChange={(value) =>
                      handleExerciseChange(activeExerciseIndex, (ex) => ({
                        ...ex,
                        description: value,
                      }))
                    }
                    placeholder="Mô tả chi tiết về yêu cầu và hướng dẫn cho bài code này..."
                    minHeight="200px"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Mô tả chi tiết giúp học viên hiểu rõ yêu cầu và cách giải
                  quyết bài tập
                </p>
              </div>

              {/* Language & Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ngôn ngữ lập trình <span className="text-red-500">*</span>
                  </label>
                  {isLoadingLanguages ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2 text-sm text-gray-600">
                        Đang tải danh sách ngôn ngữ...
                      </span>
                    </div>
                  ) : (
                    <select
                      value={selectedLanguageId}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="">-- Chọn ngôn ngữ --</option>
                      {codeLanguages.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.name} ({lang.version})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Độ khó
                  </label>
                  <select
                    value={activeExercise.difficulty}
                    onChange={(e) =>
                      handleExerciseChange(activeExerciseIndex, (ex) => ({
                        ...ex,
                        difficulty: e.target.value as
                          | "easy"
                          | "medium"
                          | "hard",
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
              </div>

              {/* Code Files Editor */}
              <div
                className={`border border-gray-300 rounded-t-lg overflow-hidden bg-white ${
                  activeExercise.testResult
                    ? "rounded-b-none mb-0"
                    : "rounded-lg"
                }`}
              >
                {/* Tabs */}
                <div className="bg-gray-50 border-b border-gray-300">
                  <div className="flex items-center overflow-x-auto">
                    {activeExercise.codeFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`group flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-gray-300 transition-colors min-w-[150px] ${
                          activeExercise.activeFileId === file.id
                            ? "bg-white border-t-2 border-t-green-500 text-gray-900"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                        }`}
                        onClick={() =>
                          handleExerciseChange(activeExerciseIndex, (ex) => ({
                            ...ex,
                            activeFileId: file.id,
                          }))
                        }
                      >
                        <HiCode
                          className={`h-4 w-4 flex-shrink-0 ${
                            activeExercise.activeFileId === file.id
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        />
                        <span className="text-sm font-medium truncate flex-1">
                          {file.filename}
                        </span>
                        {file.is_main && (
                          <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">
                            Main
                          </span>
                        )}
                        {activeExercise.codeFiles.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCodeFile(file.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity ml-1 flex-shrink-0"
                          >
                            <HiX className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Editor Area */}
                <div className="flex" style={{ minHeight: "400px" }}>
                  {/* Sidebar */}
                  <div className="w-64 bg-gray-50 border-r border-gray-300 flex flex-col">
                    <div className="px-4 py-3 bg-white border-b border-gray-300 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Explorer
                      </span>
                      <button
                        type="button"
                        onClick={addCodeFile}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                        title="New File"
                      >
                        <HiPlus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <div className="py-2">
                        {activeExercise.codeFiles.map((file) => (
                          <div
                            key={file.id}
                            className={`group relative flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors ${
                              activeExercise.activeFileId === file.id
                                ? "bg-green-50 text-gray-900 border-r-2 border-r-green-500"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                            onClick={() =>
                              handleExerciseChange(
                                activeExerciseIndex,
                                (ex) => ({
                                  ...ex,
                                  activeFileId: file.id,
                                })
                              )
                            }
                          >
                            <HiCode
                              className={`h-4 w-4 flex-shrink-0 ${
                                activeExercise.activeFileId === file.id
                                  ? "text-green-600"
                                  : "text-gray-500"
                              }`}
                            />
                            {activeExercise.renamingFileId === file.id ? (
                              <input
                                type="text"
                                value={activeExercise.renameValue}
                                onChange={(e) =>
                                  handleExerciseChange(
                                    activeExerciseIndex,
                                    (ex) => ({
                                      ...ex,
                                      renameValue: e.target.value,
                                    })
                                  )
                                }
                                onBlur={finishRenamingFile}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") finishRenamingFile();
                                  if (e.key === "Escape") cancelRenamingFile();
                                }}
                                autoFocus
                                className="flex-1 bg-white text-gray-900 px-1 py-0.5 rounded text-sm border border-green-500 focus:outline-none"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <>
                                <span className="text-sm truncate flex-1">
                                  {file.filename}
                                </span>
                                {file.is_main && (
                                  <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">
                                    M
                                  </span>
                                )}
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startRenamingFile(file.id);
                                    }}
                                    className="text-gray-500 hover:text-gray-900 transition-colors"
                                    title="Rename"
                                  >
                                    <HiPencil className="h-3 w-3" />
                                  </button>
                                  {activeExercise.codeFiles.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeCodeFile(file.id);
                                      }}
                                      className="text-gray-500 hover:text-red-600 transition-colors"
                                      title="Delete"
                                    >
                                      <HiTrash className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="px-4 py-2 border-t border-gray-300">
                        <button
                          type="button"
                          onClick={addCodeFile}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          <HiPlus className="h-4 w-4" />
                          <span>New File</span>
                        </button>
                      </div>

                      <div className="px-4 py-2 border-t border-gray-300">
                        <div className="text-xs text-gray-600 mb-2 px-2 font-semibold">
                          Main File
                        </div>
                        <div className="space-y-1">
                          {activeExercise.codeFiles.map((file) => (
                            <label
                              key={file.id}
                              className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="radio"
                                name="mainFile"
                                checked={file.is_main}
                                onChange={() => setMainFile(file.id)}
                                className="w-4 h-4 text-green-500 focus:ring-green-500"
                              />
                              <span className="truncate">{file.filename}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Code Editor */}
                  <div className="flex-1 flex flex-col bg-white">
                    <div className="bg-gray-50 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleTestCode}
                        disabled={isTestingCode || !selectedLanguageId}
                        className="flex items-center gap-2 px-6 py-2 text-xs bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                      >
                        {isTestingCode ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang test...
                          </>
                        ) : (
                          <>
                            <HiPlay className="h-3 w-3" />
                            Test Code
                          </>
                        )}
                      </button>
                      <span className="text-xs text-gray-600 font-medium">
                        {activeFile?.filename || "No file selected"}
                      </span>
                      <button
                        type="button"
                        onClick={handleInsertTemplate}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                        title="Insert Template"
                      >
                        <HiLightningBolt className="h-3 w-3" />
                        <span>Template</span>
                      </button>
                    </div>
                    {activeFile && (
                      <div className="flex-1" style={{ minHeight: "300px" }}>
                        <CodeEditor
                          key={`code-${activeExercise.activeFileId}-${monacoLang}`}
                          height="100%"
                          language={monacoLang}
                          value={activeFile.content || ""}
                          onChange={(value) => {
                            const content = value ?? "";
                            updateCodeFile(
                              activeExercise.activeFileId,
                              "content",
                              content
                            );
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Test Results */}
              {activeExercise.testResult && (
                <div
                  className="border border-gray-300 rounded-b-lg bg-white"
                  style={{ maxHeight: "400px", overflow: "auto" }}
                >
                  <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700 uppercase">
                        Test Results
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          activeExercise.testResult.status === "passed"
                            ? "bg-green-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {activeExercise.testResult.status === "passed"
                          ? "PASSED"
                          : "FAILED"}
                      </span>
                      <span className="text-xs text-gray-600">
                        {activeExercise.testResult.passed}/
                        {activeExercise.testResult.total} tests
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleExerciseChange(activeExerciseIndex, (ex) => ({
                          ...ex,
                          testResult: null,
                        }))
                      }
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <HiX className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    <div>
                      <div className="text-green-600 mb-2 font-semibold">
                        $ Test Results Summary
                      </div>
                      <div className="ml-4 space-y-1 text-gray-700">
                        <div>
                          Status:{" "}
                          <span
                            className={
                              activeExercise.testResult.status === "passed"
                                ? "text-green-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {activeExercise.testResult.status.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          Language:{" "}
                          <span className="text-green-600 font-medium">
                            {activeExercise.testResult.language} (
                            {activeExercise.testResult.version})
                          </span>
                        </div>
                        <div>
                          Passed:{" "}
                          <span className="text-green-600 font-semibold">
                            {activeExercise.testResult.passed}
                          </span>{" "}
                          / Failed:{" "}
                          <span className="text-red-600 font-semibold">
                            {activeExercise.testResult.failed}
                          </span>{" "}
                          / Total:{" "}
                          <span className="text-yellow-600 font-semibold">
                            {activeExercise.testResult.total}
                          </span>
                        </div>
                        {activeExercise.testResult.time_limit &&
                          activeExercise.testResult.memory_limit && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="text-xs text-gray-600 mb-1">
                                Giới hạn đã được tính toán tự động:
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span>
                                  Time Limit:{" "}
                                  <span className="text-yellow-600 font-semibold">
                                    {(
                                      activeExercise.testResult.time_limit /
                                      1000
                                    ).toFixed(2)}
                                    s
                                  </span>
                                </span>
                                <span>
                                  Memory Limit:{" "}
                                  <span className="text-yellow-600 font-semibold">
                                    {(
                                      activeExercise.testResult.memory_limit /
                                      (1024 * 1024)
                                    ).toFixed(0)}
                                    MB
                                  </span>
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                💡 Các giới hạn này được tính từ kết quả test để
                                đảm bảo code của học viên không chạy quá lâu
                                hoặc tốn quá nhiều bộ nhớ
                              </p>
                            </div>
                          )}
                      </div>
                    </div>

                    {activeExercise.testResult.details.map((detail, index) => (
                      <div
                        key={index}
                        className="border-t border-gray-200 pt-4"
                      >
                        <div className="text-green-600 mb-2 font-semibold">
                          $ Test Case {detail.index}
                        </div>
                        <div className="ml-4 space-y-2 text-gray-700">
                          <div>
                            <span className="text-gray-600">Result:</span>{" "}
                            <span
                              className={
                                detail.result === "passed"
                                  ? "text-green-600 font-semibold"
                                  : "text-red-600 font-semibold"
                              }
                            >
                              {detail.result.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Input:</span>
                            <pre className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 text-gray-900 overflow-x-auto font-mono text-sm">
                              {detail.input || "(empty)"}
                            </pre>
                          </div>
                          <div>
                            <span className="text-gray-600">Expected:</span>
                            <pre className="mt-1 p-2 bg-green-50 rounded border border-green-200 text-green-800 overflow-x-auto font-mono text-sm">
                              {detail.expected}
                            </pre>
                          </div>
                          <div>
                            <span className="text-gray-600">Output:</span>
                            <pre
                              className={`mt-1 p-2 rounded border overflow-x-auto font-mono text-sm ${
                                detail.result === "passed"
                                  ? "bg-green-50 border-green-200 text-green-800"
                                  : "bg-red-50 border-red-200 text-red-800"
                              }`}
                            >
                              {detail.output || "(empty)"}
                            </pre>
                          </div>
                          {detail.stderr && (
                            <div>
                              <span className="text-red-600 font-semibold">
                                Error:
                              </span>
                              <pre className="mt-1 p-2 bg-red-50 rounded border border-red-200 text-red-800 overflow-x-auto font-mono text-sm">
                                {detail.stderr}
                              </pre>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-600 pt-1">
                            <span>
                              CPU:{" "}
                              <span className="text-yellow-600 font-medium">
                                {detail.cpu_time}ms
                              </span>
                            </span>
                            <span>
                              Memory:{" "}
                              <span className="text-yellow-600 font-medium">
                                {(detail.memory / 1000000).toFixed(2)} MB
                              </span>
                            </span>
                            <span>
                              Exit Code:{" "}
                              <span
                                className={
                                  detail.exit_code === 0
                                    ? "text-green-600 font-medium"
                                    : "text-red-600 font-medium"
                                }
                              >
                                {detail.exit_code}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Starter Code Editor */}
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Code mẫu (Starter Code)
                  </label>
                  <p className="text-xs text-gray-500">
                    Code ban đầu để học viên có thể viết thêm vào. Tên file và
                    main file được đồng bộ tự động từ Code Files (không thể sửa
                    tên file).
                  </p>
                </div>
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                  {/* Tabs */}
                  <div className="bg-gray-50 border-b border-gray-300">
                    <div className="flex items-center overflow-x-auto">
                      {activeExercise.starterCodeFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center gap-2 px-4 py-2 border-r border-gray-300 transition-colors min-w-[150px] ${
                            activeExercise.activeStarterFileId === file.id
                              ? "bg-white border-t-2 border-t-green-500 text-gray-900"
                              : "bg-gray-50 text-gray-600"
                          }`}
                          onClick={() =>
                            handleExerciseChange(activeExerciseIndex, (ex) => ({
                              ...ex,
                              activeStarterFileId: file.id,
                            }))
                          }
                        >
                          <HiCode
                            className={`h-4 w-4 flex-shrink-0 ${
                              activeExercise.activeStarterFileId === file.id
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          />
                          <span className="text-sm font-medium truncate flex-1">
                            {file.filename}
                          </span>
                          {file.is_main && (
                            <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">
                              Main
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Editor Area */}
                  <div className="flex" style={{ minHeight: "300px" }}>
                    {/* Sidebar */}
                    <div className="w-64 bg-gray-50 border-r border-gray-300 flex flex-col">
                      <div className="px-4 py-3 bg-white border-b border-gray-300">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Starter Code
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        <div className="py-2">
                          {activeExercise.starterCodeFiles.map((file) => (
                            <div
                              key={file.id}
                              className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors ${
                                activeExercise.activeStarterFileId === file.id
                                  ? "bg-green-50 text-gray-900 border-r-2 border-r-green-500"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                              onClick={() =>
                                handleExerciseChange(
                                  activeExerciseIndex,
                                  (ex) => ({
                                    ...ex,
                                    activeStarterFileId: file.id,
                                  })
                                )
                              }
                            >
                              <HiCode
                                className={`h-4 w-4 flex-shrink-0 ${
                                  activeExercise.activeStarterFileId === file.id
                                    ? "text-green-600"
                                    : "text-gray-500"
                                }`}
                              />
                              <span className="text-sm truncate flex-1">
                                {file.filename}
                              </span>
                              {file.is_main && (
                                <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">
                                  M
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="px-4 py-2 border-t border-gray-300">
                          <div className="text-xs text-gray-500 italic">
                            Tên file và main file được đồng bộ tự động từ Code
                            Files
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1 flex flex-col bg-white">
                      <div className="bg-gray-50 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">
                          {activeStarterFile?.filename || "No file selected"}
                        </span>
                        <button
                          type="button"
                          onClick={handleInsertStarterTemplate}
                          disabled={!selectedLang}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Insert Template"
                        >
                          <HiLightningBolt className="h-3 w-3" />
                          <span>Template</span>
                        </button>
                      </div>
                      {activeStarterFile && (
                        <div className="flex-1" style={{ minHeight: "300px" }}>
                          <CodeEditor
                            key={`starter-${activeExercise.activeStarterFileId}-${monacoLang}`}
                            height="100%"
                            language={monacoLang}
                            value={activeStarterFile.content}
                            onChange={(value) =>
                              updateStarterCodeFile(
                                activeExercise.activeStarterFileId,
                                "content",
                                value || ""
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Cases */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Test Cases <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addTestCase();
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    <HiPlus className="h-4 w-4" />
                    Thêm test case
                  </button>
                </div>

                <div className="space-y-4">
                  {activeExercise.testCases.map((testCase, index) => (
                    <div
                      key={testCase.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">
                          Test Case {index + 1}
                        </h4>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={testCase.is_sample || false}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateTestCase(
                                  testCase.id,
                                  "is_sample",
                                  e.target.checked
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">
                              Sample
                            </span>
                          </label>
                          {activeExercise.testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTestCase(testCase.id)}
                              className="text-red-600 hover:text-red-700 transition-colors"
                            >
                              <HiTrash className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Input
                        </label>
                        <div
                          className="border border-gray-300 rounded-lg overflow-hidden"
                          style={{ height: "150px" }}
                        >
                          <CodeEditor
                            height="100%"
                            language="plaintext"
                            value={testCase.input || ""}
                            onChange={(value) =>
                              updateTestCase(testCase.id, "input", value ?? "")
                            }
                            options={{
                              minimap: { enabled: false },
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Expected Output{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div
                          className="border border-gray-300 rounded-lg overflow-hidden"
                          style={{ height: "150px" }}
                        >
                          <CodeEditor
                            height="100%"
                            language="plaintext"
                            value={testCase.expected_output || ""}
                            onChange={(value) =>
                              updateTestCase(
                                testCase.id,
                                "expected_output",
                                value ?? ""
                              )
                            }
                            options={{
                              minimap: { enabled: false },
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <HiChevronLeft className="h-5 w-5" />
            Quay lại
          </button>

          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Tiếp theo
              <HiChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              {!canSave.canSave && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span className="font-medium">{canSave.reason}</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !hasChanges || !canSave.canSave}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title={
                  !hasChanges
                    ? "Không có thay đổi nào để lưu"
                    : !canSave.canSave
                    ? canSave.reason || "Vui lòng test lại code trước khi lưu"
                    : "Lưu các thay đổi"
                }
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <HiCheckCircle className="h-5 w-5" />
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditCodeLesson;
