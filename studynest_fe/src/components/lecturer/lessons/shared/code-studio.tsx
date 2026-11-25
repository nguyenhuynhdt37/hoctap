"use client";

import CodeEditor from "@/components/shared/code-editor";
import TiptapEditor from "@/components/shared/tiptap_editor";
import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  CodeExercise,
  CodeFile,
  CodeLanguage,
  TestResult,
} from "@/types/lecturer/lesson-api";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Cpu,
  Eye,
  FileCode2,
  FolderOpen,
  Layers,
  Pencil,
  Play,
  Plus,
  Save,
  Star,
  Terminal,
  Trash2,
  Video,
  X,
  XCircle,
  Zap,
} from "pulsoicon-react";
import { useEffect, useMemo, useRef, useState } from "react";

// ============================================
// HELPERS & UTILITIES
// ============================================

export function getCodeFileExtension(languageName: string): string {
  const name = (languageName || "").toLowerCase();
  if (name.includes("python")) return "py";
  if (name.includes("typescript")) return "ts";
  if (name.includes("javascript") || name === "js" || name.includes("node"))
    return "js";
  if (name.includes("c++") || name.includes("cpp")) return "cpp";
  if (name === "c" || name.startsWith("c ")) return "c";
  if (name.includes("java")) return "java";
  if (name.includes("go")) return "go";
  if (name.includes("rust")) return "rs";
  if (name.includes("c#") || name.includes("csharp")) return "cs";
  if (name.includes("php")) return "php";
  if (name.includes("ruby")) return "rb";
  return "py";
}

export function getMonacoLanguage(languageName: string): string {
  const name = (languageName || "").toLowerCase();
  if (name.includes("python")) return "python";
  if (name.includes("typescript")) return "typescript";
  if (name.includes("javascript") || name === "js" || name.includes("node"))
    return "javascript";
  if (name.includes("c++") || name.includes("cpp")) return "cpp";
  if (name === "c" || name.startsWith("c ")) return "c";
  if (name.includes("java")) return "java";
  if (name.includes("go")) return "go";
  if (name.includes("rust")) return "rust";
  if (name.includes("c#") || name.includes("csharp")) return "csharp";
  if (name.includes("php")) return "php";
  if (name.includes("ruby")) return "ruby";
  return "python";
}

export function getCodeTemplate(languageName: string): string {
  const ext = getCodeFileExtension(languageName);
  switch (ext) {
    case "py":
      return `import sys\n\ndef solve():\n    data = sys.stdin.read().strip().split()\n    if not data:\n        return\n    # Viết lời giải tại đây\n    print(data[0])\n\nif __name__ == "__main__":\n    solve()\n`;
    case "js":
    case "ts":
      return `const fs = require("fs");\nconst input = fs.readFileSync(0, "utf8").trim().split(/\\s+/);\n// Viết lời giải tại đây\nconsole.log(input[0] || "");\n`;
    case "cpp":
      return `#include <iostream>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // Viết lời giải tại đây\n    return 0;\n}\n`;
    case "c":
      return `#include <stdio.h>\n\nint main() {\n    // Viết lời giải tại đây\n    return 0;\n}\n`;
    case "java":
      return `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Viết lời giải tại đây\n    }\n}\n`;
    default:
      return `// Viết mã nguồn tại đây\n`;
  }
}

