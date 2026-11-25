"use client";

import { Alert } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { ActiveLessonResponse } from "@/types/user/activeLesson";
import { CurriculumResponse } from "@/types/user/curriculum";
import { InstructorResponse } from "@/types/user/instructor";
import { LearningDetailProps } from "@/types/user/learning";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BookOpen } from "pulsoicon-react";
import useSWR from "swr";
import FooterControls from "./FooterControls";
import LearningHeader from "./header";
import LessonRenderer from "./LessonRenderer";
import ProgressModal from "./ProgressModal";
import Sidebar from "./Sidebar";
import LearningTabs from "./tabs";
import { LearningAgentProvider, useLearningAgent, useAgentAction, useAgentSnapshot } from "./agent/agent-context";
import { stringArg, waitForState } from "./agent/action-registry";

function LearningDetail(props: LearningDetailProps) {
  const { courseData, openTutor = false, lessonId, sectionId, preferQuiz } = props;

  // SWR với axios trực tiếp
  const {
    data: curriculumData,
    error: curriculumError,
    isLoading,
    mutate: mutateCurriculum,
  } = useSWR(
    courseData?.id ? `curriculum-${courseData.id}` : null,
    async () => {
      if (!courseData?.id) throw new Error("Course ID is required");
      const response = await api.get<CurriculumResponse>(
        `/learning/${courseData.id}/curriculum`
      );
      return response.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  const { data: instructorData } = useSWR(
    courseData?.id ? `instructor-${courseData.id}` : null,
    async () => {
      if (!courseData?.id) throw new Error("Course ID is required");
      const response = await api.get<InstructorResponse>(
        `/learning/${courseData.id}/instructor`
      );
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const { data: initialActiveLesson, mutate: mutateActiveLesson } = useSWR(
    // Chỉ gọi active lesson sau khi curriculum đã load xong
    courseData?.id && curriculumData ? `active-lesson-${courseData.id}` : null,
    async () => {
      if (!courseData?.id) throw new Error("Course ID is required");
      console.log("Calling active lesson API for course:", courseData.id);
      const response = await api.get<ActiveLessonResponse>(
        `/learning/${courseData.id}/view/active`
      );
      console.log("Active lesson API response:", response.data);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  function seekCurrentVideo(timeSeconds: number) {
    if (!initialActiveLesson?.id) return;
    const seek: unknown = Reflect.get(window, `seekVideo_${initialActiveLesson.id}`);
    if (typeof seek === "function") seek(timeSeconds);
  }

  // UI states
  const [sidebarOpen, setSidebarOpen] = useState(!openTutor);
  const [focusMode, setFocusMode] = useState(false);
  const [activeLesson, setActiveLesson] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("lesson");
  const [openProgress, setOpenProgress] = useState(false);
  const [lessonLinkFailed, setLessonLinkFailed] = useState(false);
  const attemptedLessonLink = useRef(false);

  // Refs
  const lessonRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const completingLessonsRef = useRef<Set<string>>(new Set());

  // State để track completion status
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );
  const [lessonJustCompleted, setLessonJustCompleted] = useState(false);

  // Check prev/next lesson availability
  const { data: navigationData, mutate: mutateNavigation } = useSWR(
    activeLesson ? `navigation-${activeLesson}` : null,
    async () => {
      if (!activeLesson) throw new Error("Active lesson ID is required");
      const response = await api.get<{
        current_lesson_id: string;
        prev_lesson_id: string | null;
        next_lesson_id: string | null;
        can_prev: boolean;
        can_next: boolean;
      }>(`/learning/${activeLesson}/check_prev_next`);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  // Helper functions để format data từ API
  const formatDuration = useCallback((seconds: number) => {
    const total = Math.max(0, Math.round(seconds || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;

    if (hours > 0) {
      return `${hours} giờ ${minutes} phút`;
    } else if (minutes > 0) {
      return `${minutes} phút ${remainingSeconds} giây`;
    } else {
      return `${remainingSeconds} giây`;
    }
  }, []);

  const formatProgress = useCallback((completed: number, total: number) => {
    return `${completed}/${total}`;
  }, []);

  // Function để đánh dấu bài học hoàn thành
  const markLessonCompleted = useCallback(
    async (lessonId: string) => {
      try {
        // Kiểm tra xem đã hoàn thành chưa để tránh gọi API nhiều lần
        if (completedLessons.has(lessonId)) {
          console.log("Lesson already completed:", lessonId);
          return;
        }

        // Kiểm tra xem đang trong quá trình complete chưa
        if (completingLessonsRef.current.has(lessonId)) {
          console.log("Lesson is already being completed:", lessonId);
          return;
        }

        // Đánh dấu đang complete để tránh gọi lại
        completingLessonsRef.current.add(lessonId);

        console.log("Marking lesson as completed:", lessonId);
        await api.post(`/learning/${lessonId}/complete`);

        // Cập nhật state ngay lập tức để tránh gọi API lần nữa
        setCompletedLessons((prev) => new Set([...prev, lessonId]));

        // Remove khỏi completingLessonsRef ngay sau khi API thành công
        // vì completedLessons đã chặn việc gọi lại
        completingLessonsRef.current.delete(lessonId);

        // Set flag để trigger bounce effect
        setLessonJustCompleted(true);
        setTimeout(() => setLessonJustCompleted(false), 2000); // Reset sau 2 giây

        // Refresh cả curriculum và active lesson trước
        await Promise.all([mutateCurriculum(), mutateActiveLesson()]);

        // Đợi một chút để đảm bảo server đã cập nhật trạng thái
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Force revalidate navigation data sau khi hoàn thành bài học
        await mutateNavigation();

        console.log("Lesson marked as completed successfully");
      } catch (error) {
        console.error("Error marking lesson as completed:", error);
        // Đảm bảo remove khỏi set nếu có lỗi để có thể thử lại
        completingLessonsRef.current.delete(lessonId);
      }
    },
    [completedLessons, mutateCurriculum, mutateActiveLesson, mutateNavigation]
  );

  // Khởi tạo state khi curriculumData được load
  useEffect(() => {
    if (curriculumData) {
      // Nếu có API active lesson, ưu tiên set theo API này
      if (initialActiveLesson?.id) {
        console.log("Setting active lesson from API:", initialActiveLesson.id);
        setActiveLesson(initialActiveLesson.id);
        const section = curriculumData.sections.find((s) =>
          s.lessons.some((l) => l.id === initialActiveLesson.id)
        );
        if (section) {
          console.log("Found section for active lesson:", section.id);
          setExpandedSections(new Set([section.id]));
        }
        return;
      }
      // Set active lesson từ curriculum (fallback)
      console.log(
        "Setting active lesson from curriculum:",
        curriculumData.active_lesson_id
      );
      setActiveLesson(curriculumData.active_lesson_id);

      // Mở section chứa active lesson
      const activeSection = curriculumData.sections.find((section) =>
        section.lessons.some(
          (lesson) => lesson.id === curriculumData.active_lesson_id
        )
      );
      if (activeSection) {
        setExpandedSections(new Set([activeSection.id]));
      } else if (curriculumData.sections.length > 0) {
        // Fallback: mở section đầu tiên
        setExpandedSections(new Set([curriculumData.sections[0].id]));
      }
    }
  }, [curriculumData, initialActiveLesson]);

  // Cập nhật active lesson khi initialActiveLesson thay đổi (không cần curriculum)
  useEffect(() => {
    if (initialActiveLesson?.id && curriculumData) {
      console.log("Active lesson changed from API:", initialActiveLesson.id);
      setActiveLesson(initialActiveLesson.id);

      // Tìm section chứa lesson này
      const section = curriculumData.sections.find((s) =>
        s.lessons.some((l) => l.id === initialActiveLesson.id)
      );
      if (section) {
        setExpandedSections((prev) => new Set([...prev, section.id]));
      }
    }
  }, [initialActiveLesson, curriculumData]);

  // Sidebar functions
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newExpandedSections = new Set(prev);
      if (newExpandedSections.has(sectionId)) {
        newExpandedSections.delete(sectionId);
      } else {
        newExpandedSections.add(sectionId);
      }
      return newExpandedSections;
    });
  }, []);

  // Function để set active lesson và refresh data
  const setActiveLessonAndRefresh = useCallback(
    async (lessonId: string) => {
      if (!lessonId) throw new Error("Không tìm thấy bài học cần mở.");
      try {
        // Gọi API để set active lesson
        if (courseData?.id) {
          console.log("Setting active lesson:", lessonId);
          await api.post(`/learning/${courseData.id}/active/${lessonId}`);
          console.log("Active lesson set successfully");

          // Refresh active lesson data bằng SWR mutate
          console.log("Refreshing active lesson data...");
          await mutateActiveLesson();

          // Cập nhật UI với data mới
          setActiveLesson(lessonId);

          // Tự động mở section chứa lesson này
          if (curriculumData) {
            const section = curriculumData.sections.find((s) =>
              s.lessons.some((l) => l.id === lessonId)
            );
            if (section) {
              setExpandedSections((prev) => new Set([...prev, section.id]));
            }
          }

          // Load video mới cho lesson (sẽ được cập nhật khi initialActiveLesson thay đổi)

          // Scroll bài học active ra giữa màn hình
          setTimeout(() => {
            const lessonElement = lessonRefs.current[lessonId];
            if (lessonElement) {
              lessonElement.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                block: "center",
                inline: "nearest",
              });
            }
          }, 100);
        }
      } catch (error) {
        console.error("Error setting active lesson:", error);
        throw error;
      }
    },
    [courseData?.id, curriculumData, mutateActiveLesson]
  );

  useEffect(() => {
    if ((!lessonId && !sectionId) || !curriculumData || attemptedLessonLink.current) return;
    attemptedLessonLink.current = true;

    async function openLinkedLesson() {
      const sections = curriculumData?.sections ?? [];
      const section = sectionId ? sections.find(({ id }) => id === sectionId) : undefined;
      const lessons = sectionId ? section?.lessons ?? [] : sections.flatMap((item) => item.lessons);
      const available = lessons.filter((lesson) => !lesson.is_locked && (!preferQuiz || lesson.lesson_type === "quiz"));
      const target = lessonId ? available.find(({ id }) => id === lessonId)
        : available.find((lesson) => !lesson.is_completed) ?? available[0];
      if (!target) throw new Error("Bài học không khả dụng.");
      if (target.id !== initialActiveLesson?.id) await setActiveLessonAndRefresh(target.id);
    }

    void openLinkedLesson().catch(() => setLessonLinkFailed(true));
  }, [curriculumData, initialActiveLesson?.id, lessonId, sectionId, preferQuiz, setActiveLessonAndRefresh]);

  const selectLesson = useCallback(
    (lessonId: string) => {
      console.log("Selected lesson:", lessonId);
      // Nếu lesson bị khóa thì chặn
      const locked = (() => {
        if (!curriculumData) return false;
        for (const s of curriculumData.sections) {
          const l = s.lessons.find((x) => x.id === lessonId);
          if (l) return !!l.is_locked;
        }
        return false;
      })();
      if (locked) return;

      // Gọi API để set active lesson và refresh data
      void setActiveLessonAndRefresh(lessonId).catch(() => undefined);
    },
    [curriculumData, setActiveLessonAndRefresh]
  );

  const agent = useLearningAgent();
  useEffect(() => {
    const refresh = () => { void Promise.all([mutateCurriculum(), mutateActiveLesson(), mutateNavigation()]); };
    window.addEventListener('maymay:lesson-completed', refresh);
    return () => window.removeEventListener('maymay:lesson-completed', refresh);
  }, [mutateCurriculum, mutateActiveLesson, mutateNavigation]);
  // Một agent Co-Pilot duy nhất cho toàn site; ?tutor=1 chỉ mở khung Co-Pilot chung.
  useEffect(() => {
    if (openTutor) window.dispatchEvent(new Event("maymay:open-assistant"));
  }, [openTutor]);
  const screenState = useRef({ lessonId: initialActiveLesson?.id, activeTab, sidebarOpen });
  screenState.current = { lessonId: initialActiveLesson?.id, activeTab, sidebarOpen };
  useAgentSnapshot("learning", () => ({
    course_id: courseData?.id, lesson_id: initialActiveLesson?.id, active_tab: activeTab,
    active_panel: sidebarOpen ? "sidebar" : "content",
  }));
  const notifyAgent = agent?.changed;
  useEffect(() => { notifyAgent?.(); }, [initialActiveLesson?.id, activeTab, sidebarOpen, notifyAgent]);
  const navigateAgent = async (lessonId: string, signal: AbortSignal) => {
    const target = curriculumData?.sections.flatMap(section => section.lessons).find(item => item.id === lessonId);
    if (!target || target.is_locked) throw new Error("Bài học chưa được cấp quyền hoặc đang bị khóa.");
    if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
    await setActiveLessonAndRefresh(lessonId);
    await waitForState(() => screenState.current.lessonId === lessonId, signal);
    return { lesson_id: lessonId, verified: true };
  };
  useAgentAction("learning.navigate_lesson", { execute: (args, signal) => navigateAgent(stringArg(args, "lesson_id"), signal), verify: result => Boolean((result as { verified?: boolean })?.verified) });
  useAgentAction("learning.next_lesson", { execute: (args, signal) => {
    if (typeof args.lesson_id === "string") return navigateAgent(args.lesson_id, signal);
    if (!navigationData?.can_next || !navigationData.next_lesson_id) throw new Error("Chưa thể mở bài tiếp theo.");
    return navigateAgent(navigationData.next_lesson_id, signal);
  }, verify: result => Boolean((result as { verified?: boolean })?.verified) });
  useAgentAction("learning.previous_lesson", { execute: (args, signal) => {
    if (typeof args.lesson_id === "string") return navigateAgent(args.lesson_id, signal);
    if (!navigationData?.can_prev || !navigationData.prev_lesson_id) throw new Error("Chưa thể mở bài trước.");
    return navigateAgent(navigationData.prev_lesson_id, signal);
  }, verify: result => Boolean((result as { verified?: boolean })?.verified) });
  const setPanel = async (args: Record<string, unknown>, signal: AbortSignal, open: boolean) => {
    const panel = stringArg(args, "panel");
    if (!["sidebar", "chat", "notes", "editor"].includes(panel)) throw new Error("Bảng này không khả dụng.");
    if (panel === "notes") {
      if (["code", "quiz"].includes(initialActiveLesson?.lesson_type || "")) throw new Error("Ghi chú chưa khả dụng ở loại bài này.");
      setActiveTab(open ? "notes" : "lesson"); await waitForState(() => screenState.current.activeTab === (open ? "notes" : "lesson"), signal);
      return { panel, is_open: open, verified: true };
    }
    if (panel === "editor") {
      if (!open || initialActiveLesson?.lesson_type !== "code") throw new Error("Editor chỉ khả dụng trong bài tập lập trình.");
      await waitForState(() => Boolean(agent?.snapshot().editor?.active_file_id), signal);
      return { panel, is_open: true, verified: true };
    }
    if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
    if (panel === "sidebar") {
      setSidebarOpen(open);
      await waitForState(() => screenState.current.sidebarOpen === open, signal);
      return { panel, is_open: open, verified: true };
    }
    // Panel chat là Co-Pilot chung của toàn site, luôn do người dùng điều khiển.
    if (open) window.dispatchEvent(new Event("maymay:open-assistant"));
    return { panel, is_open: open, verified: true };
  };
  useAgentAction("ui.open_panel", { execute: (args, signal) => setPanel(args, signal, true), verify: result => Boolean((result as { verified?: boolean })?.verified) });
  useAgentAction("ui.close_panel", { execute: (args, signal) => setPanel(args, signal, false), verify: result => Boolean((result as { verified?: boolean })?.verified) });
  useAgentAction("ui.switch_tab", { execute: async (args, signal) => {
    const tab = stringArg(args, "tab");
    if (!["lesson", "tools", "notes", "overview"].includes(tab) || ["code", "quiz"].includes(initialActiveLesson?.lesson_type || "")) throw new Error("Tab này không khả dụng cho bài học hiện tại.");
    if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
    setActiveTab(tab); await waitForState(() => screenState.current.activeTab === tab, signal);
    return { active_tab: tab, verified: true };
  }, verify: result => Boolean((result as { verified?: boolean })?.verified) });
  useAgentAction("ui.get_state", { execute: async () => agent?.snapshot(), verify: result => Boolean(result) });

  // Loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-background to-primary-pastel/30 flex items-center justify-center"
        suppressHydrationWarning
      >
        <div className="text-center" suppressHydrationWarning>
          <div
            className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-sm"
            suppressHydrationWarning
          >
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Đang tải nội dung khóa học...
          </h1>
          <p className="text-muted-foreground">Vui lòng chờ trong giây lát.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (curriculumError || !curriculumData) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-background to-primary-pastel/30 flex items-center justify-center"
        suppressHydrationWarning
      >
        <div className="text-center" suppressHydrationWarning>
          <div
            className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6"
            suppressHydrationWarning
          >
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Không thể tải nội dung khóa học
          </h1>
          <p className="text-muted-foreground mb-4">
            {curriculumError?.message ||
              "Vui lòng kiểm tra lại đường dẫn khóa học."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-background to-primary-pastel/30 flex items-center justify-center"
        suppressHydrationWarning
      >
        <div className="text-center" suppressHydrationWarning>
          <div
            className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"
            suppressHydrationWarning
          >
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Không tìm thấy khóa học
          </h1>
          <p className="text-muted-foreground">
            Vui lòng kiểm tra lại đường dẫn khóa học.
          </p>
        </div>
      </div>
    );
  }

  const toggleFocusMode = () => {
    setFocusMode((prev) => {
      const next = !prev;
      if (next) {
        setSidebarOpen(false);
      } else if (window.matchMedia("(min-width: 768px)").matches) {
        setSidebarOpen(true);
      }
      return next;
    });
  };

  const currentSectionTitle =
    curriculumData.sections.find((s) =>
      s.lessons.some((l) => l.id === initialActiveLesson?.id)
    )?.title || "";

  return (
    <div className="flex h-dvh max-w-full flex-col overflow-hidden bg-gradient-to-br from-background via-primary-light/25 to-secondary/15">
      <LearningHeader
        courseTitle={curriculumData.title}
        courseId={courseData.id}
        onOpenProgress={() => setOpenProgress(true)}
        completedLessons={curriculumData.completed_lessons || 0}
        totalLessons={curriculumData.total_lessons || 0}
        focusMode={focusMode}
        onToggleFocusMode={toggleFocusMode}
        onToggleChat={() => window.dispatchEvent(new Event("maymay:open-assistant"))}
      />

      {/* Main Layout */}
      <div className="flex min-h-0 min-w-0 w-full flex-1">
        {/* Main Content Area — Video Full-Width + Cloudy Studio Content */}
        <div
          data-learning-lesson
          className={`min-w-0 flex-1 overflow-x-hidden ${
            initialActiveLesson?.lesson_type === "code" ||
            initialActiveLesson?.lesson_type === "quiz"
              ? "overflow-y-auto lg:flex lg:flex-col lg:overflow-hidden"
              : "overflow-y-auto"
          }`}
        >
          {lessonLinkFailed && (
            <div className="shrink-0 px-4 pt-3 sm:px-6">
              <Alert variant="warning">
                Chưa mở được bài học từ liên kết. Bạn có thể chọn bài trong danh sách của khóa học.
              </Alert>
            </div>
          )}

          {/* Khung Video / Bài học trải full-width 100% */}
          {(() => {
            const lt = initialActiveLesson?.lesson_type || "";
            const isCodeOrQuiz = lt === "code" || lt === "quiz";
            const isStudioLesson =
              lt === "flashcard" ||
              lt === "listening" ||
              lt === "fill_blank" ||
              lt === "speaking";
            return (
              <>
                <div
                  className={
                    isCodeOrQuiz
                      ? "w-full bg-surface lg:min-h-0 lg:flex-1 lg:overflow-hidden"
                      : isStudioLesson
                        ? "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
                        : "w-full border-b border-primary-pastel/60 bg-surface"
                  }
                >
                  <LessonRenderer
                    activeLessonData={initialActiveLesson}
                    onMarkCompleted={markLessonCompleted}
                    completedLessons={completedLessons}
                    onNext={() =>
                      setActiveLessonAndRefresh(navigationData?.next_lesson_id || "")
                    }
                    onPrev={() =>
                      setActiveLessonAndRefresh(navigationData?.prev_lesson_id || "")
                    }
                    hasNext={navigationData?.can_next ?? false}
                    hasPrev={navigationData?.can_prev ?? false}
                    onSeekToTime={seekCurrentVideo}
                    lessonAuthorId={instructorData?.id ?? null}
                  />
                </div>

                {!isCodeOrQuiz && !isStudioLesson && (
                  <div
                    className={`mx-auto w-full space-y-5 px-3 py-4 sm:px-6 sm:py-5 ${
                      focusMode ? "max-w-[1440px]" : "max-w-6xl"
                    }`}
                  >
                    {/* Banner bài đang học gọn đẹp ngay dưới video */}
                    {initialActiveLesson && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary-pastel/70 bg-surface/90 px-4 py-3 shadow-2xs backdrop-blur-sm">
                        <div className="min-w-0 flex-1">
                          {currentSectionTitle && (
                            <p className="truncate text-[11px] font-bold tracking-wider text-primary uppercase">
                              {currentSectionTitle}
                            </p>
                          )}
                          <h2 className="truncate font-display text-base font-bold text-foreground sm:text-lg">
                            {initialActiveLesson.title}
                          </h2>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs font-bold">
                          {initialActiveLesson.duration ? (
                            <span className="rounded-full bg-primary-light px-2.5 py-1 text-primary">
                              {formatDuration(initialActiveLesson.duration)}
                            </span>
                          ) : null}
                          {completedLessons.has(initialActiveLesson.id) && (
                            <span className="rounded-full border border-success-border bg-success-bg px-2.5 py-1 text-success-foreground">
                              ✓ Đã hoàn thành
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Chỉ hiển thị LearningTabs cho bài Video / Article */}
                    <LearningTabs
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      title={curriculumData.title}
                      notes={notes}
                      setNotes={setNotes}
                      course={courseData}
                      instructor={instructorData}
                      lessonOverview={
                        initialActiveLesson
                          ? {
                              id: initialActiveLesson.id,
                              section_id: initialActiveLesson.id,
                              title: initialActiveLesson.title || "Bài học",
                              description: initialActiveLesson.description || null,
                              lesson_type: initialActiveLesson.lesson_type || "video",
                              duration: initialActiveLesson.duration || 0,
                              resources: initialActiveLesson.resources || [],
                              quizzes_count: initialActiveLesson.quizzes?.length || 0,
                              quizzes:
                                initialActiveLesson.quizzes?.map((q) => ({
                                  id: q.id,
                                  question: q.question,
                                  options: q.options.map((opt) => opt.text),
                                  correct_answer: q.options.findIndex(
                                    (opt) => opt.is_correct
                                  ),
                                })) || [],
                            }
                          : undefined
                      }
                      onSeekToTime={seekCurrentVideo}
                    />
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Sidebar - nằm bên phải cùng */}
        <Sidebar
          sections={curriculumData.sections}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          lessonRefs={lessonRefs}
          activeLesson={activeLesson}
          selectLesson={selectLesson}
          progressLabel={formatProgress(
            curriculumData.completed_lessons || 0,
            curriculumData.total_lessons || 0
          )}
          totalDurationLabel={formatDuration(
            curriculumData.total_duration || 0
          )}
          completedLessons={curriculumData.completed_lessons || 0}
          totalLessons={curriculumData.total_lessons || 0}
          headerHeightPx={64}
          footerHeightPx={64}
        />
      </div>

      {/* Footer Controls - fixed bottom */}
      <FooterControls
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => {
          const newSidebarOpen = !sidebarOpen;
          setSidebarOpen(newSidebarOpen);
          if (newSidebarOpen) {
            setFocusMode(false);
          }
        }}
        focusMode={focusMode}
        onToggleFocusMode={toggleFocusMode}
        currentTitle={initialActiveLesson?.title || ""}
        currentDuration={
          initialActiveLesson?.duration
            ? formatDuration(initialActiveLesson.duration)
            : ""
        }
        goNext={() =>
          setActiveLessonAndRefresh(navigationData?.next_lesson_id || "")
        }
        goPrev={() =>
          setActiveLessonAndRefresh(navigationData?.prev_lesson_id || "")
        }
        hasPrev={navigationData?.can_prev ?? false}
        hasNext={navigationData?.can_next ?? false}
        lessonJustCompleted={lessonJustCompleted}
      />

      <ProgressModal
        open={openProgress}
        onClose={() => setOpenProgress(false)}
        title={curriculumData.title}
        completedLessons={curriculumData.completed_lessons || 0}
        totalLessons={curriculumData.total_lessons || 0}
        totalDurationLabel={(() => {
          const seconds = Math.max(0, Math.round(curriculumData.total_duration || 0));
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const remainingSeconds = seconds % 60;
          if (hours > 0) return `${hours} giờ ${minutes} phút`;
          if (minutes > 0) return `${minutes} phút ${remainingSeconds} giây`;
          return `${remainingSeconds} giây`;
        })()}
      />
    </div>
  );
}

export default React.memo(function AgentLearningDetail(props: LearningDetailProps) {
  const sharedAgent = useLearningAgent();
  return sharedAgent ? <LearningDetail {...props} /> : <LearningAgentProvider><LearningDetail {...props} /></LearningAgentProvider>;
});
