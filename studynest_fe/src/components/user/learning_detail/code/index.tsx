"use client";

import { safeUUID } from "@/lib/utils/uuid";
import api from "@/lib/utils/fetcher/client/axios";
import { triggerCelebration } from "@/lib/utils/helpers/effects";
import { ActiveLessonResponse } from "@/types/user/activeLesson";
import { CodeExercise, TestResult } from "@/types/user/learning";
import confetti from "canvas-confetti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeEditorPanel from "./code-editor-panel";
import ExerciseTabs from "./exercise-tabs";
import InfoPanel, { type CodeInfoTab } from "./info-panel";
import QASection from "../qa";
import { useLearningAgent, useAgentAction, useAgentSnapshot } from "../agent/agent-context";
import { applyEditorPatches, numberArg, stringArg } from "../agent/action-registry";

const getMonacoLanguage = (languageName: string): string => {
  const mapping: Record<string, string> = {
    python: "python",
    javascript: "javascript",
    typescript: "typescript",
    java: "java",
    "c++": "cpp",
    cpp: "cpp",
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

interface CodeLessonProps {
  lesson: ActiveLessonResponse;
  onMarkCompleted?: (lessonId: string) => void;
  completedLessons?: Set<string>;
  accessToken?: string;
  lessonAuthorId?: string | null;
}

export default function CodeLesson({
  lesson,
  onMarkCompleted,
  completedLessons,
  lessonAuthorId,
}: CodeLessonProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [userFiles, setUserFiles] = useState<
    Record<string, Record<string, string>>
  >({});
  const [initialFileContents, setInitialFileContents] = useState<
    Record<string, Record<string, string>>
  >({});
  const [savedFileContents, setSavedFileContents] = useState<
    Record<string, Record<string, string>>
  >({});
  const [isRunning, setIsRunning] = useState(false);
  const [runningMode, setRunningMode] = useState<"sample" | "full" | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [hasCompletedLesson, setHasCompletedLesson] = useState(false);
  const [infoTab, setInfoTab] = useState<CodeInfoTab>("info");
  const [qaOpen, setQaOpen] = useState(false);
  const prevFileIdRef = useRef<string | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const savingPromiseRef = useRef<Promise<void> | null>(null);
  const hasCalledCompleteRef = useRef<boolean>(false);
  const [exercisePassStatus, setExercisePassStatus] = useState<
    Record<string, boolean>
  >({});

  const agent = useLearningAgent();
  const editorRevision = useRef(0);
  const selection = useRef({ start: 0, end: 0 });
  const bufferRef = useRef(userFiles); bufferRef.current = userFiles;
  const savedRef = useRef(savedFileContents); savedRef.current = savedFileContents;
  const undoRef = useRef<{ exerciseId: string; revision: number; patchId: string; before: Record<string, string>; after: Record<string, string> } | null>(null);
  const [saveError, setSaveError] = useState("");
  const runningRef = useRef(false);
  const exercises: CodeExercise[] = lesson?.codes || [];

  useEffect(() => {
    if (exercises.length === 0) return;
    const initialStatus: Record<string, boolean> = {};
    exercises.forEach((ex) => {
      initialStatus[ex.id] = ex.is_pass ?? false;
    });
    setExercisePassStatus((prev) => {
      const hasChanges = exercises.some(
        (ex) => prev[ex.id] !== (ex.is_pass ?? false)
      );
      return hasChanges ? { ...prev, ...initialStatus } : prev;
    });
  }, [exercises]);

  useEffect(() => {
    hasCalledCompleteRef.current = false;
    setHasCompletedLesson(false);
  }, [lesson?.id]);

  const exercisesWithPassStatus = useMemo(() => {
    return exercises.map((ex) => ({
      ...ex,
      is_pass: exercisePassStatus[ex.id] ?? ex.is_pass ?? false,
    }));
  }, [exercises, exercisePassStatus]);

  const currentExercise = exercisesWithPassStatus[currentExerciseIndex];

  const activeFiles = useMemo(() => {
    if (!currentExercise) return [];
    return currentExercise.files || [];
  }, [currentExercise]);

  useEffect(() => {
    setUserFiles(previous => {
      const next = { ...previous }; let changed = false;
      for (const exercise of exercises) {
        const cur = next[exercise.id] ? { ...next[exercise.id] } : {};
        let exChanged = !next[exercise.id];
        for (const file of exercise.files) {
          if (!(file.id in cur)) {
            cur[file.id] = file.content;
            exChanged = true;
          }
        }
        if (exChanged) {
          next[exercise.id] = cur;
          changed = true;
        }
      }
      return changed ? next : previous;
    });
    setInitialFileContents(previous => {
      const next = { ...previous };
      for (const exercise of exercises) if (!next[exercise.id]) next[exercise.id] = Object.fromEntries(exercise.files.map(file => [file.id, file.content]));
      return next;
    });
    setSavedFileContents(previous => {
      const next = { ...previous }; let changed = false;
      for (const exercise of exercises) {
        const cur = next[exercise.id] ? { ...next[exercise.id] } : {};
        let exChanged = !next[exercise.id];
        for (const file of exercise.files) {
          if (!(file.id in cur)) {
            cur[file.id] = file.content;
            exChanged = true;
          }
        }
        if (exChanged) {
          next[exercise.id] = cur;
          changed = true;
        }
      }
      if (changed) savedRef.current = next;
      return changed ? next : previous;
    });
  }, [lesson.id, exercises]);
  const currentUserFiles = useMemo(() => activeFiles.map(file => ({ ...file,
    content: userFiles[currentExercise?.id]?.[file.id] ?? file.content,
  })), [activeFiles, currentExercise?.id, userFiles]);
  useEffect(() => {
    if (!activeFiles.length) {
      setActiveFileId(null);
      return;
    }
    if (!activeFileId || !activeFiles.some(file => file.id === activeFileId)) {
      const main = activeFiles.find(file => file.is_main) || activeFiles[0];
      setActiveFileId(main?.id || null);
      selection.current = { start: 0, end: 0 };
    }
  }, [currentExercise?.id, activeFiles, activeFileId]);

  const playSuccessSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + 0.5);
      });
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    if (exercisesWithPassStatus.length === 0) return;
    if (!onMarkCompleted || !lesson?.id) return;

    if (hasCalledCompleteRef.current) return;

    const allExercisesPassed = exercisesWithPassStatus.every(
      (ex) => ex.is_pass === true
    );

    if (!allExercisesPassed) return;

    const isCompletedFromAPI = lesson.is_completed || false;
    const isCompletedFromSet = completedLessons?.has(lesson.id) || false;
    const isCompleted = isCompletedFromAPI || isCompletedFromSet;

    if (!isCompleted && !hasCalledCompleteRef.current) {
      hasCalledCompleteRef.current = true;
      setHasCompletedLesson(true);

      if (typeof window !== "undefined") {
        playSuccessSound();
        triggerCelebration(3, 2);
        confetti({
          particleCount: 150,
          spread: 120,
          origin: { y: 0.6 },
          colors: ["#356FA7", "#BFD7ED", "#F7C9D9", "#E3D5F5", "#F8E9C9"],
          shapes: ["star", "circle"],
          scalar: 1.2,
        });
      }

      onMarkCompleted(lesson.id);
    }
  }, [
    exercisesWithPassStatus,
    hasCompletedLesson,
    onMarkCompleted,
    lesson?.id,
    lesson?.is_completed,
    completedLessons,
    playSuccessSound,
  ]);

  const language = useMemo(() => {
    if (!currentExercise?.language) return "plaintext";
    return getMonacoLanguage(currentExercise.language.name);
  }, [currentExercise]);

  const runCodeTests = async (sampleOnly = false, signal?: AbortSignal) => {
    if (!currentExercise || !currentUserFiles.length) {
      return;
    }

    if (runningRef.current) throw new Error("Một lần chạy test đang hoạt động.");
    runningRef.current = true;
    const testedRevision = editorRevision.current;
    setIsRunning(true);
    setRunningMode(sampleOnly ? "sample" : "full");
    setSaveError("");
    setTestResult(null);

    try {
      // Chờ thao tác tự động lưu từ onBlur (nếu đang chạy) hoàn tất để tránh xung đột hash 409
      if (savingPromiseRef.current) {
        await savingPromiseRef.current.catch(() => undefined);
      }

      if (!sampleOnly) {
        const exerciseId = currentExercise.id;
        for (const f of currentUserFiles) {
          const currentContent =
            bufferRef.current[exerciseId]?.[f.id] ?? f.content ?? "";
          const prevSaved =
            savedRef.current[exerciseId]?.[f.id] ?? f.content ?? "";
          if (currentContent !== prevSaved) {
            isSavingRef.current = true;
            const saveOp = (async () => {
              try {
                await api.post(`/learning/code/${exerciseId}/save`, {
                  filename: f.filename,
                  content: currentContent,
                  is_main: f.is_main,
                  expected_content_hash: await sha256(prevSaved),
                });
                savedRef.current = {
                  ...savedRef.current,
                  [exerciseId]: {
                    ...savedRef.current[exerciseId],
                    [f.id]: currentContent,
                  },
                };
                setSavedFileContents(savedRef.current);
                setSaveError("");
              } finally {
                isSavingRef.current = false;
                savingPromiseRef.current = null;
              }
            })();
            savingPromiseRef.current = saveOp;
            await saveOp;
          }
        }
      }

      const payload = {
        language_id: currentExercise.language.id,
        sample_only: sampleOnly,
        buffer_revision: editorRevision.current,
        files: currentUserFiles.map((f) => ({
          filename: f.filename,
          content: bufferRef.current[currentExercise.id]?.[f.id] ?? f.content ?? "",
          is_main: f.is_main,
        })),
      };

      const response = await api.post<TestResult>(
        `/learning/code/${currentExercise.id}/test`,
        payload,
        { signal }
      );

      if (editorRevision.current !== testedRevision) throw new Error("Code đã thay đổi trong khi chạy test. Hãy chạy lại bản mới.");
      setTestResult(response.data);
      setInfoTab("tests");
      setFocusMode(false);

      const passPercentage =
        response.data.total > 0
          ? Math.round((response.data.passed / response.data.total) * 100)
          : 0;
      if (!sampleOnly && response.data.saved && passPercentage === 100) {
        setExercisePassStatus((prev) => ({
          ...prev,
          [currentExercise.id]: true,
        }));
      }
      return response.data;
    } catch (error: any) {
      throw error;
    } finally {
      runningRef.current = false;
      setIsRunning(false);
      setRunningMode(null);
    }
  };

  const handleResetCode = () => {
    if (!currentExercise) return;
    const exerciseId = currentExercise.id;
    const resetFiles: Record<string, string> = {};
    const initialContents = initialFileContents[exerciseId] || {};
    activeFiles.forEach((file) => {
      resetFiles[file.id] = initialContents[file.id] ?? file.content;
    });
    bufferRef.current = { ...bufferRef.current, [exerciseId]: resetFiles };
    setUserFiles(bufferRef.current); editorRevision.current += 1; agent?.changed();
    setTestResult(null);
    setSaveError("");
  };

  const updateFileContent = (fileId: string, content: string) => {
    if (!currentExercise) return;
    const exerciseId = currentExercise.id;
    bufferRef.current = { ...bufferRef.current, [exerciseId]: { ...bufferRef.current[exerciseId], [fileId]: content } };
    setUserFiles(bufferRef.current); editorRevision.current += 1; agent?.changed();
    setExercisePassStatus(previous => ({ ...previous, [exerciseId]: false }));
  };
  const sha256 = async (content: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content)))).map(byte => byte.toString(16).padStart(2, "0")).join("");

  const saveFile = useCallback(
    async (
      exerciseId: string,
      filename: string,
      content: string,
      isMain: boolean
    ) => {
      try {
        const file = exercises.find(exercise => exercise.id === exerciseId)?.files.find(item => item.filename === filename);
        const savedContent = file ? savedRef.current[exerciseId]?.[file.id] ?? file.content : "";
        await api.post(`/learning/code/${exerciseId}/save`, {
          filename,
          content,
          is_main: isMain,
          expected_content_hash: await sha256(savedContent),
        });
        if (file) {
          savedRef.current = {
            ...savedRef.current,
            [exerciseId]: {
              ...savedRef.current[exerciseId],
              [file.id]: content,
            },
          };
          setSavedFileContents(savedRef.current);
        }
        setSaveError("");
      } catch (error: any) {
        setSaveError("Chưa lưu được code. Nếu code đã đổi ở nơi khác, hãy tải lại trước khi ghi đè.");
        throw error;
      }
    },
    [exercises, savedFileContents]
  );

  const saveCurrentFileIfChanged = useCallback(() => {
    if (isSavingRef.current || !activeFileId || !currentExercise) return;

    const file = currentUserFiles.find((f) => f.id === activeFileId);
    if (!file) return;

    const exerciseId = currentExercise.id;
    const savedContent = savedFileContents[exerciseId]?.[activeFileId] ?? "";
    const currentContent = userFiles[exerciseId]?.[activeFileId] ?? "";

    if (currentContent !== savedContent) {
      isSavingRef.current = true;
      const saveOp = saveFile(exerciseId, file.filename, currentContent, file.is_main)
        .then(() => {
          setSavedFileContents((prev) => ({
            ...prev,
            [exerciseId]: {
              ...prev[exerciseId],
              [activeFileId]: currentContent,
            },
          }));
        })
        .catch(() => undefined)
        .finally(() => {
          isSavingRef.current = false;
          savingPromiseRef.current = null;
        });
      savingPromiseRef.current = saveOp;
    }
  }, [
    activeFileId,
    currentExercise,
    currentUserFiles,
    userFiles,
    savedFileContents,
    saveFile,
  ]);

  useEffect(() => {
    if (prevFileIdRef.current && prevFileIdRef.current !== activeFileId) {
      const oldFileId = prevFileIdRef.current;
      const oldFile = currentUserFiles.find((f) => f.id === oldFileId);

      if (oldFile && currentExercise && !isSavingRef.current) {
        const exerciseId = currentExercise.id;
        const savedContent = savedFileContents[exerciseId]?.[oldFileId] ?? "";
        const currentContent = userFiles[exerciseId]?.[oldFileId] ?? "";

        if (currentContent !== savedContent) {
          isSavingRef.current = true;
          saveFile(
            exerciseId,
            oldFile.filename,
            currentContent,
            oldFile.is_main
          )
            .then(() => {
              setSavedFileContents((prev) => ({
                ...prev,
                [exerciseId]: {
                  ...prev[exerciseId],
                  [oldFileId]: currentContent,
                },
              }));
            })
            .catch(() => undefined)
            .finally(() => {
              isSavingRef.current = false;
            });
        }
      }
    }
    prevFileIdRef.current = activeFileId;
  }, [
    activeFileId,
    currentUserFiles,
    currentExercise,
    userFiles,
    savedFileContents,
    saveFile,
  ]);

  const handleSelectExercise = (index: number) => {
    saveCurrentFileIfChanged();
    setCurrentExerciseIndex(index);
    setTestResult(null);
    setSaveError("");
  };

  const dirty = () => currentUserFiles.some(file => (bufferRef.current[currentExercise?.id]?.[file.id] ?? file.content) !== (savedFileContents[currentExercise?.id]?.[file.id] ?? file.content));
  const editorState = () => ({ exercise_id: currentExercise?.id, active_file_id: activeFileId || undefined,
    revision: editorRevision.current, is_dirty: dirty(), selection: selection.current,
    files: currentUserFiles.map(file => ({ id: file.id, filename: file.filename, is_main: file.is_main, role: file.role, size: (bufferRef.current[currentExercise.id]?.[file.id] ?? file.content).length })),
    language: currentExercise?.language,
  });
  useAgentSnapshot("editor", () => ({ exercise_id: currentExercise?.id, editor: {
    active_file_id: activeFileId || undefined, revision: editorRevision.current, is_dirty: dirty(), selection: selection.current,
  } }));
  useEffect(() => { agent?.changed(); }, [currentExercise?.id, activeFileId, agent?.changed]);
  const assertExercise = (args: Record<string, unknown>) => {
    if (!currentExercise || (args.exercise_id && args.exercise_id !== currentExercise.id)) throw new Error("Bài tập đã thay đổi.");
  };
  const fileContent = (id: string) => {
    const file = currentUserFiles.find(file => file.id === id);
    if (!file) throw new Error("File không thuộc bài tập đang mở.");
    const content = bufferRef.current[currentExercise.id]?.[id] ?? file.content;
    if (content.length > 100000) throw new Error("File vượt giới hạn đọc của trợ giảng.");
    return { file_id: file.id, filename: file.filename, content, revision: editorRevision.current, is_dirty: dirty(), exercise_id: currentExercise.id };
  };
  useAgentAction("editor.get_state", { execute: async args => { assertExercise(args); return editorState(); }, verify: result => Boolean((result as { exercise_id?: string }).exercise_id) });
  useAgentAction("editor.read_file", { execute: async args => { assertExercise(args); return fileContent(typeof args.file_id === "string" ? args.file_id : activeFileId || ""); }, verify: result => typeof (result as { content?: unknown }).content === "string" });
  useAgentAction("editor.read_selection", { execute: async args => {
    assertExercise(args); const file = fileContent(activeFileId || ""); const range = selection.current;
    if (range.start === range.end) throw new Error("Bạn chưa chọn đoạn code nào.");
    return { ...file, content: file.content.slice(range.start, range.end), selection: range };
  }, verify: result => typeof (result as { content?: unknown }).content === "string" });
  useAgentAction("editor.select_file", { execute: async args => {
    assertExercise(args); const fileId = stringArg(args, "file_id"); fileContent(fileId); setActiveFileId(fileId);
    return { file_id: fileId, verified: true };
  }, verify: result => Boolean((result as { verified?: boolean }).verified) });
  const checkPatch = (args: Record<string, unknown>) => {
    assertExercise(args);
    const base = numberArg({ base_revision: args.base_revision ?? args.expected_revision }, "base_revision", 0, Number.MAX_SAFE_INTEGER);
    if (base !== editorRevision.current) throw new Error("Code đã thay đổi sau khi Mây Mây đọc. Hãy tạo lại bản sửa.");
    const before = Object.fromEntries(currentUserFiles.map(file => [file.id, bufferRef.current[currentExercise.id]?.[file.id] ?? file.content]));
    return { before, after: applyEditorPatches(before, args.patches), base };
  };
  useAgentAction("editor.propose_patch", { execute: async args => { checkPatch(args); return { ...args, preview: (args.patches as Array<Record<string, unknown>>).map(patch => ({ ...patch, filename: currentUserFiles.find(file => file.id === patch.file_id)?.filename || patch.file_id })), verified: true }; }, verify: result => Boolean((result as { verified?: boolean }).verified) });
  useAgentAction("editor.apply_patch", { mutation: true, execute: async (args, signal) => {
    const { before, after } = checkPatch(args);
    const patchId = safeUUID();
    if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
    bufferRef.current = { ...bufferRef.current, [currentExercise.id]: after }; setUserFiles(bufferRef.current);
    editorRevision.current += 1; undoRef.current = { exerciseId: currentExercise.id, before, after, patchId, revision: editorRevision.current };
    setExercisePassStatus(previous => ({ ...previous, [currentExercise.id]: false })); setTestResult(null); agent?.changed();
    return { ...editorState(), patch_id: patchId, applied: true, saved: false, verified: true };
  }, verify: result => Boolean((result as { applied?: boolean }).applied) });
  useAgentAction("editor.undo_patch", { mutation: true, execute: async (args, signal) => {
    assertExercise(args); const undo = undoRef.current;
    if (!undo || args.patch_id !== undo.patchId || undo.exerciseId !== currentExercise.id || undo.revision !== editorRevision.current || (args.base_revision !== undefined && args.base_revision !== editorRevision.current)) throw new Error("Code đã được sửa tiếp nên chưa thể hoàn tác tự động.");
    for (const [id, content] of Object.entries(undo.after)) if ((bufferRef.current[currentExercise.id]?.[id] ?? currentUserFiles.find(file => file.id === id)?.content) !== content) throw new Error("Code đã thay đổi.");
    if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
    bufferRef.current = { ...bufferRef.current, [currentExercise.id]: undo.before }; setUserFiles(bufferRef.current);
    editorRevision.current += 1; undoRef.current = null; setTestResult(null); agent?.changed();
    return { ...editorState(), undone: true, saved: false, verified: true };
  }, verify: result => Boolean((result as { undone?: boolean }).undone) });
  useAgentAction("code.run_sample_tests", { timeout: 120000, execute: async (args, signal) => { assertExercise(args); return runCodeTests(true, signal); }, verify: result => Boolean((result as { attempt_id?: string }).attempt_id) });

  useEffect(() => {
    if (!qaOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQaOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [qaOpen]);

  const dirtyFileIds = useMemo(() => {
    const set = new Set<string>();
    if (!currentExercise) return set;
    for (const file of currentUserFiles) {
      const currentVal = userFiles[currentExercise.id]?.[file.id] ?? file.content;
      const savedVal = savedFileContents[currentExercise.id]?.[file.id] ?? file.content;
      if (currentVal !== savedVal) set.add(file.id);
    }
    return set;
  }, [currentExercise, currentUserFiles, userFiles, savedFileContents]);

  if (exercisesWithPassStatus.length === 0) {
    return (
      <div className="w-full h-full bg-surface border border-border rounded-2xl shadow-xs p-8 flex items-center justify-center">
        <p className="text-muted-foreground">
          Không có bài tập code nào trong bài học này
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto bg-background lg:overflow-hidden">
      <div className="flex min-h-full min-w-0 flex-col gap-3 p-3 pb-20 sm:p-4 sm:pb-20 lg:h-full lg:min-h-0 lg:pb-[4.75rem]">
        {saveError && (
          <p
            role="alert"
            className="shrink-0 rounded-2xl border border-warning-border bg-warning-bg px-4 py-2.5 text-xs font-semibold text-warning-foreground"
          >
            {saveError}
          </p>
        )}

        <div className="shrink-0">
          <ExerciseTabs
            exercises={exercisesWithPassStatus}
            currentIndex={currentExerciseIndex}
            onSelectExercise={handleSelectExercise}
            focusMode={focusMode}
            onToggleFocusMode={() => setFocusMode((prev) => !prev)}
            onOpenQa={() => setQaOpen(true)}
          />
        </div>

        <div
          className={`grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 ${
            focusMode ? "lg:grid-cols-1" : "lg:grid-cols-12"
          }`}
        >
          {/* Cột trái: Đề bài | Test Bench (giữ nguyên data-learning-info) */}
          <div
            data-learning-info
            className={`min-h-[340px] min-w-0 flex-col lg:h-full lg:min-h-0 ${
              focusMode ? "hidden" : "flex lg:col-span-5 xl:col-span-4"
            }`}
          >
            <InfoPanel
              lesson={lesson}
              infoTab={infoTab}
              setInfoTab={setInfoTab}
              onOpenQa={() => setQaOpen(true)}
              currentExercise={currentExercise}
              testResult={testResult}
              lessonAuthorId={lessonAuthorId}
            />
          </div>

          {/* Cột phải: Code Editor Studio full chiều cao */}
          <div
            className={`flex min-h-[420px] min-w-0 flex-col lg:h-full lg:min-h-0 ${
              focusMode ? "lg:col-span-1" : "lg:col-span-7 xl:col-span-8"
            }`}
          >
            <CodeEditorPanel
              currentExercise={currentExercise}
              files={currentUserFiles}
              activeFileId={activeFileId}
              dirtyFileIds={dirtyFileIds}
              language={language}
              isRunning={isRunning}
              runningMode={runningMode}
              onSelectFile={setActiveFileId}
              onUpdateFileContent={updateFileContent}
              onRunSample={() =>
                void runCodeTests(true).catch(() =>
                  setSaveError("Không chạy thử được test mẫu. Bạn thử lại nhé."),
                )
              }
              onTestCode={() =>
                void runCodeTests(false).catch(() =>
                  setSaveError("Không chạy được test. Code chưa được xác nhận PASS."),
                )
              }
              onResetCode={handleResetCode}
              onSaveFile={saveCurrentFileIfChanged}
              onSelectionChange={(value) => {
                if (
                  selection.current.start !== value.start ||
                  selection.current.end !== value.end
                ) {
                  selection.current = value;
                  agent?.changed();
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Phòng Hỏi đáp Full màn hình 100vw × 100dvh */}
      {qaOpen && (
        <QASection
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          lessonAuthorId={lessonAuthorId}
          isModal
          fullScreen
          onClose={() => setQaOpen(false)}
        />
      )}
    </div>
  );
}

