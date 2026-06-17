"use client";

import CodeEditor from "@/components/shared/code-editor";
import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  CodeExercise,
  CodeFile,
  CodeLanguage,
  TestResult,
} from "@/types/lecturer/lesson-api";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
} from "react-icons/hi";
import useSWR from "swr";

// ============================================
// MAIN COMPONENT
// ============================================

const CreateCodeLesson = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const [mounted, setMounted] = useState(false);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>("");
  const [exercises, setExercises] = useState<CodeExercise[]>([]);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [lessonTitle, setLessonTitle] = useState("");
  const [codeLanguages, setCodeLanguages] = useState<CodeLanguage[]>([]);

  // Khởi tạo state sau khi mount để tránh hydration mismatch
  useEffect(() => {
    setMounted(true);
    const initId = "initial";
    const initialExercise: CodeExercise = {
      id: `exercise-${initId}`,
      title: "",
      difficulty: "medium",
      description: "",
      codeFiles: [
        {
          id: `file-${initId}`,
          filename: "main.py",
          content: "",
          is_main: true,
        },
      ],
      starterCodeFiles: [
        {
          id: `starter-${initId}`,
          filename: "main.py",
          content: "",
          is_main: true,
        },
      ],
      testCases: [
        {
          id: `test-${initId}`,
          input: "",
          expected_output: "",
          is_sample: false,
        },
      ],
      activeFileId: `file-${initId}`,
      activeStarterFileId: `starter-${initId}`,
      renamingFileId: null,
      renameValue: "",
      testResult: null,
      lastTestedSnapshot: null,
    };
    setExercises([initialExercise]);
  }, []);

  const activeExercise = exercises[activeExerciseIndex];

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
  // HELPER FUNCTIONS
  // ============================================

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
    return (
      templates[languageName.toLowerCase()] || "// Viết code của bạn ở đây"
    );
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
  // STATE
  // ============================================

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isTestingCode, setIsTestingCode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const hasChangedAfterTest = useRef(false);

  const totalSteps = 2;

  // ============================================
  // VALIDATION
  // ============================================

  const [errors, setErrors] = useState<Partial<Record<"title", string>>>({});

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
  // FETCH VIDEO LESSONS
  // ============================================

  // Fetch video lessons from section
  const { data: videoLessonsData } = useSWR(
    sectionId ? `/lecturer/lessons/${sectionId}` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Filter only video lessons
  const videoLessons =
    videoLessonsData?.filter((lesson: any) => lesson.lesson_type === "video") ||
    [];

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const selectedLang = useMemo(() => {
    if (!selectedLanguageId) return undefined;
    return codeLanguages.find((lang) => lang.id === selectedLanguageId);
  }, [codeLanguages, selectedLanguageId]);

  const monacoLang = useMemo(() => {
    if (!selectedLang) return "plaintext";
    const lang = getMonacoLanguage(selectedLang.name);
    return lang;
  }, [selectedLang]);

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

  // ============================================
  // SYNC STARTER CODE FROM CODE FILES
  // ============================================

  const syncStarterCodeFiles = useCallback(() => {
    setExercises((prev) => {
      if (prev.length === 0 || activeExerciseIndex >= prev.length) return prev;
      const currentEx = prev[activeExerciseIndex];
      if (!currentEx) return prev;

      const newStarterFiles: CodeFile[] = currentEx.codeFiles.map((file) => {
        const existingStarter = currentEx.starterCodeFiles.find(
          (sf) => sf.filename === file.filename
        );
        return {
          id: existingStarter?.id || `starter-${file.id}`,
          filename: file.filename,
          content: existingStarter?.content || "",
          is_main: file.is_main,
        };
      });

      const validFilenames = new Set(
        currentEx.codeFiles.map((f) => f.filename)
      );
      const filteredStarterFiles = newStarterFiles.filter((sf) =>
        validFilenames.has(sf.filename)
      );

      let activeStarterId = currentEx.activeStarterFileId;
      if (
        !filteredStarterFiles.find((f) => f.id === activeStarterId) &&
        filteredStarterFiles.length > 0
      ) {
        activeStarterId = filteredStarterFiles[0].id;
      }

      return prev.map((ex, idx) =>
        idx === activeExerciseIndex
          ? {
              ...ex,
              starterCodeFiles: filteredStarterFiles,
              activeStarterFileId: activeStarterId,
            }
          : ex
      );
    });
  }, [activeExerciseIndex]);

  // Đồng bộ khi code files thay đổi
  useEffect(() => {
    if (!activeExercise?.codeFiles) return;
    syncStarterCodeFiles();
  }, [
    activeExercise?.codeFiles
      ?.map((f) => `${f.filename}-${f.is_main}`)
      .join(","),
    syncStarterCodeFiles,
    activeExerciseIndex,
  ]);

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
    // Use current exercises state to ensure we're working with the correct exercise
    setExercises((prev) => {
      if (prev.length === 0 || activeExerciseIndex >= prev.length) return prev;
      const currentEx = prev[activeExerciseIndex];
      if (!currentEx) return prev;

      const newFile: CodeFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        filename: `file${currentEx.codeFiles.length + 1}.${getFileExtension(
          selectedLang?.name || "txt"
        )}`,
        content: "",
        is_main: currentEx.codeFiles.length === 0,
      };

      const updatedCodeFiles = [...currentEx.codeFiles, newFile];

      // Sync starter code files immediately when adding new file
      const newStarterFiles: CodeFile[] = updatedCodeFiles.map((file) => {
        const existingStarter = currentEx.starterCodeFiles.find(
          (sf) => sf.filename === file.filename
        );
        return {
          id: existingStarter?.id || `starter-${file.id}`,
          filename: file.filename,
          content: existingStarter?.content || "",
          is_main: file.is_main,
        };
      });

      // Update active starter file ID if needed
      let activeStarterId = currentEx.activeStarterFileId;
      if (
        !newStarterFiles.find((f) => f.id === activeStarterId) &&
        newStarterFiles.length > 0
      ) {
        activeStarterId = newStarterFiles[0].id;
      }

      return prev.map((ex, idx) =>
        idx === activeExerciseIndex
          ? {
              ...ex,
              codeFiles: updatedCodeFiles,
              activeFileId: newFile.id,
              starterCodeFiles: newStarterFiles,
              activeStarterFileId: activeStarterId,
            }
          : ex
      );
    });
    hasChangedAfterTest.current = true;
  }, [activeExerciseIndex, selectedLang]);

  const removeCodeFile = useCallback(
    (fileId: string) => {
      setExercises((prev) => {
        if (prev.length === 0 || activeExerciseIndex >= prev.length)
          return prev;
        const currentEx = prev[activeExerciseIndex];
        if (!currentEx || currentEx.codeFiles.length <= 1) return prev;

        const newFiles = currentEx.codeFiles.filter((f) => f.id !== fileId);
        const removedFile = currentEx.codeFiles.find((f) => f.id === fileId);

        if (removedFile?.is_main && newFiles.length > 0) {
          newFiles[0].is_main = true;
        }

        let activeId = currentEx.activeFileId;
        if (activeId === fileId && newFiles.length > 0) {
          activeId = newFiles[0].id;
        }

        // Sync starter code files after removing file
        const newStarterFiles: CodeFile[] = newFiles.map((file) => {
          const existingStarter = currentEx.starterCodeFiles.find(
            (sf) => sf.filename === file.filename
          );
          return {
            id: existingStarter?.id || `starter-${file.id}`,
            filename: file.filename,
            content: existingStarter?.content || "",
            is_main: file.is_main,
          };
        });

        let activeStarterId = currentEx.activeStarterFileId;
        if (
          !newStarterFiles.find((f) => f.id === activeStarterId) &&
          newStarterFiles.length > 0
        ) {
          activeStarterId = newStarterFiles[0].id;
        }

        return prev.map((ex, idx) =>
          idx === activeExerciseIndex
            ? {
                ...ex,
                codeFiles: newFiles,
                activeFileId: activeId,
                starterCodeFiles: newStarterFiles,
                activeStarterFileId: activeStarterId,
                // Reset rename state if deleting the file being renamed
                renamingFileId:
                  ex.renamingFileId === fileId ? null : ex.renamingFileId,
                renameValue: ex.renamingFileId === fileId ? "" : ex.renameValue,
              }
            : ex
        );
      });
      hasChangedAfterTest.current = true;
    },
    [activeExerciseIndex]
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
    [handleExerciseChange]
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

  const finishRenamingFile = useCallback(
    (value?: string) => {
      if (!activeExercise) return;
      handleExerciseChange(activeExerciseIndex, (ex) => {
        if (!ex.renamingFileId) return ex;

        // Use provided value or fallback to state value
        const inputValue = value !== undefined ? value : ex.renameValue;
        const trimmedValue = inputValue.trim();

        // If empty, cancel rename
        if (!trimmedValue) {
          return {
            ...ex,
            renamingFileId: null,
            renameValue: "",
          };
        }

        // Check if filename already exists
        const filenameExists = ex.codeFiles.some(
          (f) => f.filename === trimmedValue && f.id !== ex.renamingFileId
        );

        if (filenameExists) {
          showToast.error("Tên file đã tồn tại!");
          return {
            ...ex,
            renamingFileId: null,
            renameValue: "",
          };
        }

        // Update filename in code files
        const updatedCodeFiles = ex.codeFiles.map((f) =>
          f.id === ex.renamingFileId ? { ...f, filename: trimmedValue } : f
        );

        // Find the renamed file to get its old filename
        const renamedFile = ex.codeFiles.find(
          (f) => f.id === ex.renamingFileId
        );
        const oldFilename = renamedFile?.filename;

        // Update starter code files to match new filename
        const updatedStarterFiles = ex.starterCodeFiles.map((sf) => {
          if (sf.filename === oldFilename) {
            return {
              ...sf,
              filename: trimmedValue,
            };
          }
          return sf;
        });

        return {
          ...ex,
          codeFiles: updatedCodeFiles,
          starterCodeFiles: updatedStarterFiles,
          renamingFileId: null,
          renameValue: "",
        };
      });
      hasChangedAfterTest.current = true;
    },
    [activeExercise, activeExerciseIndex, handleExerciseChange]
  );

  const cancelRenamingFile = useCallback(() => {
    if (!activeExercise) return;
    handleExerciseChange(activeExerciseIndex, (ex) => ({
      ...ex,
      renamingFileId: null,
      renameValue: "",
    }));
  }, [activeExercise, activeExerciseIndex, handleExerciseChange]);

  // ============================================
  // HANDLERS - STARTER CODE FILES
  // ============================================

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
    [handleExerciseChange]
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
    [handleExerciseChange]
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

        // Set exercises với exercises mới
        setExercises(formattedExercises);
        setActiveExerciseIndex(0); // Reset to first exercise

        // Set language ID từ exercise đầu tiên (nếu có)
        if (
          formattedExercises.length > 0 &&
          generatedExercises[0]?.language_id
        ) {
          setSelectedLanguageId(generatedExercises[0].language_id);
        }

        setSuccessMessage(
          `✅ Đã tạo ${formattedExercises.length} bài code tự động từ ${selectedLessonIds.length} bài học video!`
        );
        // Clear selection after success
        setSelectedLessonIds([]);
      } else {
        setError("Không thể tạo code exercises tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo code exercises tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingCode(false);
    }
  }, [selectedLessonIds]);

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

      // Lấy giá trị trực tiếp từ exercises state để đảm bảo có data mới nhất
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

      // Tính toán time_limit và memory_limit từ test result
      // Lấy giá trị LỚN NHẤT (MAX) từ tất cả test cases, không phải trung bình
      // Vì cần đảm bảo code của học viên không vượt quá test case tốn nhiều tài nguyên nhất
      //
      // Cách hoạt động:
      // 1. Khi giảng viên test code: Lấy MAX từ test cases → tính time_limit và memory_limit → lưu vào lesson
      // 2. Khi học viên chạy code: Dùng các giới hạn này để chạy
      //    - Nếu vượt time_limit → bị dừng, không tính điểm
      //    - Nếu vượt memory_limit → bị dừng, không tính điểm
      let maxCpuTime = 0;
      let maxMemory = 0;

      if (response.data.details && response.data.details.length > 0) {
        // Lấy MAX (giá trị lớn nhất) từ tất cả test cases
        maxCpuTime = Math.max(
          ...response.data.details.map((d) => d.cpu_time || 0)
        );
        maxMemory = Math.max(
          ...response.data.details.map((d) => d.memory || 0)
        );
      }

      // time_limit: lấy max giữa maxCpuTime và 500ms
      // cpu_time là milliseconds, time_limit cũng là milliseconds
      // Học viên chạy quá time_limit này sẽ bị dừng và không tính điểm
      const timeLimit = Math.max(maxCpuTime, 500); // Tối thiểu 500ms

      // memory_limit: memory là bytes, làm tròn lên MB rồi nhân lại + buffer 1MB
      // Ví dụ: 50MB = 52428800 bytes → làm tròn lên 51MB = 53477376 bytes + 1MB = 54525952 bytes
      // Học viên chạy quá memory_limit này sẽ bị dừng và không tính điểm
      const memoryLimit =
        maxMemory > 0
          ? (Math.ceil(maxMemory / (1024 * 1024)) + 1) * (1024 * 1024)
          : 256000000; // Default 256MB (256 * 1024 * 1024 bytes) nếu không có data

      console.log("Test result limits (MAX từ tất cả test cases):", {
        maxCpuTime,
        maxMemory,
        timeLimit,
        memoryLimit,
        memoryLimitMB: memoryLimit / (1024 * 1024),
        totalTestCases: response.data.details?.length || 0,
      });

      const testResultWithLimits: TestResult = {
        ...response.data,
        time_limit: timeLimit,
        memory_limit: memoryLimit,
      };

      const snapshot = createSnapshot(currentExercise);

      // Sau khi test code thành công, tự động sync content từ solution code sang starter code
      // Đảm bảo starter code có dữ liệu từ solution code đã được test
      handleExerciseChange(activeExerciseIndex, (ex) => {
        // Tạo starter files mới với content từ solution files
        const newStarterFiles: CodeFile[] = ex.codeFiles.map((file) => {
          const existingStarter = ex.starterCodeFiles.find(
            (sf) => sf.filename === file.filename
          );
          return {
            id: existingStarter?.id || `starter-${file.id}`,
            filename: file.filename,
            // Nếu starter code đã có content, giữ lại; nếu chưa có thì copy từ solution
            content: existingStarter?.content?.trim()
              ? existingStarter.content
              : file.content || "",
            is_main: file.is_main,
          };
        });

        // Đảm bảo activeStarterFileId vẫn hợp lệ
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
  // HANDLERS - CREATE LESSON
  // ============================================

  const handleCreateLesson = useCallback(async () => {
    // Validate lesson info
    if (!lessonTitle.trim()) {
      setError("Vui lòng nhập tiêu đề bài học!");
      return;
    }

    if (!selectedLanguageId) {
      setError("Vui lòng chọn ngôn ngữ lập trình!");
      return;
    }

    // Validate tất cả exercises
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];

      if (!ex.title.trim()) {
        setError(`Bài code ${i + 1}: Vui lòng nhập tiêu đề!`);
        return;
      }

      if (ex.codeFiles.length === 0) {
        setError(`Bài code ${i + 1}: Vui lòng thêm ít nhất một file code!`);
        return;
      }

      if (ex.testCases.length === 0) {
        setError(`Bài code ${i + 1}: Vui lòng thêm ít nhất một test case!`);
        return;
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
        return;
      }

      // Kiểm tra test đã pass chưa
      if (!ex.testResult || ex.testResult.status !== "passed") {
        setError(
          `Bài code ${
            i + 1
          }: Vui lòng test code và đảm bảo tất cả test cases đều pass!`
        );
        return;
      }

      // Kiểm tra snapshot có khớp không
      const currentSnapshot = createSnapshot(ex);
      if (currentSnapshot !== ex.lastTestedSnapshot) {
        setError(
          `Bài code ${i + 1}: Code đã thay đổi sau khi test. Vui lòng test lại!`
        );
        return;
      }
    }

    setIsCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const sectionId = searchParams.get("section_id");
      if (!sectionId) {
        setError("Thiếu thông tin section_id");
        return;
      }

      // Step 1: Create lesson
      const createResponse = await api.post("/lecturer/lessons/create", {
        section_id: sectionId,
        title: lessonTitle.trim(),
        lesson_type: "code",
      });

      const lessonId = createResponse.data?.id;
      if (!lessonId) {
        throw new Error("Không nhận được ID bài học từ server");
      }

      setCreatedLessonId(lessonId);
      setSuccessMessage(
        "✅ Tạo bài học thành công! Đang tạo code exercises..."
      );

      // Step 2: Create code exercises (array)
      setIsUploading(true);

      // Convert description từ HTML/Markdown sang plain text nếu cần
      const payload = exercises.map((ex) => {
        let descriptionText = ex.description.trim();
        if (descriptionText) {
          // Remove HTML tags nếu có
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

        return {
          language_id: selectedLanguageId,
          title: ex.title.trim(),
          description: descriptionText || "",
          difficulty: ex.difficulty,
          // time_limit đã được tính từ maxCpuTime và 500ms (milliseconds), sử dụng trực tiếp
          // memory_limit nhân đôi để đảm bảo học viên có đủ bộ nhớ
          time_limit: ex.testResult?.time_limit || 500,
          memory_limit: (ex.testResult?.memory_limit || 256000000) * 2,
          starter_files: ex.starterCodeFiles.map((f) => ({
            filename: f.filename.trim(),
            content: f.content || "",
            is_main: f.is_main || false,
          })),
          solution_files: ex.codeFiles.map((f) => ({
            filename: f.filename.trim(),
            content: f.content || "",
            is_main: f.is_main || false,
          })),
          testcases: ex.testCases.map((t, index) => ({
            input: t.input || "",
            expected_output: t.expected_output || "",
            is_sample: t.is_sample || false,
            order_index: index,
          })),
        };
      });

      await api.post(`/lecturer/lessons/${lessonId}/code/create`, payload);

      setSuccessMessage("✅ Tạo bài học code thành công! Đang chuyển hướng...");

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Redirect after 3 seconds to give user time to see the message
      setTimeout(() => {
        const courseId = searchParams.get("course_id");
        if (courseId) {
          router.push(`/lecturer/chapters?course_id=${courseId}`);
        } else {
          router.push("/lecturer/chapters");
        }
      }, 3000);
    } catch (error: any) {
      console.error("Lỗi khi tạo bài học:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi tạo bài học code";
      setError(errorMessage);
    } finally {
      setIsCreating(false);
      setIsUploading(false);
    }
  }, [
    exercises,
    lessonTitle,
    selectedLanguageId,
    createSnapshot,
    searchParams,
    router,
  ]);

  // Kiểm tra xem có thể hoàn tất không (phải đặt trước mọi early return)
  const canComplete = useMemo(() => {
    // Kiểm tra tất cả exercises
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];

      // Kiểm tra test đã pass chưa
      if (!ex.testResult || ex.testResult.status !== "passed") {
        return {
          canComplete: false,
          reason: `Bài code ${i + 1}: Chưa test hoặc test chưa pass`,
        };
      }

      // Kiểm tra snapshot có khớp không
      const currentSnapshot = createSnapshot(ex);
      if (currentSnapshot !== ex.lastTestedSnapshot) {
        return {
          canComplete: false,
          reason: `Bài code ${
            i + 1
          }: Đã có thay đổi sau khi test. Vui lòng test lại!`,
        };
      }
    }
    return { canComplete: true, reason: null };
  }, [exercises, createSnapshot, selectedLanguageId]);

  // Early returns sau khi tất cả hooks đã được gọi
  if (!sectionId || !courseId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 font-medium">
              Thiếu thông tin section_id hoặc course_id. Vui lòng quay lại trang
              trước.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!mounted || exercises.length === 0 || !activeExercise) {
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
  // VALIDATION & HANDLERS (non-hooks)
  // ============================================

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<"title", string>> = {};

    switch (step) {
      case 0: // Basic Info
        if (!lessonTitle.trim()) {
          newErrors.title = "Vui lòng nhập tiêu đề bài học";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
        setError(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
      setError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ============================================
  // AI GENERATION HANDLERS (non-hooks)
  // ============================================

  const handleGenerateTitle = async () => {
    if (!lessonTitle.trim()) {
      setError("Vui lòng nhập tiêu đề bài học trước");
      return;
    }

    setIsGeneratingTitle(true);
    setError(null);

    try {
      const response = await api.post(
        "/lecturers/chat/lesson/rewrite_the_title",
        {
          title: lessonTitle.trim(),
        }
      );

      const generatedTitle = response.data;
      if (generatedTitle && typeof generatedTitle === "string") {
        setLessonTitle(generatedTitle);
      } else {
        setError("Không thể tạo tiêu đề tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo tiêu đề tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() =>
              router.push(`/lecturer/chapters?course_id=${courseId}`)
            }
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
          >
            <HiChevronLeft className="h-5 w-5" />
            <span className="font-medium">Quay lại danh sách bài học</span>
          </button>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Tạo bài học Code
          </h1>
          <p className="text-gray-600">
            Tạo bài học lập trình với code editor và test cases
          </p>
        </div>

        <div className="space-y-6">
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
            <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 mb-6 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <HiPlay className="h-6 w-6 text-white" />
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
              <div className="flex items-center gap-2">
                <HiX className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
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
                      <p className="text-red-600 text-sm mt-1">
                        {errors.title}
                      </p>
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
                              Chọn một hoặc nhiều bài học video để AI tự động
                              tạo code exercises dựa trên nội dung video
                            </p>
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
                              Tạo code exercises tự động từ{" "}
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
                                  onBlur={(e) => {
                                    e.stopPropagation();
                                    finishRenamingFile(e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      finishRenamingFile(
                                        (e.target as HTMLInputElement).value
                                      );
                                    }
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      cancelRenamingFile();
                                    }
                                  }}
                                  autoFocus
                                  className="flex-1 bg-white text-gray-900 px-1 py-0.5 rounded text-sm border border-green-500 focus:outline-none"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
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
                                        e.preventDefault();
                                        e.stopPropagation();
                                        startRenamingFile(file.id);
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
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
                                          e.preventDefault();
                                          e.stopPropagation();
                                          removeCodeFile(file.id);
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
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
                                <span className="truncate">
                                  {file.filename}
                                </span>
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
                                  💡 Các giới hạn này được tính từ kết quả test
                                  để đảm bảo code của học viên không chạy quá
                                  lâu hoặc tốn quá nhiều bộ nhớ
                                </p>
                              </div>
                            )}
                        </div>
                      </div>

                      {activeExercise.testResult.details.map(
                        (detail, index) => (
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
                        )
                      )}
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
                      main file được đồng bộ tự động từ Code Files (không thể
                      sửa tên file).
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
                                    activeExercise.activeStarterFileId ===
                                    file.id
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
                          <div
                            className="flex-1"
                            style={{ minHeight: "300px" }}
                          >
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
                                updateTestCase(
                                  testCase.id,
                                  "input",
                                  value ?? ""
                                )
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
              disabled={currentStep === 0 || isCreating || isUploading}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <HiChevronLeft className="h-5 w-5" />
              Quay lại
            </button>

            {currentStep < totalSteps - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isCreating || isUploading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Tiếp theo
                <HiChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {!canComplete.canComplete && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
                    <div className="flex items-center gap-2">
                      <span>⚠️</span>
                      <span className="font-medium">{canComplete.reason}</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleCreateLesson}
                  disabled={
                    isCreating || isUploading || !canComplete.canComplete
                  }
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title={
                    !canComplete.canComplete
                      ? canComplete.reason ||
                        "Vui lòng test tất cả bài code và đảm bảo không có thay đổi sau khi test"
                      : undefined
                  }
                >
                  {isCreating || isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <HiPlay className="h-5 w-5" />
                      Hoàn tất
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCodeLesson;
