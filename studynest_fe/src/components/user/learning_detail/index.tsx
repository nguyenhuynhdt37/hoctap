"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { ActiveLessonResponse } from "@/types/user/activeLesson";
import { CurriculumResponse } from "@/types/user/curriculum";
import { InstructorResponse } from "@/types/user/instructor";
import { LearningDetailProps } from "@/types/user/learning";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { HiBookOpen } from "react-icons/hi";
import useSWR from "swr";
import { TutorChatPanel, ResizablePanel } from "./chat";
import FooterControls from "./FooterControls";
import LearningHeader from "./header";
import LessonRenderer from "./LessonRenderer";
import ProgressModal from "./ProgressModal";
import Sidebar from "./Sidebar";
import LearningTabs from "./tabs";

function LearningDetail(props: LearningDetailProps) {
  const { courseData, error, accessToken } = props;

  // SWR với axios trực tiếp
  const {
    data: curriculumData,
    error: curriculumError,
    isLoading,
    isValidating: isValidatingCurriculum,
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

  const getInstructorName = useCallback((html?: string | null) => {
    if (!html) return "Giảng viên";
    try {
      const match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      if (match && match[1]) {
        const text = match[1].replace(/<[^>]*>/g, "").trim();
        const parts = text.split("-");
        return (parts[0] || text).trim();
      }
    } catch {}
    return "Giảng viên";
  }, []);

  // UI states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeLesson, setActiveLesson] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("lesson");
  const [openProgress, setOpenProgress] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

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
                behavior: "smooth",
                block: "center",
                inline: "nearest",
              });
            }
          }, 100);
        }
      } catch (error) {
        console.error("Error setting active lesson:", error);
        // Fallback: vẫn set lesson trong UI
        setActiveLesson(lessonId);
      }
    },
    [courseData?.id, curriculumData, mutateActiveLesson]
  );

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
      setActiveLessonAndRefresh(lessonId);
    },
    [curriculumData, setActiveLessonAndRefresh]
  );

  // Memoized computed values
  const instructorName = useMemo(() => {
    return getInstructorName(instructorData?.instructor_description);
  }, [instructorData?.instructor_description, getInstructorName]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center"
        suppressHydrationWarning
      >
        <div className="text-center" suppressHydrationWarning>
          <div
            className="w-20 h-20 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"
            suppressHydrationWarning
          >
            <HiBookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Đang tải nội dung khóa học...
          </h1>
          <p className="text-gray-600">Vui lòng chờ trong giây lát.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (curriculumError || !curriculumData) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center"
        suppressHydrationWarning
      >
        <div className="text-center" suppressHydrationWarning>
          <div
            className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6"
            suppressHydrationWarning
          >
            <HiBookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Không thể tải nội dung khóa học
          </h1>
          <p className="text-gray-600 mb-4">
            {curriculumError?.message ||
              "Vui lòng kiểm tra lại đường dẫn khóa học."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
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
        className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center"
        suppressHydrationWarning
      >
        <div className="text-center" suppressHydrationWarning>
          <div
            className="w-20 h-20 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
            suppressHydrationWarning
          >
            <HiBookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Không tìm thấy khóa học
          </h1>
          <p className="text-gray-600">
            Vui lòng kiểm tra lại đường dẫn khóa học.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50">
      <LearningHeader
        courseTitle={curriculumData.title}
        onOpenProgress={() => setOpenProgress(true)}
        chatOpen={chatOpen}
        onToggleChat={() => {
          const newChatOpen = !chatOpen;
          setChatOpen(newChatOpen);
          // Khi mở chat thì đóng sidebar, khi đóng chat thì mở lại sidebar
          if (newChatOpen) {
            setSidebarOpen(false);
          } else {
            setSidebarOpen(true);
          }
        }}
      />

      {/* Main Layout */}
      <div className="flex">
        {/* Main Content Area */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ height: "calc(100vh - 5rem - 4rem)" }}
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
            onSeekToTime={(timeSeconds: number) => {
              if (initialActiveLesson?.id) {
                const seekFn = (window as any)[
                  `seekVideo_${initialActiveLesson.id}`
                ];
                if (seekFn) {
                  seekFn(timeSeconds);
                }
              }
            }}
            accessToken={accessToken}
          />

          {/* Chỉ hiển thị LearningTabs khi không phải quiz và code lesson */}
          {initialActiveLesson?.lesson_type !== "quiz" &&
            initialActiveLesson?.lesson_type !== "code" && (
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
                onSeekToTime={(timeSeconds: number) => {
                  if (initialActiveLesson?.id) {
                    const seekFn = (window as any)[
                      `seekVideo_${initialActiveLesson.id}`
                    ];
                    if (seekFn) {
                      seekFn(timeSeconds);
                    }
                  }
                }}
                accessToken={accessToken}
              />
            )}
        </div>

        {/* Tutor Chat Panel - Resizable - nằm giữa content và sidebar */}
        {initialActiveLesson && (
          <ResizablePanel
            isOpen={chatOpen}
            onToggle={() => setChatOpen(!chatOpen)}
            minWidth={320}
            maxWidth={800}
            defaultWidth={400}
          >
            <div style={{ height: "calc(100vh - 5rem - 4rem)" }}>
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                }
              >
                <TutorChatPanel
                  lessonId={initialActiveLesson.id}
                  lessonTitle={initialActiveLesson.title || "Bài học"}
                  courseId={courseData.id}
                  courseTitle={curriculumData.title}
                  sectionId={
                    curriculumData.sections.find((s) =>
                      s.lessons.some((l) => l.id === initialActiveLesson.id)
                    )?.id
                  }
                  onSeekToTime={(timeSeconds: number) => {
                    const seekFn = (window as any)[
                      `seekVideo_${initialActiveLesson.id}`
                    ];
                    if (seekFn) {
                      seekFn(timeSeconds);
                    }
                  }}
                  onClose={() => {
                    setChatOpen(false);
                    setSidebarOpen(true);
                  }}
                />
              </Suspense>
            </div>
          </ResizablePanel>
        )}

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
          headerHeightPx={80}
          footerHeightPx={64}
        />
      </div>

      {/* Footer Controls - fixed bottom */}
      <FooterControls
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => {
          const newSidebarOpen = !sidebarOpen;
          setSidebarOpen(newSidebarOpen);
          // Khi mở sidebar thì đóng chat
          if (newSidebarOpen) {
            setChatOpen(false);
          }
        }}
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
          const seconds = curriculumData.total_duration || 0;
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

export default React.memo(LearningDetail);
