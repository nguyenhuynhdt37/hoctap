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
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Lightbulb,
  Loader2,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Terminal,
  Trash2,
  Video,
  X,
  Zap,
} from "lucide-react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";

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
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Alert variant="destructive" title="Thiếu thông tin">
            Thiếu thông tin section_id hoặc course_id. Vui lòng quay lại trang
            trước.
          </Alert>
        </div>
      </div>
    );
  }

  if (!mounted || exercises.length === 0 || !activeExercise) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center gap-2.5">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Đang tải...
            </span>
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
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(`/lecturer/chapters?course_id=${courseId}`)
            }
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            Quay lại danh sách bài học
          </Button>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Tạo bài học Code
          </h1>
          <p className="text-muted-foreground">
            Tạo bài học lập trình với code editor và test cases
          </p>
        </div>

        <div className="space-y-6">
          {/* Progress Bar */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <span className="font-medium text-foreground">
                Bước {currentStep + 1} / {totalSteps}
              </span>
              <Badge variant="primary" size="sm">
                {Math.round(progressPercentage)}%
              </Badge>
            </div>
            <div className="w-full bg-surface-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span
                className={
                  currentStep >= 0 ? "text-foreground font-semibold" : ""
                }
              >
                Thông tin cơ bản
              </span>
              <span
                className={
                  currentStep >= 1 ? "text-foreground font-semibold" : ""
                }
              >
                Code Editor
              </span>
            </div>
          </Card>

          {/* Success Message */}
          {successMessage && (
            <Alert
              variant="success"
              title="Thành công!"
              className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <div className="space-y-2">
                <p className="leading-relaxed">{successMessage}</p>
                {successMessage.includes("chuyển hướng") && (
                  <div className="flex items-center gap-2 text-xs text-success-foreground/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang chuyển hướng về trang quản lý bài học...</span>
                  </div>
                )}
              </div>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              {error}
            </Alert>
          )}

          {/* Step Content */}
          <Card className="p-6 sm:p-8 mb-6">
            {/* Step 0: Basic Info */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                    Thông tin cơ bản về bài học
                  </h2>
                  <p className="text-muted-foreground">
                    Nhập thông tin cơ bản để mô tả bài học code của bạn
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <label className="block text-sm font-semibold text-foreground">
                        Tiêu đề bài học{" "}
                        <span className="text-destructive-foreground">*</span>
                      </label>
                      <Button
                        type="button"
                        variant="pastel"
                        size="sm"
                        onClick={handleGenerateTitle}
                        disabled={isGeneratingTitle || !lessonTitle.trim()}
                        isLoading={isGeneratingTitle}
                        loadingText="Đang tạo..."
                        leftIcon={<Sparkles className="h-4 w-4" />}
                        title="Tự động tạo tiêu đề từ AI"
                      >
                        Tạo tiêu đề tự động
                      </Button>
                    </div>
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      placeholder="Ví dụ: Bài tập tính tổng hai số"
                      className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-2 transition-all ${
                        errors.title
                          ? "border-destructive-border focus:ring-destructive-border/40"
                          : "border-border focus:ring-primary/30 focus:border-primary"
                      }`}
                    />
                    {errors.title && (
                      <p className="text-destructive-foreground text-sm mt-1.5">
                        {errors.title}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                      <Lightbulb className="h-3.5 w-3.5 text-warning-foreground flex-shrink-0" />
                      <span>
                        Nhập tiêu đề và nhấn &quot;Tạo tiêu đề tự động&quot; để
                        AI tối ưu tiêu đề cho bạn
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Code Editor */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Exercises List - Horizontal */}
                <div className="bg-surface-muted/60 rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Danh sách bài code ({exercises.length})
                    </h3>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={addExercise}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Thêm bài code
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {exercises.map((ex, index) => (
                      <div
                        key={ex.id}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all cursor-pointer min-w-[200px] flex-shrink-0 ${
                          activeExerciseIndex === index
                            ? "border-primary bg-primary-light/60 shadow-xs"
                            : "border-border bg-surface hover:border-border-strong"
                        }`}
                        onClick={() => setActiveExerciseIndex(index)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-muted-foreground mb-1">
                            Bài {index + 1}
                          </div>
                          <div className="text-sm font-medium text-foreground truncate">
                            {ex.title || `Bài code ${index + 1}`}
                          </div>
                          {ex.testResult && (
                            <div className="mt-1.5">
                              <Badge
                                variant={
                                  ex.testResult.status === "passed"
                                    ? "success"
                                    : "destructive"
                                }
                                size="sm"
                              >
                                {ex.testResult.status === "passed"
                                  ? "PASSED"
                                  : "FAILED"}
                              </Badge>
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
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive-foreground hover:bg-destructive-bg/60 transition-colors flex-shrink-0 cursor-pointer"
                            title="Xóa bài code"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Generate Code from Videos */}
                {videoLessons.length > 0 && (
                  <Card
                    variant="pastel-blue"
                    className="p-6 border-primary-pastel"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center mb-4 gap-3">
                          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground mb-1">
                              Tạo code exercises tự động từ bài học video
                            </h3>
                            <p className="text-sm text-muted-foreground">
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
                              className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-primary hover:bg-primary-light/30 transition-all cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedLessonIds.includes(lesson.id)}
                                onChange={() => handleToggleLesson(lesson.id)}
                                className="w-4 h-4 accent-primary rounded border-border cursor-pointer"
                              />
                              <div className="flex items-center gap-2.5 flex-1">
                                <Video className="h-5 w-5 text-primary-hover flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">
                                    {lesson.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {lesson.chunk_count} phần nội dung
                                  </p>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>

                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleGenerateCodeFromVideos}
                          disabled={
                            isGeneratingCode || selectedLessonIds.length === 0
                          }
                          isLoading={isGeneratingCode}
                          loadingText="Đang tạo code exercises từ AI..."
                          leftIcon={<Sparkles className="h-4 w-4" />}
                          className="w-full"
                        >
                          Tạo code exercises tự động từ{" "}
                          {selectedLessonIds.length} bài học
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Exercise Title */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Tiêu đề bài code{" "}
                    <span className="text-destructive-foreground">*</span>
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
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                {/* Exercise Description */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Mô tả chi tiết bài code
                  </label>
                  <div className="border border-border rounded-xl overflow-hidden bg-surface">
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
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-warning-foreground flex-shrink-0" />
                    <span>
                      Mô tả chi tiết giúp học viên hiểu rõ yêu cầu và cách giải
                      quyết bài tập
                    </span>
                  </p>
                </div>

                {/* Language & Difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Ngôn ngữ lập trình{" "}
                      <span className="text-destructive-foreground">*</span>
                    </label>
                    {isLoadingLanguages ? (
                      <div className="flex items-center justify-center gap-2 py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Đang tải danh sách ngôn ngữ...
                        </span>
                      </div>
                    ) : (
                      <select
                        value={selectedLanguageId}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
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
                    <label className="block text-sm font-semibold text-foreground mb-2">
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
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                    </select>
                  </div>
                </div>

                {/* Code Files Editor */}
                <div
                  className={`border border-border overflow-hidden bg-surface ${
                    activeExercise.testResult
                      ? "rounded-t-xl rounded-b-none mb-0"
                      : "rounded-xl"
                  }`}
                >
                  {/* Tabs */}
                  <div className="bg-surface-muted/70 border-b border-border">
                    <div className="flex items-center overflow-x-auto">
                      {activeExercise.codeFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer border-r border-border transition-colors min-w-[150px] ${
                            activeExercise.activeFileId === file.id
                              ? "bg-surface border-t-2 border-t-primary text-foreground"
                              : "bg-surface-muted/50 hover:bg-surface-muted text-muted-foreground"
                          }`}
                          onClick={() =>
                            handleExerciseChange(activeExerciseIndex, (ex) => ({
                              ...ex,
                              activeFileId: file.id,
                            }))
                          }
                        >
                          <Code2
                            className={`h-4 w-4 flex-shrink-0 ${
                              activeExercise.activeFileId === file.id
                                ? "text-primary-hover"
                                : "text-subtle-foreground"
                            }`}
                          />
                          <span className="text-sm font-medium truncate flex-1">
                            {file.filename}
                          </span>
                          {file.is_main && (
                            <Badge
                              variant="primary"
                              size="sm"
                              className="flex-shrink-0"
                            >
                              Main
                            </Badge>
                          )}
                          {activeExercise.codeFiles.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCodeFile(file.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive-foreground transition-opacity ml-1 flex-shrink-0 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Editor Area */}
                  <div className="flex" style={{ minHeight: "400px" }}>
                    {/* Sidebar */}
                    <div className="w-64 bg-surface-muted/50 border-r border-border flex flex-col">
                      <div className="px-4 py-3 bg-surface border-b border-border flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          Explorer
                        </span>
                        <button
                          type="button"
                          onClick={addCodeFile}
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="New File"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        <div className="py-2">
                          {activeExercise.codeFiles.map((file) => (
                            <div
                              key={file.id}
                              className={`group relative flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors ${
                                activeExercise.activeFileId === file.id
                                  ? "bg-primary-light/70 text-foreground border-r-2 border-r-primary"
                                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
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
                              <Code2
                                className={`h-4 w-4 flex-shrink-0 ${
                                  activeExercise.activeFileId === file.id
                                    ? "text-primary-hover"
                                    : "text-subtle-foreground"
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
                                  className="flex-1 bg-surface text-foreground px-1.5 py-0.5 rounded text-sm border border-primary focus:outline-none"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <>
                                  <span className="text-sm truncate flex-1">
                                    {file.filename}
                                  </span>
                                  {file.is_main && (
                                    <Badge
                                      variant="primary"
                                      size="sm"
                                      className="flex-shrink-0"
                                    >
                                      M
                                    </Badge>
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
                                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                      title="Rename"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
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
                                        className="text-muted-foreground hover:text-destructive-foreground transition-colors cursor-pointer"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="px-4 py-2 border-t border-border">
                          <button
                            type="button"
                            onClick={addCodeFile}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-muted rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="h-4 w-4 text-primary-hover" />
                            <span>New File</span>
                          </button>
                        </div>

                        <div className="px-4 py-2 border-t border-border">
                          <div className="text-xs text-muted-foreground mb-2 px-2 font-semibold">
                            Main File
                          </div>
                          <div className="space-y-1">
                            {activeExercise.codeFiles.map((file) => (
                              <label
                                key={file.id}
                                className="flex items-center gap-2 px-2 py-1.5 text-sm text-foreground hover:bg-surface-muted rounded-lg cursor-pointer transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="radio"
                                  name="mainFile"
                                  checked={file.is_main}
                                  onChange={() => setMainFile(file.id)}
                                  className="w-4 h-4 accent-primary cursor-pointer"
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
                    <div className="flex-1 flex flex-col bg-surface">
                      <div className="bg-surface-muted/70 border-b border-border px-4 py-2 flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleTestCode}
                          disabled={isTestingCode || !selectedLanguageId}
                          isLoading={isTestingCode}
                          loadingText="Đang test..."
                          leftIcon={<Play className="h-3.5 w-3.5" />}
                        >
                          Test Code
                        </Button>
                        <span className="text-xs text-muted-foreground font-medium truncate">
                          {activeFile?.filename || "No file selected"}
                        </span>
                        <Button
                          type="button"
                          variant="pastel"
                          size="sm"
                          onClick={handleInsertTemplate}
                          leftIcon={<Zap className="h-3.5 w-3.5" />}
                          title="Insert Template"
                        >
                          Template
                        </Button>
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
                    className="border border-t-0 border-border rounded-b-xl bg-surface"
                    style={{ maxHeight: "400px", overflow: "auto" }}
                  >
                    <div className="bg-surface-muted/70 px-4 py-2.5 flex items-center justify-between border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          Test Results
                        </span>
                        <Badge
                          variant={
                            activeExercise.testResult.status === "passed"
                              ? "success"
                              : "destructive"
                          }
                          size="sm"
                        >
                          {activeExercise.testResult.status === "passed"
                            ? "PASSED"
                            : "FAILED"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
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
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-4 space-y-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-primary-hover mb-2 font-semibold text-sm">
                          <Terminal className="h-4 w-4" />
                          <span>Test Results Summary</span>
                        </div>
                        <div className="ml-4 space-y-1.5 text-sm text-foreground">
                          <div>
                            Status:{" "}
                            <span
                              className={
                                activeExercise.testResult.status === "passed"
                                  ? "text-success-foreground font-semibold"
                                  : "text-destructive-foreground font-semibold"
                              }
                            >
                              {activeExercise.testResult.status.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            Language:{" "}
                            <span className="text-primary-hover font-medium">
                              {activeExercise.testResult.language} (
                              {activeExercise.testResult.version})
                            </span>
                          </div>
                          <div>
                            Passed:{" "}
                            <span className="text-success-foreground font-semibold">
                              {activeExercise.testResult.passed}
                            </span>{" "}
                            / Failed:{" "}
                            <span className="text-destructive-foreground font-semibold">
                              {activeExercise.testResult.failed}
                            </span>{" "}
                            / Total:{" "}
                            <span className="text-warning-foreground font-semibold">
                              {activeExercise.testResult.total}
                            </span>
                          </div>
                          {activeExercise.testResult.time_limit &&
                            activeExercise.testResult.memory_limit && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Giới hạn đã được tính toán tự động:
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span>
                                    Time Limit:{" "}
                                    <span className="text-warning-foreground font-semibold">
                                      {(
                                        activeExercise.testResult.time_limit /
                                        1000
                                      ).toFixed(2)}
                                      s
                                    </span>
                                  </span>
                                  <span>
                                    Memory Limit:{" "}
                                    <span className="text-warning-foreground font-semibold">
                                      {(
                                        activeExercise.testResult.memory_limit /
                                        (1024 * 1024)
                                      ).toFixed(0)}
                                      MB
                                    </span>
                                  </span>
                                </div>
                                <p className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1.5">
                                  <Lightbulb className="h-3.5 w-3.5 text-warning-foreground flex-shrink-0 mt-0.5" />
                                  <span>
                                    Các giới hạn này được tính từ kết quả test
                                    để đảm bảo code của học viên không chạy quá
                                    lâu hoặc tốn quá nhiều bộ nhớ
                                  </span>
                                </p>
                              </div>
                            )}
                        </div>
                      </div>

                      {activeExercise.testResult.details.map(
                        (detail, index) => (
                          <div
                            key={index}
                            className="border-t border-border pt-4"
                          >
                            <div className="flex items-center gap-1.5 text-primary-hover mb-2 font-semibold text-sm">
                              <Terminal className="h-3.5 w-3.5" />
                              <span>Test Case {detail.index}</span>
                            </div>
                            <div className="ml-4 space-y-2 text-sm text-foreground">
                              <div>
                                <span className="text-muted-foreground">
                                  Result:
                                </span>{" "}
                                <span
                                  className={
                                    detail.result === "passed"
                                      ? "text-success-foreground font-semibold"
                                      : "text-destructive-foreground font-semibold"
                                  }
                                >
                                  {detail.result.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Input:
                                </span>
                                <pre className="mt-1 p-2.5 bg-surface-muted/60 rounded-lg border border-border text-foreground overflow-x-auto font-mono text-sm">
                                  {detail.input || "(empty)"}
                                </pre>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Expected:
                                </span>
                                <pre className="mt-1 p-2.5 bg-success-bg rounded-lg border border-success-border text-success-foreground overflow-x-auto font-mono text-sm">
                                  {detail.expected}
                                </pre>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Output:
                                </span>
                                <pre
                                  className={`mt-1 p-2.5 rounded-lg border overflow-x-auto font-mono text-sm ${
                                    detail.result === "passed"
                                      ? "bg-success-bg border-success-border text-success-foreground"
                                      : "bg-destructive-bg border-destructive-border text-destructive-foreground"
                                  }`}
                                >
                                  {detail.output || "(empty)"}
                                </pre>
                              </div>
                              {detail.stderr && (
                                <div>
                                  <span className="text-destructive-foreground font-semibold">
                                    Error:
                                  </span>
                                  <pre className="mt-1 p-2.5 bg-destructive-bg rounded-lg border border-destructive-border text-destructive-foreground overflow-x-auto font-mono text-sm">
                                    {detail.stderr}
                                  </pre>
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                                <span>
                                  CPU:{" "}
                                  <span className="text-warning-foreground font-medium">
                                    {detail.cpu_time}ms
                                  </span>
                                </span>
                                <span>
                                  Memory:{" "}
                                  <span className="text-warning-foreground font-medium">
                                    {(detail.memory / 1000000).toFixed(2)} MB
                                  </span>
                                </span>
                                <span>
                                  Exit Code:{" "}
                                  <span
                                    className={
                                      detail.exit_code === 0
                                        ? "text-success-foreground font-medium"
                                        : "text-destructive-foreground font-medium"
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
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Code mẫu (Starter Code)
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Code ban đầu để học viên có thể viết thêm vào. Tên file và
                      main file được đồng bộ tự động từ Code Files (không thể
                      sửa tên file).
                    </p>
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden bg-surface">
                    {/* Tabs */}
                    <div className="bg-surface-muted/70 border-b border-border">
                      <div className="flex items-center overflow-x-auto">
                        {activeExercise.starterCodeFiles.map((file) => (
                          <div
                            key={file.id}
                            className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer border-r border-border transition-colors min-w-[150px] ${
                              activeExercise.activeStarterFileId === file.id
                                ? "bg-surface border-t-2 border-t-primary text-foreground"
                                : "bg-surface-muted/50 hover:bg-surface-muted text-muted-foreground"
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
                            <Code2
                              className={`h-4 w-4 flex-shrink-0 ${
                                activeExercise.activeStarterFileId === file.id
                                  ? "text-primary-hover"
                                  : "text-subtle-foreground"
                              }`}
                            />
                            <span className="text-sm font-medium truncate flex-1">
                              {file.filename}
                            </span>
                            {file.is_main && (
                              <Badge
                                variant="primary"
                                size="sm"
                                className="flex-shrink-0"
                              >
                                Main
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex" style={{ minHeight: "300px" }}>
                      {/* Sidebar */}
                      <div className="w-64 bg-surface-muted/50 border-r border-border flex flex-col">
                        <div className="px-4 py-3 bg-surface border-b border-border">
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
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
                                    ? "bg-primary-light/70 text-foreground border-r-2 border-r-primary"
                                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
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
                                <Code2
                                  className={`h-4 w-4 flex-shrink-0 ${
                                    activeExercise.activeStarterFileId ===
                                    file.id
                                      ? "text-primary-hover"
                                      : "text-subtle-foreground"
                                  }`}
                                />
                                <span className="text-sm truncate flex-1">
                                  {file.filename}
                                </span>
                                {file.is_main && (
                                  <Badge
                                    variant="primary"
                                    size="sm"
                                    className="flex-shrink-0"
                                  >
                                    M
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="px-4 py-2 border-t border-border">
                            <div className="text-xs text-muted-foreground italic">
                              Tên file và main file được đồng bộ tự động từ Code
                              Files
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Code Editor */}
                      <div className="flex-1 flex flex-col bg-surface">
                        <div className="bg-surface-muted/70 border-b border-border px-4 py-2 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground font-medium truncate">
                            {activeStarterFile?.filename || "No file selected"}
                          </span>
                          <Button
                            type="button"
                            variant="pastel"
                            size="sm"
                            onClick={handleInsertStarterTemplate}
                            disabled={!selectedLang}
                            leftIcon={<Zap className="h-3.5 w-3.5" />}
                            title="Insert Template"
                          >
                            Template
                          </Button>
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
                    <label className="block text-sm font-semibold text-foreground">
                      Test Cases{" "}
                      <span className="text-destructive-foreground">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addTestCase();
                      }}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Thêm test case
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {activeExercise.testCases.map((testCase, index) => (
                      <div
                        key={testCase.id}
                        className="bg-surface-muted/50 border border-border rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-foreground">
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
                                className="w-4 h-4 accent-primary rounded cursor-pointer"
                              />
                              <span className="text-sm text-foreground">
                                Sample
                              </span>
                            </label>
                            {activeExercise.testCases.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTestCase(testCase.id)}
                                className="p-1.5 rounded-lg text-destructive-foreground hover:bg-destructive-bg transition-colors cursor-pointer"
                                title="Xóa test case"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Input
                          </label>
                          <div
                            className="border border-border rounded-xl overflow-hidden bg-surface"
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
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Expected Output{" "}
                            <span className="text-destructive-foreground">*</span>
                          </label>
                          <div
                            className="border border-border rounded-xl overflow-hidden bg-surface"
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
          </Card>

          {/* Navigation Buttons */}
          <Card className="p-6 flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || isCreating || isUploading}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Quay lại
            </Button>

            {currentStep < totalSteps - 1 ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleNext}
                disabled={isCreating || isUploading}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Tiếp theo
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {!canComplete.canComplete && (
                  <Alert variant="warning" className="text-sm">
                    {canComplete.reason}
                  </Alert>
                )}
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCreateLesson}
                  disabled={
                    isCreating || isUploading || !canComplete.canComplete
                  }
                  isLoading={isCreating || isUploading}
                  loadingText="Đang xử lý..."
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  title={
                    !canComplete.canComplete
                      ? canComplete.reason ||
                        "Vui lòng test tất cả bài code và đảm bảo không có thay đổi sau khi test"
                      : undefined
                  }
                >
                  Hoàn tất
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateCodeLesson;