export function cleanCodeDescription(raw: string): string {
  return (raw || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function createExerciseSnapshot(
  ex: CodeExercise,
  languageId: string
): string {
  return JSON.stringify({
    languageId,
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
}

export function createEmptyCodeExercise(extension = "py"): CodeExercise {
  const uid = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const fileId = `file-${uid}`;
  const starterId = `starter-${uid}`;
  const testId = `test-${uid}`;
  return {
    id: `exercise-${uid}`,
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
        is_sample: true,
      },
    ],
    activeFileId: fileId,
    activeStarterFileId: starterId,
    renamingFileId: null,
    renameValue: "",
    testResult: null,
    lastTestedSnapshot: null,
  };
}

export function getExerciseIssues(
  ex: CodeExercise,
  languageId: string,
  requirePassedTest: boolean
): string[] {
  const issues: string[] = [];
  if (!ex.title.trim()) issues.push("Chưa có tiêu đề bài tập");
  if (!cleanCodeDescription(ex.description)) issues.push("Chưa có đề bài");
  if (ex.codeFiles.length === 0 || !ex.codeFiles.some((f) => f.content.trim())) {
    issues.push("Chưa có mã lời giải mẫu");
  }
  if (ex.testCases.length === 0) {
    issues.push("Cần ít nhất 1 test case");
  } else if (ex.testCases.some((t) => !t.expected_output.trim())) {
    issues.push("Có test case thiếu Expected Output");
  }
  if (requirePassedTest) {
    const snap = createExerciseSnapshot(ex, languageId);
    const passed =
      ex.testResult?.status === "passed" &&
      ex.testResult.passed === ex.testResult.total &&
      ex.testResult.total > 0 &&
      ex.lastTestedSnapshot === snap;
    if (!passed) {
      issues.push("Cần chạy kiểm thử đạt 100% PASS");
    }
  }
  return issues;
}

// ============================================
// PROPS
// ============================================

export interface CodeStudioProps {
  mode: "create" | "edit";
  sectionName?: string;
  lessonTitle: string;
  onLessonTitleChange: (title: string) => void;
  selectedLanguageId: string;
  onLanguageChange: (languageId: string) => void;
  codeLanguages: CodeLanguage[];
  isLoadingLanguages?: boolean;
  exercises: CodeExercise[];
  onExercisesChange: (updater: (prev: CodeExercise[]) => CodeExercise[]) => void;
  videoSections: StudioVideoSectionGroup[];
  isSubmitting: boolean;
  hasChanges?: boolean;
  canSaveReason?: string | null;
  error: string | null;
  onClearError?: () => void;
  successBanner?: {
    title: string;
    description: string;
    lessonId?: string | null;
  } | null;
  onSubmit: () => Promise<void> | void;
  onBackToChapters: () => void;
  onOpenResources?: (lessonId: string) => void;
  onOpenEdit?: (lessonId: string) => void;
  onOpenPreview?: (lessonId: string) => void;
}

const DIFFICULTY_META: Record<
  "easy" | "medium" | "hard",
  { label: string; short: string; cls: string }
> = {
  easy: {
    label: "Dễ",
    short: "Dễ",
    cls: "bg-success-bg text-success-foreground border-success-border",
  },
  medium: {
    label: "Trung bình",
    short: "TB",
    cls: "bg-warning-bg text-warning-foreground border-warning-border",
  },
  hard: {
    label: "Khó",
    short: "Khó",
    cls: "bg-secondary-light text-secondary-foreground border-secondary-pastel",
  },
};

// ============================================
// MAIN STUDIO COMPONENT
// ============================================

export function CodeStudio({
  mode,
  sectionName,
  lessonTitle,
  onLessonTitleChange,
  selectedLanguageId,
  onLanguageChange,
  codeLanguages,
  isLoadingLanguages = false,
  exercises,
  onExercisesChange,
  videoSections,
  isSubmitting,
  hasChanges = true,
  canSaveReason = null,
  error,
  onClearError,
  successBanner,
  onSubmit,
  onBackToChapters,
  onOpenResources,
  onOpenEdit,
  onOpenPreview,
}: CodeStudioProps) {
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [infoExpanded, setInfoExpanded] = useState(mode === "create");
  const [codeTab, setCodeTab] = useState<"solution" | "starter">("solution");
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);
  const [aiScopeMode, setAiScopeMode] = useState<"single" | "multiple" | "chapter">(
    "multiple"
  );
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [aiApplyMode, setAiApplyMode] = useState<"append" | "replace">("append");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const aiPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (exercises.length === 0) {
      setActiveExerciseIndex(0);
    } else if (activeExerciseIndex >= exercises.length) {
      setActiveExerciseIndex(exercises.length - 1);
    }
  }, [exercises.length, activeExerciseIndex]);

  const allVideoLessons = useMemo(
    () => videoSections.flatMap((g) => g.videos),
    [videoSections]
  );

  const selectedLang = useMemo(
    () => codeLanguages.find((l) => l.id === selectedLanguageId) || null,
    [codeLanguages, selectedLanguageId]
  );
  const monacoLang = getMonacoLanguage(selectedLang?.name || "python");
  const fileExt = getCodeFileExtension(selectedLang?.name || "python");

  const activeExercise = exercises[activeExerciseIndex] ?? null;

  const updateCurrentExercise = (updater: (ex: CodeExercise) => CodeExercise) => {
    onExercisesChange((prev) =>
      prev.map((item, idx) => (idx === activeExerciseIndex ? updater(item) : item))
    );
  };

  // Kiểm tra sức khỏe toàn bộ bài học
  const stats = useMemo(() => {
    const total = exercises.length;
    const perExercise = exercises.map((ex) => {
      const snap = createExerciseSnapshot(ex, selectedLanguageId);
      const isFreshPass =
        ex.testResult?.status === "passed" &&
        ex.testResult.passed === ex.testResult.total &&
        ex.testResult.total > 0 &&
        ex.lastTestedSnapshot === snap;
      const isFailed =
        ex.testResult &&
        (ex.testResult.status !== "passed" ||
          ex.testResult.passed < ex.testResult.total);
      const issues = getExerciseIssues(ex, selectedLanguageId, mode === "create");
      return { isFreshPass, isFailed, issues };
    });

    const passedCount = perExercise.filter((p) => p.isFreshPass).length;
    const contentReadyCount = exercises.filter(
      (ex) => getExerciseIssues(ex, selectedLanguageId, false).length === 0
    ).length;

    const hasTitle = lessonTitle.trim().length > 0;
    const hasLang = Boolean(selectedLanguageId);
    const readinessPercent = Math.min(
      100,
      (hasTitle ? 15 : 0) +
        (hasLang ? 15 : 0) +
        (total > 0 ? Math.round((contentReadyCount / total) * 35) : 0) +
        (total > 0 ? Math.round((passedCount / total) * 35) : 0)
    );
    const firstIssueIdx = perExercise.findIndex((p) => p.issues.length > 0);

    return {
      total,
      passedCount,
      contentReadyCount,
      hasTitle,
      hasLang,
      readinessPercent,
      perExercise,
      firstIssueIdx,
    };
  }, [exercises, selectedLanguageId, lessonTitle, mode]);

  // ============================================
  // AI HANDLERS
  // ============================================

  const handleToggleAiPanel = () => {
    setAiPanelExpanded((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => {
          aiPanelRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }
      return next;
    });
  };

  const handleToggleLesson = (id: string) => {
    if (aiScopeMode === "single") {
      setSelectedLessonIds([id]);
      return;
    }
    setSelectedLessonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSectionVideos = (section: StudioVideoSectionGroup) => {
    const ids = section.videos.map((v) => v.id);
    if (ids.length === 0) return;
    setSelectedLessonIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      return Array.from(new Set([...prev, ...ids]));
    });
  };

  const handleSwitchScopeMode = (nextMode: "single" | "multiple" | "chapter") => {
    setAiScopeMode(nextMode);
    if (nextMode === "single") {
      setSelectedLessonIds((prev) => (prev.length > 0 ? [prev[0]] : []));
    } else if (nextMode === "chapter") {
      setSelectedLessonIds((prev) => {
        if (prev.length > 0) return prev;
        const currentGroup =
          videoSections.find((g) => g.isCurrent) || videoSections[0];
        return currentGroup ? currentGroup.videos.map((v) => v.id) : [];
      });
    }
  };

  const handleToggleAllVideos = () => {
    if (selectedLessonIds.length === allVideoLessons.length) {
      setSelectedLessonIds([]);
    } else {
      setSelectedLessonIds(allVideoLessons.map((v) => v.id));
    }
  };

  const handleGenerateTitle = async () => {
    if (!lessonTitle.trim()) {
      showToast.error("Vui lòng nhập tiêu đề nháp trước khi nhờ AI tối ưu.");
      return;
    }
    setIsGeneratingTitle(true);
    onClearError?.();
    try {
      const response = await api.post("/lecturers/chat/lesson/rewrite_the_title", {
        title: lessonTitle.trim(),
      });
      if (typeof response.data === "string" && response.data.trim()) {
        onLessonTitleChange(response.data.trim());
        showToast.success("Đã tối ưu tiêu đề bài học bằng AI.");
      } else {
        showToast.error("AI chưa trả về tiêu đề mới. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Không thể tối ưu tiêu đề bằng AI"));
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleGenerateCodeFromVideos = async () => {
    if (selectedLessonIds.length === 0) {
      showToast.error("Vui lòng chọn ít nhất một bài học video làm ngữ cảnh.");
      return;
    }
    setIsGeneratingCode(true);
    onClearError?.();
    try {
      const response = await api.post("/lecturers/chat/lesson/code", {
        lesson_ids: selectedLessonIds,
      });
      const generated = Array.isArray(response.data) ? response.data : [];
      if (generated.length === 0) {
        showToast.error("AI chưa sinh được bài tập lập trình. Vui lòng thử lại.");
        return;
      }

      // Nếu AI trả về language_id hợp lệ, tự chọn ngôn ngữ tương ứng
      const firstLangId = generated[0]?.language_id;
      if (
        firstLangId &&
        codeLanguages.some((l) => l.id === firstLangId) &&
        (!selectedLanguageId || aiApplyMode === "replace")
      ) {
        onLanguageChange(firstLangId);
      }

      const formatted: CodeExercise[] = generated.map((ex: any, idx: number) => {
        const uid = `${Date.now().toString(36)}_${idx}_${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        const solFiles: CodeFile[] = (ex.solution_files || []).map(
          (f: any, fi: number) => ({
            id: `file-${uid}-${fi}`,
            filename: f.filename || `main.${fileExt}`,
            content: f.content || "",
            is_main: Boolean(f.is_main) || fi === 0,
          })
        );
        const startFiles: CodeFile[] = (ex.starter_files || []).map(
          (f: any, fi: number) => ({
            id: `starter-${uid}-${fi}`,
            filename: f.filename || `main.${fileExt}`,
            content: f.content || "",
            is_main: Boolean(f.is_main) || fi === 0,
          })
        );
        const tests = (ex.testcases || []).map((t: any, ti: number) => ({
          id: `test-${uid}-${ti}`,
          input: t.input || "",
          expected_output: t.expected_output || "",
          is_sample: Boolean(t.is_sample),
        }));

        const safeSol =
          solFiles.length > 0
            ? solFiles
            : [{ id: `file-${uid}-0`, filename: `main.${fileExt}`, content: "", is_main: true }];
        const safeStart =
          startFiles.length > 0
            ? startFiles
            : [{ id: `starter-${uid}-0`, filename: `main.${fileExt}`, content: "", is_main: true }];

        return {
          id: `exercise-${uid}`,
          title: ex.title || `Bài tập ${idx + 1}`,
          difficulty:
            ex.difficulty === "easy" || ex.difficulty === "hard"
              ? ex.difficulty
              : "medium",
          description: ex.description || "",
          codeFiles: safeSol,
          starterCodeFiles: safeStart,
          testCases:
            tests.length > 0
              ? tests
              : [{ id: `test-${uid}-0`, input: "", expected_output: "", is_sample: true }],
          activeFileId: safeSol.find((f) => f.is_main)?.id || safeSol[0].id,
          activeStarterFileId:
            safeStart.find((f) => f.is_main)?.id || safeStart[0].id,
          renamingFileId: null,
          renameValue: "",
          testResult: null,
          lastTestedSnapshot: null,
        };
      });

      const onlySingleEmpty =
        exercises.length === 1 &&
        !exercises[0].title.trim() &&
        !cleanCodeDescription(exercises[0].description) &&
        exercises[0].codeFiles.every((f) => !f.content.trim());

      if (aiApplyMode === "replace" || onlySingleEmpty) {
        onExercisesChange(() => formatted);
        setActiveExerciseIndex(0);
      } else {
        const nextIdx = exercises.length;
        onExercisesChange((prev) => [...prev, ...formatted]);
        setActiveExerciseIndex(nextIdx);
      }

      showToast.success(
        `Đã sinh ${formatted.length} bài tập lập trình từ ${selectedLessonIds.length} video. Hãy bấm Chạy kiểm thử để xác nhận.`
      );
      setSelectedLessonIds([]);
      setAiPanelExpanded(false);
    } catch (err: unknown) {
      showToast.error(
        formatApiError(err, "Không thể sinh bài tập lập trình từ video")
      );
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // ============================================
  // RUN TEST HANDLER
  // ============================================

  const handleRunTest = async () => {
    if (!activeExercise) return;
    if (!selectedLanguageId) {
      showToast.error("Vui lòng chọn ngôn ngữ lập trình trước khi chạy kiểm thử.");
      setInfoExpanded(true);
      return;
    }
    if (!activeExercise.codeFiles.some((f) => f.content.trim())) {
      showToast.error("Vui lòng nhập mã lời giải mẫu trước khi chạy kiểm thử.");
      setCodeTab("solution");
      return;
    }
    if (activeExercise.testCases.length === 0) {
      showToast.error("Cần ít nhất 1 test case để chạy kiểm thử.");
      return;
    }

    setIsTesting(true);
    onClearError?.();
    try {
      const payload = {
        language_id: selectedLanguageId,
        title: activeExercise.title || "Test",
        description: activeExercise.description || "",
        difficulty: activeExercise.difficulty,
        time_limit: 2,
        memory_limit: 256000000,
        files: activeExercise.codeFiles.map((f) => ({
          filename: f.filename.trim() || `main.${fileExt}`,
          content: f.content || "",
          is_main: Boolean(f.is_main),
        })),
        testcases: activeExercise.testCases.map((t, index) => ({
          input: t.input || "",
          expected_output: t.expected_output || "",
          is_sample: Boolean(t.is_sample),
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
        maxMemory = Math.max(...response.data.details.map((d) => d.memory || 0));
      }
      const timeLimit = Math.max(maxCpuTime, 500);
      const memoryLimit =
        maxMemory > 0
          ? (Math.ceil(maxMemory / (1024 * 1024)) + 1) * (1024 * 1024)
          : 256000000;

      const enriched: TestResult = {
        ...response.data,
        time_limit: timeLimit,
        memory_limit: memoryLimit,
      };
      const snap = createExerciseSnapshot(activeExercise, selectedLanguageId);

      updateCurrentExercise((ex) => ({
        ...ex,
        testResult: enriched,
        lastTestedSnapshot: snap,
      }));

      if (enriched.status === "passed" && enriched.passed === enriched.total) {
        showToast.success(
          `Bài ${activeExerciseIndex + 1} đạt 100% (${enriched.passed}/${enriched.total} test cases)!`
        );
      } else {
        showToast.error(
          `Bài ${activeExerciseIndex + 1} chỉ đạt ${enriched.passed}/${enriched.total} test cases.`
        );
      }
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Không thể chạy kiểm thử mã nguồn"));
    } finally {
      setIsTesting(false);
    }
  };

  // ============================================
  // EXERCISE / FILE / TESTCASE MUTATIONS
  // ============================================

  const handleAddExercise = () => {
    const next = createEmptyCodeExercise(fileExt);
    onExercisesChange((prev) => [...prev, next]);
    setActiveExerciseIndex(exercises.length);
  };

  const handleDuplicateExercise = () => {
    if (!activeExercise) return;
    const uid = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const sol = activeExercise.codeFiles.map((f, i) => ({
      ...f,
      id: `file-${uid}-${i}`,
    }));
    const start = activeExercise.starterCodeFiles.map((f, i) => ({
      ...f,
      id: `starter-${uid}-${i}`,
    }));
    const tests = activeExercise.testCases.map((t, i) => ({
      ...t,
      id: `test-${uid}-${i}`,
    }));
    const copy: CodeExercise = {
      ...activeExercise,
      id: `exercise-${uid}`,
      title: activeExercise.title ? `${activeExercise.title} (Bản sao)` : "",
      codeFiles: sol,
      starterCodeFiles: start,
      testCases: tests,
      activeFileId: sol[0]?.id || "",
      activeStarterFileId: start[0]?.id || "",
      testResult: null,
      lastTestedSnapshot: null,
    };
    const insertAt = activeExerciseIndex + 1;
    onExercisesChange((prev) => [
      ...prev.slice(0, insertAt),
      copy,
      ...prev.slice(insertAt),
    ]);
    setActiveExerciseIndex(insertAt);
    showToast.success(`Đã nhân bản bài ${activeExerciseIndex + 1}.`);
  };

  const handleRemoveExercise = () => {
    if (exercises.length <= 1) {
      showToast.error("Bài học lập trình cần ít nhất 1 bài tập.");
      return;
    }
    const nextIdx = Math.max(0, activeExerciseIndex - 1);
    onExercisesChange((prev) =>
      prev.filter((_, idx) => idx !== activeExerciseIndex)
    );
    setActiveExerciseIndex(nextIdx);
  };

  const activeFiles =
    codeTab === "solution"
      ? activeExercise?.codeFiles || []
      : activeExercise?.starterCodeFiles || [];
  const activeFileId =
    codeTab === "solution"
      ? activeExercise?.activeFileId || activeFiles[0]?.id || ""
      : activeExercise?.activeStarterFileId || activeFiles[0]?.id || "";
  const activeFile =
    activeFiles.find((f) => f.id === activeFileId) || activeFiles[0] || null;

  const setActiveFileIdForTab = (fileId: string) => {
    updateCurrentExercise((ex) =>
      codeTab === "solution"
        ? { ...ex, activeFileId: fileId }
        : { ...ex, activeStarterFileId: fileId }
    );
  };

  const updateFilesForTab = (updater: (files: CodeFile[]) => CodeFile[]) => {
    updateCurrentExercise((ex) =>
      codeTab === "solution"
        ? { ...ex, codeFiles: updater(ex.codeFiles) }
        : { ...ex, starterCodeFiles: updater(ex.starterCodeFiles) }
    );
  };

  const handleAddFile = () => {
    const newId = `${codeTab === "solution" ? "file" : "starter"}-${Date.now()}`;
    const filename = `helper_${activeFiles.length}.${fileExt}`;
    updateFilesForTab((files) => [
      ...files,
      { id: newId, filename, content: "", is_main: false },
    ]);
    setActiveFileIdForTab(newId);
  };

  const handleRemoveFile = (fileId: string) => {
    if (activeFiles.length <= 1) {
      showToast.error("Cần ít nhất 1 tệp mã nguồn.");
      return;
    }
    updateFilesForTab((files) => {
      const next = files.filter((f) => f.id !== fileId);
      if (!next.some((f) => f.is_main) && next.length > 0) {
        next[0] = { ...next[0], is_main: true };
      }
      if (activeFileId === fileId && next[0]) {
        setActiveFileIdForTab(next[0].id);
      }
      return next;
    });
  };

  const handleSetMainFile = (fileId: string) => {
    updateFilesForTab((files) =>
      files.map((f) => ({ ...f, is_main: f.id === fileId }))
    );
  };

  const handleCopySolutionToStarter = () => {
    if (!activeExercise) return;
    const uid = Date.now().toString(36);
    const copied = activeExercise.codeFiles.map((f, idx) => ({
      id: `starter-${uid}-${idx}`,
      filename: f.filename,
      content: `// Khung mã khởi đầu cho ${f.filename}\n`,
      is_main: f.is_main,
    }));
    updateCurrentExercise((ex) => ({
      ...ex,
      starterCodeFiles: copied,
      activeStarterFileId: copied.find((f) => f.is_main)?.id || copied[0]?.id || "",
    }));
    setCodeTab("starter");
    showToast.success("Đã tạo khung tệp Mã khởi đầu theo cấu trúc Lời giải mẫu.");
  };

  const handleAddTestCase = () => {
    updateCurrentExercise((ex) => ({
      ...ex,
      testCases: [
        ...ex.testCases,
        {
          id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          input: "",
          expected_output: "",
          is_sample: false,
        },
      ],
    }));
  };

  const handleRemoveTestCase = (tcId: string) => {
    if (!activeExercise || activeExercise.testCases.length <= 1) {
      showToast.error("Mỗi bài tập cần ít nhất 1 test case.");
      return;
    }
    updateCurrentExercise((ex) => ({
      ...ex,
      testCases: ex.testCases.filter((t) => t.id !== tcId),
    }));
  };

  // Ring SVG
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (stats.readinessPercent / 100) * ringCircumference;

  const activeTestState = stats.perExercise[activeExerciseIndex];
  const activeResult = activeExercise?.testResult || null;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ── HEADER CODE STUDIO (CLOUDY BLUE PASTEL) ── */}
      <div className="border-b border-border bg-gradient-to-b from-primary-light/60 via-surface to-surface">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={onBackToChapters}
                className="mb-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Quay lại Chương &amp; bài học
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <Code2 className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <h1 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">
                  {lessonTitle.trim() ||
                    (mode === "create"
                      ? "Xưởng soạn bài Lập trình mới"
                      : "Chỉnh sửa bài Lập trình")}
                </h1>
                {sectionName && (
                  <Badge variant="primary" size="sm">
                    Chương: {sectionName}
                  </Badge>
                )}
                {selectedLang && (
                  <Badge variant="lavender" size="sm">
                    {selectedLang.name}
                    {selectedLang.version ? ` ${selectedLang.version}` : ""}
                  </Badge>
                )}
                {mode === "edit" && (
                  <Badge variant={hasChanges ? "warning" : "success"} size="sm">
                    {hasChanges ? "Có thay đổi chưa lưu" : "Đã đồng bộ"}
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                Soạn đề bài, mã lời giải mẫu, khung khởi đầu và chạy kiểm thử trực tiếp test cases ngay trên một không gian thống nhất.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {allVideoLessons.length > 0 && (
                <Button
                  type="button"
                  variant={aiPanelExpanded ? "primary" : "pastel"}
                  size="sm"
                  onClick={handleToggleAiPanel}
                  leftIcon={<Bot className="h-4 w-4" aria-hidden="true" />}
                >
                  {aiPanelExpanded
                    ? `Đang chọn Video AI (${allVideoLessons.length})`
                    : `AI sinh từ Video (${allVideoLessons.length})`}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRunTest}
                disabled={isTesting || !activeExercise}
                isLoading={isTesting}
                loadingText="Đang chạy..."
                leftIcon={<Play className="h-4 w-4" aria-hidden="true" />}
              >
                Chạy kiểm thử
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void onSubmit()}
                disabled={
                  isSubmitting ||
                  (mode === "edit" && !hasChanges) ||
                  Boolean(canSaveReason)
                }
                isLoading={isSubmitting}
                loadingText={mode === "create" ? "Đang tạo..." : "Đang lưu..."}
                leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
              >
                {mode === "create" ? "Tạo bài Lập trình" : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE 2 CỘT ── */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {successBanner && (
          <div className="mb-5">
            <Alert variant="success" title={successBanner.title}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">{successBanner.description}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {successBanner.lessonId && onOpenPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                      onClick={() => onOpenPreview(successBanner.lessonId!)}
                    >
                      Xem trước
                    </Button>
                  )}
                  {successBanner.lessonId && onOpenEdit && mode === "create" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenEdit(successBanner.lessonId!)}
                    >
                      Mở trang chỉnh sửa
                    </Button>
                  )}
                  {successBanner.lessonId && onOpenResources && (
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      leftIcon={<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />}
                      onClick={() => onOpenResources(successBanner.lessonId!)}
                    >
                      Tài nguyên
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={onBackToChapters}
                  >
                    Về Chương &amp; bài học
                  </Button>
                </div>
              </div>
            </Alert>
          </div>
        )}

        {error && (
          <div className="mb-5">
            <Alert variant="destructive" title="Có lỗi xảy ra">
              {error}
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── CỘT TRÁI (8/12): AI + THÔNG TIN + BÀI TẬP + CODE + TEST CASES ── */}
          <div className="space-y-5 lg:col-span-8">
            {/* BẢNG AI SINH BÀI CODE TỪ VIDEO ĐÃ EMBEDDING */}
            {allVideoLessons.length > 0 && aiPanelExpanded && (
              <div ref={aiPanelRef}>
                <Card
                  variant="pastel-blue"
                  className="border-2 border-primary-pastel p-5 shadow-sm"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                        <Bot className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          AI sinh bài tập Lập trình từ bài giảng Video
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Chỉ hiển thị video đã có chỉ mục AI. Chọn 1 bài, một vài bài hoặc cả chương để AI sinh đề bài, lời giải mẫu và test cases.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {aiScopeMode !== "single" && (
                        <button
                          type="button"
                          onClick={handleToggleAllVideos}
                          className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                        >
                          {selectedLessonIds.length === allVideoLessons.length
                            ? "Bỏ chọn tất cả"
                            : `Chọn tất cả (${allVideoLessons.length})`}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setAiPanelExpanded(false)}
                        aria-label="Đóng bảng AI sinh bài code"
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-primary-pastel bg-surface text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Bộ chọn phạm vi */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-primary-pastel bg-surface p-1 text-xs">
                      {[
                        { id: "single", label: "Theo 1 bài" },
                        { id: "multiple", label: "Một vài bài" },
                        { id: "chapter", label: "Cả chương" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            handleSwitchScopeMode(
                              opt.id as "single" | "multiple" | "chapter"
                            )
                          }
                          className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                            aiScopeMode === opt.id
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Đã chọn{" "}
                      <strong className="text-primary">
                        {selectedLessonIds.length}
                      </strong>{" "}
                      video
                    </span>
                  </div>

                  {aiScopeMode === "chapter" ? (
                    <div className="mb-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {videoSections.map((group) => {
                        const groupIds = group.videos.map((v) => v.id);
                        const selectedInGroup = groupIds.filter((id) =>
                          selectedLessonIds.includes(id)
                        ).length;
                        const allSelected =
                          groupIds.length > 0 && selectedInGroup === groupIds.length;
                        return (
                          <button
                            key={group.sectionId}
                            type="button"
                            onClick={() => handleToggleSectionVideos(group)}
                            className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                              allSelected
                                ? "border-primary bg-surface shadow-xs"
                                : "border-border bg-surface/85 hover:border-primary-pastel"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                  allSelected
                                    ? "border-primary bg-primary text-white"
                                    : "border-border bg-surface"
                                }`}
                              >
                                {allSelected && (
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-foreground">
                                    {group.sectionTitle}
                                  </span>
                                  {group.isCurrent && (
                                    <Badge variant="primary" size="sm">
                                      Chương hiện tại
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {group.videos.length} video đã có chỉ mục AI
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-primary">
                              {allSelected ? "Bỏ chọn" : "Chọn cả chương"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mb-4 max-h-60 space-y-3 overflow-y-auto pr-1">
                      {videoSections.map((group) => {
                        const groupIds = group.videos.map((v) => v.id);
                        const allGroupSelected =
                          groupIds.length > 0 &&
                          groupIds.every((id) => selectedLessonIds.includes(id));
                        return (
                          <div key={group.sectionId} className="space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {group.sectionTitle}
                                </span>
                                {group.isCurrent && (
                                  <Badge variant="primary" size="sm">
                                    Chương hiện tại
                                  </Badge>
                                )}
                              </div>
                              {aiScopeMode === "multiple" && group.videos.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSectionVideos(group)}
                                  className="cursor-pointer text-[11px] font-semibold text-primary hover:underline"
                                >
                                  {allGroupSelected
                                    ? "Bỏ chọn chương này"
                                    : `Chọn cả chương (${group.videos.length})`}
                                </button>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {group.videos.map((lesson) => {
                                const checked = selectedLessonIds.includes(lesson.id);
                                return (
                                  <label
                                    key={lesson.id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all ${
                                      checked
                                        ? "border-primary bg-surface shadow-xs"
                                        : "border-border bg-surface/80 hover:border-primary-pastel"
                                    }`}
                                  >
                                    <input
                                      type={
                                        aiScopeMode === "single"
                                          ? "radio"
                                          : "checkbox"
                                      }
                                      name={
                                        aiScopeMode === "single"
                                          ? "ai-code-single-video"
                                          : undefined
                                      }
                                      checked={checked}
                                      onChange={() => handleToggleLesson(lesson.id)}
                                      className="h-4 w-4 cursor-pointer border-border text-primary focus:ring-primary"
                                    />
                                    <Video
                                      className="h-4 w-4 shrink-0 text-primary"
                                      aria-hidden="true"
                                    />
                                    <span className="flex-1 truncate text-sm font-medium text-foreground">
                                      {lesson.title}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 border-t border-primary-pastel/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex rounded-xl border border-primary-pastel bg-surface p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setAiApplyMode("append")}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                          aiApplyMode === "append"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Nối thêm bài tập
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiApplyMode("replace")}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                          aiApplyMode === "replace"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Thay thế bộ hiện tại
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleGenerateCodeFromVideos}
                      disabled={isGeneratingCode || selectedLessonIds.length === 0}
                      isLoading={isGeneratingCode}
                      loadingText="AI đang sinh bài code..."
                      leftIcon={<Bot className="h-4 w-4" aria-hidden="true" />}
                    >
                      Sinh bài tập ({selectedLessonIds.length} video)
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* KHỐI 1: THÔNG TIN CHUNG & NGÔN NGỮ */}
            <Card className="overflow-hidden border border-border bg-surface shadow-xs">
              <button
                type="button"
                onClick={() => setInfoExpanded((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors hover:bg-primary-light/25"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
                    <Terminal className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground sm:text-base">
                      Thông tin bài học &amp; Ngôn ngữ lập trình
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {stats.hasTitle && stats.hasLang
                        ? `${lessonTitle.trim()} · ${selectedLang?.name || "Đã chọn ngôn ngữ"}`
                        : "Nhập tiêu đề bài học và chọn ngôn ngữ chạy chấm điểm"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={stats.hasTitle && stats.hasLang ? "success" : "warning"}
                    size="sm"
                  >
                    {stats.hasTitle && stats.hasLang ? "Đầy đủ" : "Cần bổ sung"}
                  </Badge>
                  {infoExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
              </button>

              {infoExpanded && (
                <div className="grid grid-cols-1 gap-4 border-t border-border p-5 sm:grid-cols-12">
                  <div className="sm:col-span-7">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="text-sm font-semibold text-foreground">
                        Tiêu đề bài học <span className="text-destructive">*</span>
                      </label>
                      <Button
                        type="button"
                        variant="pastel"
                        size="sm"
                        onClick={handleGenerateTitle}
                        disabled={isGeneratingTitle || !lessonTitle.trim()}
                        isLoading={isGeneratingTitle}
                        loadingText="Đang tối ưu..."
                        leftIcon={<Bot className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        AI tối ưu
                      </Button>
                    </div>
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={(e) => onLessonTitleChange(e.target.value)}
                      placeholder="Ví dụ: Thực hành Thuật toán Tìm kiếm nhị phân"
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="mb-2 block text-sm font-semibold text-foreground">
                      Ngôn ngữ chấm điểm <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={selectedLanguageId}
                      onChange={(e) => onLanguageChange(e.target.value)}
                      disabled={isLoadingLanguages}
                      className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">
                        {isLoadingLanguages
                          ? "Đang tải ngôn ngữ..."
                          : "-- Chọn ngôn ngữ --"}
                      </option>
                      {codeLanguages.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.name}
                          {lang.version ? ` (${lang.version})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </Card>

            {/* KHỐI 2: DẢI ĐIỀU HƯỚNG BÀI TẬP */}
            <Card className="border border-border bg-surface p-4 shadow-xs">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-foreground">
                    Danh sách bài tập ({exercises.length})
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    · {stats.passedCount}/{stats.total} bài đã PASS kiểm thử
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDuplicateExercise}
                    disabled={!activeExercise}
                    leftIcon={<Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    className="h-8"
                  >
                    Nhân bản
                  </Button>
                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    onClick={handleAddExercise}
                    leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                    className="h-8"
                  >
                    Thêm bài tập
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {exercises.map((ex, idx) => {
                  const isActive = idx === activeExerciseIndex;
                  const state = stats.perExercise[idx];
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setActiveExerciseIndex(idx)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : state?.isFreshPass
                            ? "border-success-border bg-success-bg/70 text-success-foreground hover:bg-success-bg"
                            : state?.isFailed
                              ? "border-destructive-border bg-destructive-bg/70 text-destructive-foreground"
                              : "border-border bg-surface text-foreground hover:border-primary-pastel"
                      }`}
                    >
                      <span>Bài {idx + 1}</span>
                      {state?.isFreshPass && (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {state?.isFailed && !isActive && (
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* KHỐI 3: BIÊN TẬP BÀI TẬP HIỆN TẠI */}
            {activeExercise && (
              <div className="space-y-5">
                {/* 3A: Đề bài & Độ khó */}
                <Card className="border border-border bg-surface p-5 shadow-xs">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-sm font-bold text-primary">
                        {activeExerciseIndex + 1}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          Đề bài tập {activeExerciseIndex + 1}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Mô tả rõ yêu cầu đầu vào, đầu ra và ràng buộc dữ liệu.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-xl border border-border bg-background p-1">
                        {(["easy", "medium", "hard"] as const).map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() =>
                              updateCurrentExercise((ex) => ({
                                ...ex,
                                difficulty: diff,
                              }))
                            }
                            className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                              activeExercise.difficulty === diff
                                ? "bg-surface text-primary shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {DIFFICULTY_META[diff].label}
                          </button>
                        ))}
                      </div>

                      {exercises.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveExercise}
                          aria-label={`Xóa bài tập ${activeExerciseIndex + 1}`}
                          className="h-8 px-2.5 text-destructive-foreground hover:bg-destructive-bg"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-foreground">
                        Tên bài tập <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={activeExercise.title}
                        onChange={(e) =>
                          updateCurrentExercise((ex) => ({
                            ...ex,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Ví dụ: Tính tổng hai số nguyên dương"
                        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-foreground">
                        Nội dung đề bài <span className="text-destructive">*</span>
                      </label>
                      <div className="overflow-hidden rounded-xl border border-border bg-surface">
                        <TiptapEditor
                          key={`code-desc-${activeExercise.id}`}
                          value={activeExercise.description}
                          onChange={(markdown) =>
                            updateCurrentExercise((ex) => ({
                              ...ex,
                              description: markdown,
                            }))
                          }
                          placeholder="Mô tả yêu cầu bài toán, định dạng Input/Output và ví dụ minh họa..."
                          minHeight="140px"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 3B: Trình soạn Mã nguồn (Solution / Starter) */}
                <Card className="overflow-hidden border border-border bg-surface shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary-light/30 px-4 py-3">
                    <div className="inline-flex rounded-xl border border-primary-pastel bg-surface p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setCodeTab("solution")}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                          codeTab === "solution"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Lời giải mẫu ({activeExercise.codeFiles.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCodeTab("starter")}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                          codeTab === "starter"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Mã khởi đầu ({activeExercise.starterCodeFiles.length})
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {codeTab === "solution" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopySolutionToStarter}
                          className="h-8 text-xs"
                        >
                          Tạo khung Starter
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="pastel"
                        size="sm"
                        onClick={() => {
                          if (!activeFile) return;
                          const tpl = getCodeTemplate(selectedLang?.name || "python");
                          updateFilesForTab((files) =>
                            files.map((f) =>
                              f.id === activeFile.id ? { ...f, content: tpl } : f
                            )
                          );
                        }}
                        leftIcon={<Zap className="h-3.5 w-3.5" aria-hidden="true" />}
                        className="h-8 text-xs"
                      >
                        Chèn mẫu
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddFile}
                        leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                        className="h-8 text-xs"
                      >
                        Thêm tệp
                      </Button>
                    </div>
                  </div>

                  {/* File tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-background/60 px-3 py-2">
                    {activeFiles.map((file) => {
                      const isCurrent = file.id === activeFile?.id;
                      const isRenaming = activeExercise.renamingFileId === file.id;
                      return (
                        <div
                          key={file.id}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                            isCurrent
                              ? "border-primary bg-surface text-primary shadow-xs"
                              : "border-border bg-surface/70 text-foreground hover:border-primary-pastel"
                          }`}
                        >
                          <FileCode2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {isRenaming ? (
                            <input
                              type="text"
                              autoFocus
                              value={activeExercise.renameValue}
                              onChange={(e) =>
                                updateCurrentExercise((ex) => ({
                                  ...ex,
                                  renameValue: e.target.value,
                                }))
                              }
                              onBlur={() => {
                                const trimmed = activeExercise.renameValue.trim();
                                if (trimmed) {
                                  updateFilesForTab((files) =>
                                    files.map((f) =>
                                      f.id === file.id ? { ...f, filename: trimmed } : f
                                    )
                                  );
                                }
                                updateCurrentExercise((ex) => ({
                                  ...ex,
                                  renamingFileId: null,
                                  renameValue: "",
                                }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="w-28 rounded border border-primary bg-surface px-1.5 py-0.5 text-xs focus:outline-none"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveFileIdForTab(file.id)}
                              className="cursor-pointer"
                            >
                              {file.filename}
                            </button>
                          )}

                          {file.is_main ? (
                            <span
                              title="Tệp chạy chính (main)"
                              className="rounded bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary"
                            >
                              main
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetMainFile(file.id)}
                              title="Đặt làm tệp chạy chính"
                              className="cursor-pointer text-muted-foreground hover:text-primary"
                            >
                              <Star className="h-3 w-3" aria-hidden="true" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              updateCurrentExercise((ex) => ({
                                ...ex,
                                renamingFileId: file.id,
                                renameValue: file.filename,
                              }))
                            }
                            aria-label={`Đổi tên tệp ${file.filename}`}
                            className="cursor-pointer text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="h-3 w-3" aria-hidden="true" />
                          </button>

                          {activeFiles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(file.id)}
                              aria-label={`Xóa tệp ${file.filename}`}
                              className="cursor-pointer text-muted-foreground hover:text-destructive-foreground"
                            >
                              <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Monaco Code Editor */}
                  {activeFile && (
                    <div className="h-[340px] w-full">
                      <CodeEditor
                        key={`${codeTab}-${activeExercise.id}-${activeFile.id}-${monacoLang}`}
                        height="340px"
                        language={monacoLang}
                        value={activeFile.content || ""}
                        onChange={(val) => {
                          const content = val ?? "";
                          updateFilesForTab((files) =>
                            files.map((f) =>
                              f.id === activeFile.id ? { ...f, content } : f
                            )
                          );
                        }}
                      />
                    </div>
                  )}
                </Card>

                {/* 3C: Bộ kiểm thử Test Cases */}
                <Card className="border border-border bg-surface p-5 shadow-xs">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        Bộ kiểm thử (Test Cases · {activeExercise.testCases.length})
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Đánh dấu &ldquo;Test mẫu&rdquo; cho các bộ dữ liệu hiển thị công khai giúp học viên hiểu định dạng vào/ra.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      onClick={handleAddTestCase}
                      leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                    >
                      Thêm test case
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {activeExercise.testCases.map((tc, tcIdx) => (
                      <div
                        key={tc.id}
                        className="rounded-xl border border-border bg-background/50 p-4"
                      >
                        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary-light text-xs font-bold text-primary">
                              {tcIdx + 1}
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              Test Case #{tcIdx + 1}
                            </span>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={Boolean(tc.is_sample)}
                                onChange={(e) =>
                                  updateCurrentExercise((ex) => ({
                                    ...ex,
                                    testCases: ex.testCases.map((item) =>
                                      item.id === tc.id
                                        ? { ...item, is_sample: e.target.checked }
                                        : item
                                    ),
                                  }))
                                }
                                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                              />
                              Test mẫu (hiển thị với học viên)
                            </label>
                          </div>

                          {activeExercise.testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(tc.id)}
                              className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-destructive-foreground"
                            >
                              Xóa
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                              Input (Đầu vào chuẩn stdin)
                            </label>
                            <textarea
                              rows={3}
                              value={tc.input}
                              onChange={(e) =>
                                updateCurrentExercise((ex) => ({
                                  ...ex,
                                  testCases: ex.testCases.map((item) =>
                                    item.id === tc.id
                                      ? { ...item, input: e.target.value }
                                      : item
                                  ),
                                }))
                              }
                              placeholder="Ví dụ: 3 5"
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                              Expected Output (Kết quả mong đợi){" "}
                              <span className="text-destructive">*</span>
                            </label>
                            <textarea
                              rows={3}
                              value={tc.expected_output}
                              onChange={(e) =>
                                updateCurrentExercise((ex) => ({
                                  ...ex,
                                  testCases: ex.testCases.map((item) =>
                                    item.id === tc.id
                                      ? {
                                          ...item,
                                          expected_output: e.target.value,
                                        }
                                      : item
                                  ),
                                }))
                              }
                              placeholder="Ví dụ: 8"
                              className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* ── CỘT PHẢI (4/12, STICKY): TRẠM CHẠY KIỂM THỬ + SỨC KHỎE BỘ ĐỀ ── */}
          <div className="space-y-5 lg:col-span-4">
            <div className="space-y-5 lg:sticky lg:top-20">
              {/* 1. TRẠM CHẠY KIỂM THỬ */}
              <Card className="overflow-hidden border border-border bg-surface shadow-xs">
                <div className="flex items-center justify-between border-b border-border bg-primary-light/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Kiểm thử Bài {activeExerciseIndex + 1}
                    </span>
                  </div>
                  {activeTestState?.isFreshPass ? (
                    <Badge variant="success" size="sm">
                      PASS 100%
                    </Badge>
                  ) : activeTestState?.isFailed ? (
                    <Badge variant="destructive" size="sm">
                      Chưa đạt
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      Cần chạy test
                    </Badge>
                  )}
                </div>

                <div className="space-y-4 p-4">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleRunTest}
                    disabled={isTesting || !activeExercise}
                    isLoading={isTesting}
                    loadingText="Đang biên dịch & chạy test..."
                    leftIcon={<Play className="h-4 w-4" aria-hidden="true" />}
                    className="w-full"
                  >
                    Chạy kiểm thử lời giải mẫu
                  </Button>

                  {activeResult ? (
                    <div className="space-y-3">
                      <div
                        className={`rounded-xl border p-3 text-xs ${
                          activeTestState?.isFreshPass
                            ? "border-success-border bg-success-bg/70 text-success-foreground"
                            : "border-warning-border bg-warning-bg/70 text-warning-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>
                            Kết quả: {activeResult.passed}/{activeResult.total} test PASS
                          </span>
                          <span>
                            {activeResult.time_limit || 500} ms ·{" "}
                            {Math.round(
                              (activeResult.memory_limit || 256000000) /
                                (1024 * 1024)
                            )}{" "}
                            MB
                          </span>
                        </div>
                        {!activeTestState?.isFreshPass &&
                          activeResult.status === "passed" && (
                            <p className="mt-1 text-[11px]">
                              Mã nguồn hoặc test case đã thay đổi sau lần chạy gần nhất — vui lòng chạy lại.
                            </p>
                          )}
                      </div>

                      {activeResult.details && activeResult.details.length > 0 && (
                        <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                          {activeResult.details.map((d, idx) => (
                            <div
                              key={idx}
                              className={`rounded-xl border p-2.5 text-xs ${
                                d.result === "passed"
                                  ? "border-success-border bg-success-bg/35"
                                  : "border-destructive-border bg-destructive-bg/45"
                              }`}
                            >
                              <div className="flex items-center justify-between font-semibold">
                                <span className="flex items-center gap-1.5 text-foreground">
                                  {d.result === "passed" ? (
                                    <CheckCircle2
                                      className="h-3.5 w-3.5 text-success-foreground"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <XCircle
                                      className="h-3.5 w-3.5 text-destructive-foreground"
                                      aria-hidden="true"
                                    />
                                  )}
                                  Test #{idx + 1}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {d.cpu_time || 0} ms
                                </span>
                              </div>
                              {d.result !== "passed" && (
                                <div className="mt-1.5 space-y-1 font-mono text-[11px]">
                                  <p className="text-muted-foreground">
                                    Mong đợi:{" "}
                                    <span className="text-foreground">
                                      {d.expected}
                                    </span>
                                  </p>
                                  <p className="text-destructive-foreground">
                                    Thực tế: {d.output || d.stderr || "(rỗng)"}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Bấm nút trên để chạy mã lời giải mẫu qua toàn bộ test cases. Hệ thống sẽ tự động đo giới hạn thời gian &amp; bộ nhớ tối ưu cho học viên.
                    </p>
                  )}
                </div>
              </Card>

              {/* 2. SỨC KHỎE BÀI HỌC LẬP TRÌNH */}
              <Card className="border border-border bg-surface p-4 shadow-xs">
                <div className="mb-4 flex items-center gap-3.5">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r={ringRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-primary-light"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={ringRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        className={
                          stats.readinessPercent >= 85
                            ? "text-success transition-all duration-500"
                            : "text-primary transition-all duration-500"
                        }
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-foreground">
                      {stats.readinessPercent}%
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Mức độ sẵn sàng
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {stats.passedCount}/{stats.total} bài đạt 100% kiểm thử
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 text-xs">
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-foreground">
                      {stats.hasTitle && stats.hasLang ? (
                        <CheckCircle2
                          className="h-4 w-4 text-success-foreground"
                          aria-hidden="true"
                        />
                      ) : (
                        <AlertCircle
                          className="h-4 w-4 text-warning-foreground"
                          aria-hidden="true"
                        />
                      )}
                      Tiêu đề &amp; Ngôn ngữ chấm điểm
                    </span>
                    {!(stats.hasTitle && stats.hasLang) && (
                      <button
                        type="button"
                        onClick={() => setInfoExpanded(true)}
                        className="cursor-pointer font-semibold text-primary hover:underline"
                      >
                        Điền ngay
                      </button>
                    )}
                  </li>

                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-foreground">
                      {stats.passedCount === stats.total && stats.total > 0 ? (
                        <CheckCircle2
                          className="h-4 w-4 text-success-foreground"
                          aria-hidden="true"
                        />
                      ) : (
                        <AlertCircle
                          className="h-4 w-4 text-warning-foreground"
                          aria-hidden="true"
                        />
                      )}
                      Tất cả bài tập PASS kiểm thử ({stats.passedCount}/
                      {stats.total})
                    </span>
                    {stats.firstIssueIdx !== -1 && (
                      <button
                        type="button"
                        onClick={() => setActiveExerciseIndex(stats.firstIssueIdx)}
                        className="cursor-pointer font-semibold text-primary hover:underline"
                      >
                        Tới bài {stats.firstIssueIdx + 1}
                      </button>
                    )}
                  </li>
                </ul>

                {canSaveReason && (
                  <p className="mt-3 rounded-xl border border-warning-border bg-warning-bg/70 px-3 py-2 text-xs text-warning-foreground">
                    {canSaveReason}
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
