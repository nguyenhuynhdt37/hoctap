"use client";

import { Alert, Button, Card, EmptyState } from "@/components/ui";
import { useDebouncedUrlSearch, useUrlQueryState } from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type {
  ApiLesson,
  ApiSection,
  ApiSectionsResponse,
  Lesson,
  Section,
  SectionsResponse,
} from "@/types/lecturer/chapter";
import {
  closestCorners,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  GraduationCap,
  GripVertical,
  Layers,
  LayoutGrid,
  List,
  MoreVertical,
  Paperclip,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Target,
  Trash2,
  Users,
  X,
  Zap,
} from "pulsoicon-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  analyzeCurriculumHealth,
  dedupeLessons,
  getLessonMeta,
  LESSON_TYPE_META,
  type LessonTypeKey,
  mapApiResponseToSections,
  normalizeLessonType,
  ReadinessRing,
  translateCourseStatus,
} from "./chapter-helpers";

interface CourseBrief {
  id: string;
  title?: string;
  status?: string;
  approval_status?: string;
}

const CHAPTERS_QUERY_SCHEMA = {
  view: {
    type: "string",
    default: "board",
    allowed: ["board", "outline"] as const,
  },
  type: {
    type: "string",
    default: "all",
    allowed: [
      "all",
      "video",
      "quiz",
      "code",
      "flashcard",
      "listening",
      "fill_blank",
      "speaking",
      "article",
      "info",
    ] as const,
  },
  search: {
    type: "string",
    default: "",
  },
} as const;

const TYPE_FILTER_TABS: Array<{
  key: "all" | LessonTypeKey;
  label: string;
}> = [
  { key: "all", label: "Tất cả" },
  { key: "video", label: "Video" },
  { key: "quiz", label: "Trắc nghiệm" },
  { key: "code", label: "Lập trình" },
  { key: "flashcard", label: "Flashcard" },
  { key: "listening", label: "Luyện nghe" },
  { key: "fill_blank", label: "Điền từ" },
  { key: "speaking", label: "Giao tiếp AI" },
  { key: "article", label: "Bài đọc" },
  { key: "info", label: "Thông tin" },
];

const ChaptersManagement = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course_id") || "";

  const { values, setParam, resetParams } = useUrlQueryState(CHAPTERS_QUERY_SCHEMA);
  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    commitNow: commitSearchNow,
  } = useDebouncedUrlSearch(values.search, (val) => setParam("search", val));

  const viewMode = values.view;
  const typeFilter = values.type;
  const searchQuery = values.search.trim().toLowerCase();
  const isFiltering = Boolean(searchQuery) || typeFilter !== "all";

  // Drag & Drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"section" | "lesson" | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | null>(null);
  const [overLessonId, setOverLessonId] = useState<string | null>(null);

  // CRUD inline state
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState<string | null>(null);
  const [isEditingSection, setIsEditingSection] = useState<string | null>(null);
  const [isEditingLesson, setIsEditingLesson] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collapse & Jump-to-section state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch sections
  const { data, error, isLoading, mutate } = useSWR<SectionsResponse>(
    courseId ? `/lecturer/chapters/${courseId}` : null,
    async (url: string) => {
      const response = await api.get<ApiSectionsResponse>(url);
      return mapApiResponseToSections(response.data);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      keepPreviousData: false,
      revalidateIfStale: false,
    }
  );

  // Fetch course brief (tên & trạng thái khóa học để làm giàu Hero)
  const { data: courseBrief } = useSWR<CourseBrief | null>(
    courseId ? `/lecturer/courses/${courseId}` : null,
    async (url: string) => {
      try {
        const res = await api.get<CourseBrief>(url);
        return res.data;
      } catch {
        return null;
      }
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const sectionsData = data?.sections || [];

  const displaySections = useMemo(() => {
    if (!sectionsData || sectionsData.length === 0) return [];
    const seen = new Set<string>();
    const out: Section[] = [];
    for (const section of sectionsData) {
      if (!section.id || seen.has(section.id)) continue;
      seen.add(section.id);
      out.push({
        ...section,
        lessons: dedupeLessons(section.lessons || []),
      });
    }
    return out;
  }, [sectionsData]);

  // Lọc theo từ khóa và loại bài học
  const filteredSections = useMemo(() => {
    if (!isFiltering) return displaySections;
    return displaySections
      .map((section) => {
        const sectionMatchesSearch =
          !searchQuery || section.title.toLowerCase().includes(searchQuery);

        const matchedLessons = section.lessons.filter((lesson) => {
          const typeOk =
            typeFilter === "all" ||
            normalizeLessonType(lesson.lesson_type) === typeFilter;
          const textOk =
            !searchQuery ||
            sectionMatchesSearch ||
            lesson.title.toLowerCase().includes(searchQuery);
          return typeOk && textOk;
        });

        if (matchedLessons.length > 0) {
          return { ...section, lessons: matchedLessons };
        }
        if (typeFilter === "all" && sectionMatchesSearch && searchQuery) {
          return { ...section, lessons: [] };
        }
        return null;
      })
      .filter((s): s is Section => s !== null);
  }, [displaySections, isFiltering, searchQuery, typeFilter]);

  const health = useMemo(
    () => analyzeCurriculumHealth(displaySections),
    [displaySections]
  );

  const sectionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    displaySections.forEach((s, idx) => map.set(s.id, idx + 1));
    return map;
  }, [displaySections]);

  // Reset state khi courseId thay đổi
  useEffect(() => {
    setActiveId(null);
    setActiveType(null);
    setActiveLesson(null);
    setActiveSection(null);
    setOverSectionId(null);
    setOverLessonId(null);
    setIsCreatingSection(false);
    setIsCreatingLesson(null);
    setIsEditingSection(null);
    setIsEditingLesson(null);
    setNewSectionTitle("");
    setNewLessonTitle("");
    setEditSectionTitle("");
    setEditLessonTitle("");
    setSectionToDelete(null);
    setLessonToDelete(null);
    setCollapsedSections({});
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      mutate();
    }
  }, [courseId, mutate]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const toggleCollapseSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const allCollapsed =
    displaySections.length > 0 &&
    displaySections.every((s) => Boolean(collapsedSections[s.id]));

  const handleToggleAllCollapse = () => {
    if (allCollapsed) {
      setCollapsedSections({});
    } else {
      const next: Record<string, boolean> = {};
      displaySections.forEach((s) => {
        next[s.id] = true;
      });
      setCollapsedSections(next);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      setFocusedSectionId(sectionId);
      setCollapsedSections((prev) => ({ ...prev, [sectionId]: false }));
      window.setTimeout(() => {
        setFocusedSectionId((curr) => (curr === sectionId ? null : curr));
      }, 1500);
    }
  };

  // Drag handlers (giữ nguyên độ chính xác API gốc)
  const handleDragStart = (event: DragStartEvent) => {
    if (isFiltering) return;
    const { active } = event;
    const activeIdStr = String(active.id);

    setActiveId(activeIdStr);
    setOverSectionId(null);
    setOverLessonId(null);

    const isSection = sectionsData.some((s) => s.id === activeIdStr);
    let lesson: Lesson | undefined;

    if (!isSection) {
      for (const section of sectionsData) {
        lesson = section.lessons.find((l) => l.id === activeIdStr);
        if (lesson) break;
      }
    }

    if (isSection) {
      const section = sectionsData.find((s) => s.id === activeIdStr);
      setActiveType("section");
      setActiveLesson(null);
      setActiveSection(section || null);
    } else if (lesson) {
      setActiveType("lesson");
      setActiveLesson(lesson);
      setActiveSection(null);
    } else {
      setActiveType(null);
      setActiveLesson(null);
      setActiveSection(null);
    }
  };

  const customCollisionDetection: CollisionDetection = (args) => {
    const { active } = args;
    const isDraggingSection = sectionsData.some((s) => s.id === active.id);

    if (isDraggingSection) {
      const collisions = closestCorners(args);
      return collisions.filter((collision) => {
        const id = collision.id.toString();
        if (sectionsData.some((s) => s.id === collision.id)) return true;
        if (id.startsWith("section-droppable-")) return true;
        return false;
      });
    }
    return closestCorners(args);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (isFiltering) return;
    const { active, over } = event;

    if (!over) {
      setOverSectionId(null);
      setOverLessonId(null);
      return;
    }

    const isDraggingSection = sectionsData.some((s) => s.id === active.id);
    const isDraggingLesson = sectionsData.some((s) =>
      s.lessons.some((l) => l.id === active.id)
    );

    if (isDraggingSection) {
      let targetSection: Section | undefined;
      const overIdStr = String(over.id);
      if (overIdStr.startsWith("section-droppable-")) {
        const sectionId = overIdStr.replace("section-droppable-", "");
        targetSection = sectionsData.find((s) => s.id === sectionId);
      }
      if (!targetSection) {
        targetSection = sectionsData.find((s) => s.id === over.id);
      }
      if (!targetSection) {
        targetSection = sectionsData.find((s) =>
          s.lessons.some((l) => l.id === over.id)
        );
      }

      const newOverSectionId = targetSection?.id || null;
      if (overSectionId !== newOverSectionId) {
        setOverSectionId(newOverSectionId);
      }
      setOverLessonId(null);
      return;
    }

    if (!isDraggingLesson) {
      setOverSectionId(null);
      setOverLessonId(null);
      return;
    }

    const targetSection =
      displaySections.find(
        (s) => s.id === over.id || s.lessons.some((l) => l.id === over.id)
      ) ||
      sectionsData.find(
        (s) => s.id === over.id || s.lessons.some((l) => l.id === over.id)
      );

    const newOverSectionId = targetSection?.id || null;
    if (overSectionId !== newOverSectionId) {
      setOverSectionId(newOverSectionId);
    }

    let newOverLessonId: string | null = null;
    if (targetSection) {
      const hoveredLesson = targetSection.lessons.find((l) => l.id === over.id);
      if (hoveredLesson) {
        newOverLessonId = hoveredLesson.id;
      }
    }

    if (overLessonId !== newOverLessonId) {
      setOverLessonId(newOverLessonId);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (isFiltering) return;
    const { active, over } = event;
    const currentOverSectionId = overSectionId;

    setActiveId(null);
    setActiveType(null);
    setActiveLesson(null);
    setActiveSection(null);
    setOverSectionId(null);
    setOverLessonId(null);

    if (!over || !active) return;

    let activeSec: Section | undefined;
    let activeLes: Lesson | undefined;

    for (const section of sectionsData) {
      if (section.id === active.id) {
        activeSec = section;
        break;
      }
      const lesson = section.lessons.find((l) => l.id === active.id);
      if (lesson) {
        activeLes = lesson;
        activeSec = section;
        break;
      }
    }

    if (!activeSec) return;

    // Reorder section
    if (activeSec.id === active.id) {
      let overSection: Section | undefined;
      if (currentOverSectionId) {
        overSection = sectionsData.find((s) => s.id === currentOverSectionId);
      }
      if (!overSection) {
        const overIdStr = String(over.id);
        if (overIdStr.startsWith("section-droppable-")) {
          const sectionId = overIdStr.replace("section-droppable-", "");
          overSection = sectionsData.find((s) => s.id === sectionId);
        }
      }
      if (!overSection) {
        overSection = sectionsData.find((s) => s.id === over.id);
      }
      if (!overSection) {
        overSection = sectionsData.find((s) =>
          s.lessons.some((l) => l.id === over.id)
        );
      }

      if (!overSection || activeSec.id === overSection.id) return;

      const oldIndex = sectionsData.findIndex((s) => s.id === activeSec!.id);
      const overIndex = sectionsData.findIndex((s) => s.id === overSection!.id);
      if (oldIndex === overIndex) return;

      const newSections = arrayMove(sectionsData, oldIndex, overIndex);

      await mutate(
        (current) => (current ? { ...current, sections: newSections } : current),
        { revalidate: false }
      );

      try {
        await api.put(`/lecturer/chapters/${courseId}/sections/reorder`, {
          section_ids: newSections.map((s) => s.id),
        });
        showToast.success("Đã cập nhật thứ tự chương học");
      } catch {
        showToast.error("Không thể cập nhật thứ tự chương học");
        mutate();
      }
      return;
    }

    // Move / Reorder lesson
    if (activeLes) {
      const overIdStr = String(over.id);
      const isEndZone =
        overIdStr.startsWith("section-") && overIdStr.endsWith("-end");

      let targetSection: Section | undefined;
      let overLesson: Lesson | undefined;

      if (isEndZone) {
        const match = overIdStr.match(/^section-(.+)-end$/);
        const sectionId = match ? match[1] : null;
        if (sectionId) {
          targetSection = sectionsData.find((s) => s.id === sectionId);
        }
      } else {
        targetSection = sectionsData.find(
          (s) => s.id === over.id || s.lessons.some((l) => l.id === over.id)
        );
        if (targetSection) {
          overLesson = targetSection.lessons.find((l) => l.id === over.id);
        }
      }

      if (!targetSection) return;

      const sourceSection = sectionsData.find((s) =>
        s.lessons.some((l) => l.id === active.id)
      );
      if (!sourceSection) return;

      const currentIndex = sourceSection.lessons.findIndex(
        (l) => l.id === activeLes!.id
      );

      let newTargetLessons: Lesson[];
      let newPosition: number;
      let hasChanged = false;

      if (overLesson) {
        const targetIndex = targetSection.lessons.indexOf(overLesson);
        if (sourceSection.id === targetSection.id) {
          if (targetIndex === currentIndex) return;
          newTargetLessons = [...sourceSection.lessons];
          const [removedLesson] = newTargetLessons.splice(currentIndex, 1);

          if (currentIndex < targetIndex) {
            const insertIndex = targetIndex - 1;
            newTargetLessons.splice(insertIndex + 1, 0, removedLesson);
            newPosition = insertIndex + 1;
          } else {
            newTargetLessons.splice(targetIndex, 0, removedLesson);
            newPosition = targetIndex;
          }

          if (newPosition === currentIndex) return;
          hasChanged = true;
        } else {
          newTargetLessons = [...targetSection.lessons];
          newTargetLessons.splice(targetIndex, 0, activeLes);
          newPosition = targetIndex;
          hasChanged = true;
        }
      } else {
        if (sourceSection.id === targetSection.id) return;
        newTargetLessons = [...targetSection.lessons, activeLes];
        newPosition = newTargetLessons.length - 1;
        hasChanged = true;
      }

      if (!hasChanged) return;

      const sourceLessons =
        sourceSection.id === targetSection.id
          ? newTargetLessons
          : sourceSection.lessons.filter((l) => l.id !== active.id);
      const finalTargetLessons = newTargetLessons;

      const newSections = sectionsData.map((s) => {
        if (s.id === sourceSection.id) return { ...s, lessons: sourceLessons };
        if (s.id === targetSection!.id && sourceSection.id !== targetSection!.id) {
          return { ...s, lessons: finalTargetLessons };
        }
        return s;
      });

      await mutate(
        (current) => (current ? { ...current, sections: newSections } : current),
        { revalidate: false }
      );

      try {
        await api.put(`/lecturer/lessons/${activeLes.id}/move`, {
          section_id: targetSection.id,
          position: newPosition,
        });
        showToast.success("Đã cập nhật vị trí bài học");
      } catch {
        showToast.error("Không thể di chuyển bài học");
        mutate();
      }
    }
  };

  // CRUD handlers
  const handleCreateSection = async () => {
    const trimmed = newSectionTitle.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await api.post<ApiSection>(
        `/lecturer/chapters/${courseId}/section`,
        { title: trimmed }
      );
      const newSection: Section = {
        id: response.data.section_id,
        title: response.data.section_title,
        lessons: [],
      };
      await mutate(
        (current) =>
          current
            ? { ...current, sections: [...current.sections, newSection] }
            : current,
        { revalidate: false }
      );
      setNewSectionTitle("");
      setIsCreatingSection(false);
      showToast.success("Đã tạo chương học mới");
    } catch {
      showToast.error("Không thể tạo chương học mới");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSection = async (sectionId: string) => {
    const trimmed = editSectionTitle.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await api.put<ApiSection>(
        `/lecturer/chapters/${sectionId}/edit`,
        { title: trimmed }
      );
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                sections: current.sections.map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        id: response.data.section_id,
                        title: response.data.section_title,
                      }
                    : s
                ),
              }
            : current,
        { revalidate: false }
      );
      setEditSectionTitle("");
      setIsEditingSection(null);
      showToast.success("Đã cập nhật tên chương học");
    } catch {
      showToast.error("Không thể cập nhật tên chương học");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClickDeleteSection = (sectionId: string) => {
    const section = sectionsData.find((s) => s.id === sectionId);
    if (section && section.lessons.length > 0) {
      showToast.error(
        "Không thể xóa chương học vì vẫn còn bài học bên trong. Vui lòng xóa hoặc chuyển các bài học trước."
      );
      return;
    }
    setSectionToDelete(sectionId);
  };

  const handleDeleteSection = async () => {
    if (!sectionToDelete || isSubmitting) return;
    const section = sectionsData.find((s) => s.id === sectionToDelete);
    if (section && section.lessons.length > 0) {
      showToast.error("Không thể xóa chương học còn chứa bài học.");
      setSectionToDelete(null);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.delete(`/lecturer/chapters/${sectionToDelete}/delete`);
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                sections: current.sections.filter((s) => s.id !== sectionToDelete),
              }
            : current,
        { revalidate: false }
      );
      setSectionToDelete(null);
      showToast.success("Đã xóa chương học");
    } catch {
      showToast.error("Không thể xóa chương học");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLesson = async (sectionId: string) => {
    const trimmed = newLessonTitle.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await api.post<ApiLesson>(
        `/lecturer/chapters/sections/${sectionId}/lessons`,
        {
          title: trimmed,
          lesson_type: "video",
        }
      );
      const newLesson: Lesson = {
        id: response.data.lesson_id,
        title: response.data.lesson_title,
        lesson_type: response.data.lesson_type || "video",
      };
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                sections: current.sections.map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        lessons: [
                          ...s.lessons.filter((l) => l.id !== newLesson.id),
                          newLesson,
                        ],
                      }
                    : s
                ),
              }
            : current,
        { revalidate: false }
      );
      setNewLessonTitle("");
      setIsCreatingLesson(null);
      showToast.success("Đã thêm bài học mới");
    } catch {
      showToast.error("Không thể thêm bài học mới");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLesson = async (lessonId: string) => {
    const trimmed = editLessonTitle.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.put(`/lecturer/lessons/${lessonId}/rename`, {
        title: trimmed,
      });
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                sections: current.sections.map((s) => ({
                  ...s,
                  lessons: s.lessons.map((l) =>
                    l.id === lessonId ? { ...l, title: trimmed } : l
                  ),
                })),
              }
            : current,
        { revalidate: false }
      );
      setEditLessonTitle("");
      setIsEditingLesson(null);
      showToast.success("Đã đổi tên bài học");
    } catch {
      showToast.error("Không thể đổi tên bài học");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!lessonToDelete || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/lecturer/lessons/${lessonToDelete}`);
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                sections: current.sections.map((s) => ({
                  ...s,
                  lessons: s.lessons.filter((l) => l.id !== lessonToDelete),
                })),
              }
            : current,
        { revalidate: false }
      );
      setLessonToDelete(null);
      showToast.success("Đã xóa bài học");
    } catch {
      showToast.error("Không thể xóa bài học");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLessonDetails = (lessonId: string) => {
    router.push(`/lecturer/lessons/${lessonId}/edit`);
  };

  const handlePreviewLesson = (lessonId: string) => {
    router.push(`/lecturer/lessons/${lessonId}/preview`);
  };

  const handleManageResources = (lessonId: string) => {
    router.push(`/lecturer/resources?lesson_id=${lessonId}`);
  };

  const handleManageQuiz = (lessonId: string) => {
    router.push(
      `/lecturer/quizzes-lesson?${new URLSearchParams({
        lesson_id: lessonId,
        course_id: courseId,
      }).toString()}`
    );
  };

  const deletingSectionObj = sectionToDelete
    ? sectionsData.find((s) => s.id === sectionToDelete)
    : null;
  const deletingLessonObj = useMemo(() => {
    if (!lessonToDelete) return null;
    for (const s of sectionsData) {
      const found = s.lessons.find((l) => l.id === lessonToDelete);
      if (found) return found;
    }
    return null;
  }, [lessonToDelete, sectionsData]);

  if (!courseId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Alert variant="warning" title="Chưa chọn khóa học">
          <p>Vui lòng chọn khóa học trước khi quản lý chương và bài học.</p>
          <Button
            className="mt-4"
            onClick={() => router.push("/lecturer/courses")}
          >
            Danh sách khóa học
          </Button>
        </Alert>
      </div>
    );
  }

  const courseStatusBadge = translateCourseStatus(
    courseBrief?.approval_status || courseBrief?.status
  );
  const avgLessonsPerSection =
    displaySections.length > 0
      ? (health.totalLessons / displaySections.length).toFixed(1)
      : "0";

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-8">
        {/* Top Bar điều hướng 1 chạm */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/lecturer/courses"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm font-medium text-muted-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Danh sách khóa học</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/lecturer/courses/${courseId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Thông tin khóa học</span>
            </Link>
            <Link
              href={`/lecturer/courses/${courseId}/users`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Học viên</span>
            </Link>
            <Link
              href={`/lecturer/courses/${courseId}/stats`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Thống kê</span>
            </Link>
          </div>
        </div>

        {/* Cloudy Blue Curriculum Studio Hero */}
        <section className="relative mb-6 overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/85 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.14)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/70 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-primary-pastel/40 blur-3xl"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-xs">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Xưởng dựng giáo trình</span>
                </span>
                {courseBrief && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${courseStatusBadge.className}`}
                  >
                    {courseStatusBadge.label}
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {courseBrief?.title || "Quản lý chương & bài học"}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Kéo thả trực quan để sắp xếp thứ tự chương học và bài giảng, chuyển linh hoạt giữa{" "}
                <strong className="font-semibold text-foreground">Bảng Kanban</strong> và{" "}
                <strong className="font-semibold text-foreground">Lộ trình dọc</strong>.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    setIsCreatingSection(true);
                    setNewSectionTitle("");
                  }}
                >
                  Thêm chương học mới
                </Button>
                {displaySections.length > 0 && (
                  <Button
                    variant="outline"
                    size="md"
                    leftIcon={
                      viewMode === "board" ? (
                        <List className="h-4 w-4" />
                      ) : (
                        <LayoutGrid className="h-4 w-4" />
                      )
                    }
                    onClick={() =>
                      setParam("view", viewMode === "board" ? "outline" : "board")
                    }
                  >
                    {viewMode === "board"
                      ? "Xem dạng lộ trình dọc"
                      : "Xem dạng bảng Kanban"}
                  </Button>
                )}
              </div>
            </div>

            {/* Thẻ Sức khỏe Giáo trình SVG */}
            <div className="flex items-center gap-4 rounded-2xl border border-primary-pastel/70 bg-surface/90 p-4 shadow-sm backdrop-blur-xs lg:min-w-[330px] lg:max-w-[380px]">
              <ReadinessRing score={health.score} label={health.label} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Sức khỏe giáo trình
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {health.totalLessons} bài học trong {displaySections.length} chương
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {health.hint}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bento 4 Chỉ số & Thanh Phân Bổ Định Dạng */}
        {!isLoading && !error && (
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* 4 thẻ KPI pastel */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-7">
              <div className="rounded-2xl border border-primary-pastel/80 bg-surface p-4 shadow-xs transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Tổng chương
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {displaySections.length}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {health.emptySectionCount > 0
                    ? `${health.emptySectionCount} chương chưa có bài`
                    : "Tất cả đều có nội dung"}
                </p>
              </div>

              <div className="rounded-2xl border border-info-border bg-surface p-4 shadow-xs transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Tổng bài học
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-info-border bg-info-bg text-info-foreground">
                    <Play className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {health.totalLessons}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {health.typeCounts.video} video bài giảng
                </p>
              </div>

              <div className="rounded-2xl border border-success-border bg-surface p-4 shadow-xs transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    TB bài / chương
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-success-border bg-success-bg text-success-foreground">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {avgLessonsPerSection}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Nhịp độ phân bổ chương
                </p>
              </div>

              <div className="rounded-2xl border border-accent-border bg-surface p-4 shadow-xs transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Thực hành
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-border bg-accent text-accent-foreground">
                    <Target className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {health.practiceCount}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Chiếm {health.practiceRatio}% giáo trình
                </p>
              </div>
            </div>

            {/* Thanh Phân Bổ Định Dạng Giáo Trình (Curriculum Mix Bar) */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs lg:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phân bổ định dạng bài học
                </span>
                {typeFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setParam("type", "all")}
                    className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                  >
                    Xem tất cả
                  </button>
                )}
              </div>

              {/* Thanh màu nhiều phân đoạn */}
              <div className="my-3 flex h-3 w-full overflow-hidden rounded-full bg-surface-muted p-0.5">
                {health.totalLessons === 0 ? (
                  <div className="h-full w-full rounded-full bg-border/60" />
                ) : (
                  (Object.keys(LESSON_TYPE_META) as LessonTypeKey[]).map((key) => {
                    const count = health.typeCounts[key];
                    if (count === 0) return null;
                    const pct = (count / health.totalLessons) * 100;
                    const meta = LESSON_TYPE_META[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        title={`${meta.label}: ${count} bài (${Math.round(pct)}%)`}
                        onClick={() =>
                          setParam("type", typeFilter === key ? "all" : key)
                        }
                        style={{ width: `${pct}%` }}
                        className={`h-full cursor-pointer transition-opacity first:rounded-l-full last:rounded-r-full ${meta.barClass} ${
                          typeFilter !== "all" && typeFilter !== key
                            ? "opacity-30"
                            : "opacity-95 hover:opacity-100"
                        }`}
                      />
                    );
                  })
                )}
              </div>

              {/* Legend pills bấm để lọc nhanh */}
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(LESSON_TYPE_META) as LessonTypeKey[]).map((key) => {
                  const meta = LESSON_TYPE_META[key];
                  const count = health.typeCounts[key];
                  const isActive = typeFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setParam("type", isActive ? "all" : key)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : `${meta.badgeClass} hover:opacity-90`
                      }`}
                    >
                      <span>{meta.shortLabel}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                          isActive ? "bg-white/25 text-white" : "bg-surface/80"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Thanh công cụ Studio: Tìm kiếm + Lọc định dạng + Đổi chế độ xem + Thu gọn tất cả */}
        {!isLoading && !error && (
          <div className="mb-4 rounded-2xl border border-border bg-surface p-3.5 shadow-xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Ô tìm kiếm */}
              <div className="relative flex-1 lg:max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitSearchNow();
                  }}
                  placeholder="Tìm tên chương hoặc bài học..."
                  className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {searchInput && (
                  <button
                    type="button"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={() => commitSearchNow("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-primary-light hover:text-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Bộ lọc định dạng dạng Segmented Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {TYPE_FILTER_TABS.map((tab) => {
                  const active = typeFilter === tab.key;
                  const count =
                    tab.key === "all"
                      ? health.totalLessons
                      : health.typeCounts[tab.key];
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setParam("type", tab.key)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-surface-muted text-muted-foreground hover:bg-primary-light/60 hover:text-primary"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                          active
                            ? "bg-white/25 text-white"
                            : "bg-surface text-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Chuyển đổi chế độ xem & Thu gọn tất cả */}
              <div className="flex items-center gap-2">
                {displaySections.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleAllCollapse}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
                  >
                    {allCollapsed ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    <span>{allCollapsed ? "Mở tất cả" : "Thu gọn"}</span>
                  </button>
                )}

                <div className="inline-flex rounded-xl border border-border bg-background p-1">
                  <button
                    type="button"
                    onClick={() => setParam("view", "board")}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      viewMode === "board"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Bảng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setParam("view", "outline")}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      viewMode === "outline"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>Lộ trình</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Thông báo tạm khóa kéo thả khi đang lọc */}
            {isFiltering && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning-border bg-warning-bg/70 px-3.5 py-2 text-xs text-warning-foreground">
                <span>
                  Đang lọc nội dung (tìm thấy{" "}
                  <strong>{filteredSections.length}</strong> chương khớp). Tạm khóa kéo thả sắp xếp để bảo toàn thứ tự gốc.
                </span>
                <button
                  type="button"
                  onClick={() => resetParams()}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-surface px-2.5 py-1 font-semibold text-warning-foreground shadow-xs hover:bg-surface-muted"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Xóa bộ lọc</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Thanh Mục Lục Nhảy Nhanh (Chapter Jump Strip) */}
        {!isLoading && !error && filteredSections.length > 1 && (
          <div
            className="mb-5 flex items-center gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "thin" }}
          >
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Nhảy nhanh:
            </span>
            {filteredSections.map((sec) => {
              const num = sectionIndexMap.get(sec.id) ?? 1;
              const isFocused = focusedSectionId === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    isFocused
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary"
                  }`}
                >
                  <span
                    className={`font-bold ${
                      isFocused ? "text-white" : "text-primary"
                    }`}
                  >
                    {String(num).padStart(2, "0")}
                  </span>
                  <span className="max-w-[140px] truncate">{sec.title}</span>
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      isFocused
                        ? "bg-white/25 text-white"
                        : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {sec.lessons.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="p-12 text-center">
            <div className="mb-4 inline-block h-11 w-11 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-muted-foreground">
              Đang tải cấu trúc chương & bài học...
            </p>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" title="Không thể tải danh sách chương học">
            <div className="mt-3">
              <Button variant="destructive" size="sm" onClick={() => mutate()}>
                Thử lại
              </Button>
            </div>
          </Alert>
        )}

        {/* Form tạo chương học mới ở chế độ Outline (hoặc khi chưa có chương nào) */}
        {!isLoading &&
          !error &&
          isCreatingSection &&
          (viewMode === "outline" || displaySections.length === 0) && (
            <Card className="mb-5 border-2 border-primary-pastel bg-primary-light/25 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primary">
                    Tạo chương học mới
                  </label>
                  <input
                    type="text"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="Ví dụ: Chương 1 — Nhập môn & Cài đặt môi trường..."
                    className="w-full rounded-xl border border-primary-pastel bg-surface px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateSection();
                      else if (e.key === "Escape") {
                        setIsCreatingSection(false);
                        setNewSectionTitle("");
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 sm:pt-5">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleCreateSection}
                    disabled={!newSectionTitle.trim() || isSubmitting}
                    leftIcon={<Check className="h-4 w-4" />}
                  >
                    Tạo chương
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setIsCreatingSection(false);
                      setNewSectionTitle("");
                    }}
                    leftIcon={<X className="h-4 w-4" />}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            </Card>
          )}
      </div>

      {/* Vùng DndContext chính: Chế độ Bảng Kanban HOẶC Lộ trình Dọc */}
      {!isLoading && !error && (
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {filteredSections.length === 0 && isFiltering ? (
            <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
              <Card className="p-10">
                <EmptyState
                  icon={<Search className="h-8 w-8 text-primary" />}
                  title="Không tìm thấy chương hoặc bài học phù hợp"
                  description="Thử đổi từ khóa tìm kiếm hoặc chọn lại định dạng bài học khác."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<RotateCcw className="h-4 w-4" />}
                      onClick={() => resetParams()}
                    >
                      Xóa bộ lọc
                    </Button>
                  }
                />
              </Card>
            </div>
          ) : viewMode === "board" ? (
            /* ===== CHẾ ĐỘ BẢNG KANBAN NGANG ===== */
            <div
              className="w-full overflow-x-auto pb-6"
              style={{ scrollbarWidth: "thin" }}
            >
              <div
                className={`flex px-4 sm:px-6 lg:px-8 ${
                  filteredSections.length > 0 && filteredSections.length <= 3
                    ? "justify-center"
                    : "justify-start"
                }`}
              >
                <div className="flex min-w-max gap-5 py-2">
                  {filteredSections.length > 0 && (
                    <SortableContext
                      key={`sections-board-${courseId}-${filteredSections.length}`}
                      items={filteredSections.map((s) => s.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {filteredSections.map((section) => (
                        <SectionColumn
                          key={`${courseId}-${section.id}`}
                          registerRef={(el) => {
                            sectionRefs.current[section.id] = el;
                          }}
                          section={section}
                          sectionNumber={sectionIndexMap.get(section.id) ?? 1}
                          viewMode="board"
                          dndDisabled={isFiltering}
                          isCollapsed={Boolean(collapsedSections[section.id])}
                          isFocused={focusedSectionId === section.id}
                          onToggleCollapse={() => toggleCollapseSection(section.id)}
                          isHighlighted={
                            overSectionId === section.id && activeType === "lesson"
                          }
                          isEditing={isEditingSection === section.id}
                          editTitle={editSectionTitle}
                          onEditTitleChange={setEditSectionTitle}
                          onStartEdit={() => {
                            setIsEditingSection(section.id);
                            setEditSectionTitle(section.title);
                          }}
                          onCancelEdit={() => {
                            setIsEditingSection(null);
                            setEditSectionTitle("");
                          }}
                          onSaveEdit={() => handleUpdateSection(section.id)}
                          onDelete={() => handleClickDeleteSection(section.id)}
                          isCreatingLesson={isCreatingLesson === section.id}
                          newLessonTitle={newLessonTitle}
                          onNewLessonTitleChange={setNewLessonTitle}
                          onStartQuickLesson={() => {
                            setIsCreatingLesson(section.id);
                            setNewLessonTitle("");
                            setCollapsedSections((prev) => ({
                              ...prev,
                              [section.id]: false,
                            }));
                          }}
                          onStartFullLesson={() => {
                            router.push(
                              `/lecturer/lessons/create?section_id=${section.id}&course_id=${courseId}`
                            );
                          }}
                          onCancelCreateLesson={() => {
                            setIsCreatingLesson(null);
                            setNewLessonTitle("");
                          }}
                          onCreateLesson={() => handleCreateLesson(section.id)}
                          isEditingLesson={isEditingLesson}
                          editLessonTitle={editLessonTitle}
                          onEditLessonTitleChange={setEditLessonTitle}
                          onStartEditLesson={(lessonId, title) => {
                            setIsEditingLesson(lessonId);
                            setEditLessonTitle(title);
                          }}
                          onCancelEditLesson={() => {
                            setIsEditingLesson(null);
                            setEditLessonTitle("");
                          }}
                          onSaveEditLesson={() => {
                            if (isEditingLesson) handleUpdateLesson(isEditingLesson);
                          }}
                          onDeleteLesson={setLessonToDelete}
                          onEditLessonDetails={handleEditLessonDetails}
                          onPreviewLesson={handlePreviewLesson}
                          onManageResources={handleManageResources}
                          onManageQuiz={handleManageQuiz}
                          overSectionId={overSectionId}
                          overLessonId={overLessonId}
                          activeId={activeId}
                          activeType={activeType}
                          activeLesson={activeLesson}
                          isSubmitting={isSubmitting}
                        />
                      ))}
                    </SortableContext>
                  )}

                  {/* Cột Thêm chương học mới */}
                  {!isFiltering && (
                    <div className="w-[340px] flex-shrink-0">
                      {isCreatingSection ? (
                        <Card className="h-fit border-2 border-primary-pastel bg-surface p-4 shadow-md">
                          <h3 className="mb-3 text-base font-bold text-foreground">
                            Tạo chương học mới
                          </h3>
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={newSectionTitle}
                              onChange={(e) => setNewSectionTitle(e.target.value)}
                              placeholder="Nhập tên chương học..."
                              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreateSection();
                                else if (e.key === "Escape") {
                                  setIsCreatingSection(false);
                                  setNewSectionTitle("");
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={handleCreateSection}
                                disabled={!newSectionTitle.trim() || isSubmitting}
                                leftIcon={<Check className="h-4 w-4" />}
                                className="flex-1"
                              >
                                Tạo chương
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsCreatingSection(false);
                                  setNewSectionTitle("");
                                }}
                                leftIcon={<X className="h-4 w-4" />}
                              >
                                Hủy
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingSection(true);
                            setNewSectionTitle("");
                          }}
                          className="group flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary-pastel bg-surface/80 p-6 transition-all duration-200 hover:border-primary hover:bg-primary-light/40"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light text-primary transition-transform group-hover:scale-110">
                            <Plus className="h-6 w-6" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary">
                              Thêm chương học mới
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Tạo cột mới để tổ chức bài giảng
                            </p>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ===== CHẾ ĐỘ LỘ TRÌNH DỌC (OUTLINE / SYLLABUS) ===== */
            <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-6 lg:px-8">
              <SortableContext
                key={`sections-outline-${courseId}-${filteredSections.length}`}
                items={filteredSections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredSections.map((section) => (
                  <SectionColumn
                    key={`${courseId}-outline-${section.id}`}
                    registerRef={(el) => {
                      sectionRefs.current[section.id] = el;
                    }}
                    section={section}
                    sectionNumber={sectionIndexMap.get(section.id) ?? 1}
                    viewMode="outline"
                    dndDisabled={isFiltering}
                    isCollapsed={Boolean(collapsedSections[section.id])}
                    isFocused={focusedSectionId === section.id}
                    onToggleCollapse={() => toggleCollapseSection(section.id)}
                    isHighlighted={
                      overSectionId === section.id && activeType === "lesson"
                    }
                    isEditing={isEditingSection === section.id}
                    editTitle={editSectionTitle}
                    onEditTitleChange={setEditSectionTitle}
                    onStartEdit={() => {
                      setIsEditingSection(section.id);
                      setEditSectionTitle(section.title);
                    }}
                    onCancelEdit={() => {
                      setIsEditingSection(null);
                      setEditSectionTitle("");
                    }}
                    onSaveEdit={() => handleUpdateSection(section.id)}
                    onDelete={() => handleClickDeleteSection(section.id)}
                    isCreatingLesson={isCreatingLesson === section.id}
                    newLessonTitle={newLessonTitle}
                    onNewLessonTitleChange={setNewLessonTitle}
                    onStartQuickLesson={() => {
                      setIsCreatingLesson(section.id);
                      setNewLessonTitle("");
                      setCollapsedSections((prev) => ({
                        ...prev,
                        [section.id]: false,
                      }));
                    }}
                    onStartFullLesson={() => {
                      router.push(
                        `/lecturer/lessons/create?section_id=${section.id}&course_id=${courseId}`
                      );
                    }}
                    onCancelCreateLesson={() => {
                      setIsCreatingLesson(null);
                      setNewLessonTitle("");
                    }}
                    onCreateLesson={() => handleCreateLesson(section.id)}
                    isEditingLesson={isEditingLesson}
                    editLessonTitle={editLessonTitle}
                    onEditLessonTitleChange={setEditLessonTitle}
                    onStartEditLesson={(lessonId, title) => {
                      setIsEditingLesson(lessonId);
                      setEditLessonTitle(title);
                    }}
                    onCancelEditLesson={() => {
                      setIsEditingLesson(null);
                      setEditLessonTitle("");
                    }}
                    onSaveEditLesson={() => {
                      if (isEditingLesson) handleUpdateLesson(isEditingLesson);
                    }}
                    onDeleteLesson={setLessonToDelete}
                    onEditLessonDetails={handleEditLessonDetails}
                    onPreviewLesson={handlePreviewLesson}
                    onManageResources={handleManageResources}
                    onManageQuiz={handleManageQuiz}
                    overSectionId={overSectionId}
                    overLessonId={overLessonId}
                    activeId={activeId}
                    activeType={activeType}
                    activeLesson={activeLesson}
                    isSubmitting={isSubmitting}
                  />
                ))}
              </SortableContext>
            </div>
          )}

          {/* Drag Overlay */}
          <DragOverlay
            dropAnimation={{ duration: 180, easing: "ease-out" }}
            style={{ cursor: "grabbing" }}
          >
            {activeId && activeType === "section" && activeSection ? (
              <div className="pointer-events-none w-[340px] rounded-2xl border-2 border-primary bg-surface p-4 opacity-95 shadow-2xl">
                <div className="mb-3 flex items-center gap-2.5 border-b border-border/70 pb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary-pastel bg-primary-light text-primary">
                    <GripVertical animated={false} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {activeSection.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeSection.lessons.length} bài học
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {dedupeLessons(activeSection.lessons)
                    .slice(0, 3)
                    .map((lesson) => {
                      const meta = getLessonMeta(lesson.lesson_type);
                      const LessonIcon = meta.Icon;
                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-2.5 rounded-xl border border-border bg-background/70 p-2.5"
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconBoxClass}`}
                          >
                            <LessonIcon
                              animated={false}
                              className={`h-4 w-4 ${meta.iconTextClass}`}
                            />
                          </div>
                          <p className="truncate text-xs font-medium text-foreground">
                            {lesson.title}
                          </p>
                        </div>
                      );
                    })}
                  {activeSection.lessons.length > 3 && (
                    <p className="text-center text-xs text-muted-foreground">
                      +{activeSection.lessons.length - 3} bài học khác
                    </p>
                  )}
                </div>
              </div>
            ) : activeId && activeType === "lesson" && activeLesson ? (
              (() => {
                const meta = getLessonMeta(activeLesson.lesson_type);
                const LessonIcon = meta.Icon;
                return (
                  <div
                    className="pointer-events-none w-[310px] rounded-xl border-2 border-primary bg-surface p-3 opacity-95 shadow-2xl"
                    style={{ transform: "rotate(1.5deg)" }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary-pastel bg-primary-light text-primary">
                        <GripVertical animated={false} className="h-4 w-4" />
                      </div>
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.iconBoxClass}`}
                      >
                        <LessonIcon
                          animated={false}
                          className={`h-4 w-4 ${meta.iconTextClass}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                        >
                          {meta.shortLabel}
                        </span>
                        <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                          {activeLesson.title}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Empty State khi khóa học chưa có chương nào */}
      {!isLoading &&
        !error &&
        displaySections.length === 0 &&
        !isCreatingSection && (
          <div className="mx-auto mt-6 max-w-2xl px-4">
            <Card className="border-primary-pastel/70 bg-surface p-8 text-center">
              <EmptyState
                icon={<BookOpen className="h-8 w-8 text-primary" />}
                title="Chưa có chương học nào"
                description="Bắt đầu tạo chương học đầu tiên để xây dựng lộ trình bài giảng mạch lạc cho học viên!"
                action={
                  <Button
                    variant="primary"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => {
                      setIsCreatingSection(true);
                      setNewSectionTitle("");
                    }}
                  >
                    Tạo chương học đầu tiên
                  </Button>
                }
              />
            </Card>
          </div>
        )}

      {/* Modal xác nhận xóa chương học */}
      {sectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-[0_24px_60px_-16px_rgba(53,111,167,0.28)]">
            <h3 className="font-display text-xl font-bold text-foreground">
              {deletingSectionObj && deletingSectionObj.lessons.length > 0
                ? "Không thể xóa chương học"
                : "Xác nhận xóa chương học"}
            </h3>

            {deletingSectionObj && (
              <p className="mt-2 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm font-semibold text-foreground">
                {deletingSectionObj.title}
              </p>
            )}

            {deletingSectionObj && deletingSectionObj.lessons.length > 0 ? (
              <Alert
                variant="destructive"
                title="Chương học vẫn còn bài học"
                className="mt-4"
              >
                Chương học có {deletingSectionObj.lessons.length} bài học. Vui
                lòng xóa hoặc di chuyển hết bài học trước khi xóa chương.
              </Alert>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Bạn có chắc chắn muốn xóa chương học này? Hành động này không
                thể hoàn tác.
              </p>
            )}

            <div className="mt-6 flex gap-3">
              {!(deletingSectionObj && deletingSectionObj.lessons.length > 0) && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteSection}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Xóa chương
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSectionToDelete(null)}
                className="flex-1"
              >
                {deletingSectionObj && deletingSectionObj.lessons.length > 0
                  ? "Đóng"
                  : "Hủy"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa bài học */}
      {lessonToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-[0_24px_60px_-16px_rgba(53,111,167,0.28)]">
            <h3 className="font-display text-xl font-bold text-foreground">
              Xác nhận xóa bài học
            </h3>
            {deletingLessonObj && (
              <p className="mt-2 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm font-semibold text-foreground">
                {deletingLessonObj.title}
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Bạn có chắc chắn muốn xóa bài học này? Toàn bộ nội dung và liên
              kết của bài học sẽ bị xóa vĩnh viễn.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteLesson}
                disabled={isSubmitting}
                className="flex-1"
              >
                Xóa bài học
              </Button>
              <Button
                variant="outline"
                onClick={() => setLessonToDelete(null)}
                className="flex-1"
              >
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== SECTION COLUMN / OUTLINE CARD =====
function SectionColumn({
  registerRef,
  section,
  sectionNumber,
  viewMode,
  dndDisabled,
  isCollapsed,
  isFocused,
  onToggleCollapse,
  isHighlighted,
  isEditing,
  editTitle,
  onEditTitleChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isCreatingLesson,
  newLessonTitle,
  onNewLessonTitleChange,
  onStartQuickLesson,
  onStartFullLesson,
  onCancelCreateLesson,
  onCreateLesson,
  isEditingLesson,
  editLessonTitle,
  onEditLessonTitleChange,
  onStartEditLesson,
  onCancelEditLesson,
  onSaveEditLesson,
  onDeleteLesson,
  onEditLessonDetails,
  onPreviewLesson,
  onManageResources,
  onManageQuiz,
  overSectionId,
  overLessonId,
  activeId,
  activeType,
  activeLesson,
  isSubmitting,
}: {
  registerRef: (el: HTMLDivElement | null) => void;
  section: Section;
  sectionNumber: number;
  viewMode: "board" | "outline";
  dndDisabled: boolean;
  isCollapsed: boolean;
  isFocused: boolean;
  onToggleCollapse: () => void;
  isHighlighted?: boolean;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (title: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  isCreatingLesson: boolean;
  newLessonTitle: string;
  onNewLessonTitleChange: (title: string) => void;
  onStartQuickLesson: () => void;
  onStartFullLesson: () => void;
  onCancelCreateLesson: () => void;
  onCreateLesson: () => void;
  isEditingLesson: string | null;
  editLessonTitle: string;
  onEditLessonTitleChange: (title: string) => void;
  onStartEditLesson: (lessonId: string, title: string) => void;
  onCancelEditLesson: () => void;
  onSaveEditLesson: () => void;
  onDeleteLesson: (lessonId: string) => void;
  onEditLessonDetails: (lessonId: string) => void;
  onPreviewLesson: (lessonId: string) => void;
  onManageResources: (lessonId: string) => void;
  onManageQuiz: (lessonId: string) => void;
  overSectionId: string | null;
  overLessonId: string | null;
  activeId: string | null;
  activeType: "section" | "lesson" | null;
  activeLesson: Lesson | null;
  isSubmitting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: dndDisabled });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `section-droppable-${section.id}`,
    disabled: dndDisabled,
    data: {
      type: "section",
      sectionId: section.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.45 : 1,
  };

  const uniqueLessons = useMemo(
    () => dedupeLessons(section.lessons),
    [section.lessons]
  );

  const isDropActive =
    isHighlighted || (activeType === "section" && activeId !== section.id && isOver);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDroppableRef(node);
        registerRef(node);
      }}
      style={{
        ...style,
        willChange: isDragging ? "transform" : undefined,
      }}
      className={`rounded-2xl border-2 bg-surface transition-all duration-200 ${
        viewMode === "board" ? "h-fit w-[340px] flex-shrink-0 p-4" : "w-full p-5"
      } ${
        isDragging
          ? "opacity-45"
          : isDropActive
            ? "border-primary bg-primary-light/25 shadow-lg"
            : isFocused
              ? "border-primary shadow-md ring-4 ring-primary/15"
              : "border-border shadow-xs hover:border-primary-pastel/90 hover:shadow-md"
      }`}
    >
      {/* Header của Chương */}
      <div
        className={`${
          !isCollapsed ? "mb-3.5 border-b border-border/70 pb-3.5" : ""
        }`}
      >
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              className="w-full rounded-xl border border-primary-pastel bg-background px-3.5 py-2 text-sm font-bold text-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                else if (e.key === "Escape") onCancelEdit();
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onSaveEdit}
                disabled={!editTitle.trim() || isSubmitting}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Lưu
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
                leftIcon={<X className="h-4 w-4" />}
              >
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              {/* Drag Handle */}
              <div
                {...(dndDisabled ? {} : attributes)}
                {...(dndDisabled ? {} : listeners)}
                title={
                  dndDisabled
                    ? "Tắt bộ lọc để kéo thả sắp xếp chương"
                    : "Kéo thả để sắp xếp chương"
                }
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary transition-transform ${
                  dndDisabled
                    ? "cursor-not-allowed opacity-45"
                    : "cursor-grab hover:scale-105 active:cursor-grabbing"
                }`}
              >
                <GripVertical animated={false} className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    Chương {String(sectionNumber).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    · {uniqueLessons.length} bài học
                  </span>
                </div>
                <h3 className="mt-1 break-words text-base font-bold leading-snug text-foreground">
                  {section.title}
                </h3>
              </div>
            </div>

            {/* Nút hành động header chương */}
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label={isCollapsed ? "Mở rộng chương" : "Thu gọn chương"}
                title={isCollapsed ? "Mở rộng chương" : "Thu gọn chương"}
                onClick={onToggleCollapse}
                className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary-light/60 hover:text-primary"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                aria-label="Đổi tên chương"
                title="Đổi tên chương"
                onClick={onStartEdit}
                className="cursor-pointer rounded-lg p-1.5 text-primary transition-colors hover:bg-primary-light/60"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Xóa chương"
                title="Xóa chương"
                onClick={onDelete}
                className="cursor-pointer rounded-lg p-1.5 text-destructive-foreground transition-colors hover:bg-destructive-bg"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danh sách bài học trong chương */}
      {!isCollapsed && (
        <div>
          <div
            className={`space-y-2.5 ${
              viewMode === "board"
                ? "max-h-[580px] min-h-[84px] overflow-y-auto pr-1"
                : "min-h-[48px]"
            }`}
            style={{ scrollbarWidth: "thin" }}
          >
            <SortableContext
              key={`lessons-${section.id}-${uniqueLessons.length}`}
              items={uniqueLessons.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {uniqueLessons.length === 0 && !isCreatingLesson ? (
                <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    Chương này chưa có bài học nào.
                  </p>
                </div>
              ) : (
                uniqueLessons.map((lesson, idx) => {
                  const showPlaceholderBefore =
                    overSectionId === section.id &&
                    activeType === "lesson" &&
                    activeId &&
                    activeLesson &&
                    !section.lessons.some((l) => l.id === activeId) &&
                    overLessonId === lesson.id;

                  return (
                    <div key={`${section.id}-${lesson.id}`}>
                      {showPlaceholderBefore && (
                        <div className="mb-2.5 flex min-h-[72px] items-center justify-center rounded-xl border border-dashed border-primary bg-primary-light/40">
                          <div className="flex items-center gap-2 text-primary">
                            <GripVertical animated={false} className="h-4 w-4" />
                            <span className="text-xs font-semibold">
                              Thả bài học vào đây
                            </span>
                          </div>
                        </div>
                      )}
                      <LessonCard
                        lesson={lesson}
                        orderCode={`${sectionNumber}.${idx + 1}`}
                        viewMode={viewMode}
                        dndDisabled={dndDisabled}
                        isEditing={isEditingLesson === lesson.id}
                        editTitle={editLessonTitle}
                        onEditTitleChange={onEditLessonTitleChange}
                        onStartEdit={() =>
                          onStartEditLesson(lesson.id, lesson.title)
                        }
                        onCancelEdit={onCancelEditLesson}
                        onSaveEdit={onSaveEditLesson}
                        onDelete={() => onDeleteLesson(lesson.id)}
                        onEditLessonDetails={() => onEditLessonDetails(lesson.id)}
                        onPreviewLesson={() => onPreviewLesson(lesson.id)}
                        onManageResources={() => onManageResources(lesson.id)}
                        onManageQuiz={() => onManageQuiz(lesson.id)}
                        isSubmitting={isSubmitting}
                      />
                    </div>
                  );
                })
              )}
            </SortableContext>

            {/* Form thêm bài học nhanh inline */}
            {isCreatingLesson && (
              <div className="rounded-xl border border-primary-pastel bg-primary-light/25 p-3">
                <input
                  type="text"
                  value={newLessonTitle}
                  onChange={(e) => onNewLessonTitleChange(e.target.value)}
                  placeholder="Nhập tiêu đề bài học (video mặc định)..."
                  className="mb-2.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCreateLesson();
                    else if (e.key === "Escape") onCancelCreateLesson();
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onCreateLesson}
                    disabled={!newLessonTitle.trim() || isSubmitting}
                    leftIcon={<Check className="h-4 w-4" />}
                    className="flex-1"
                  >
                    Thêm nhanh
                  </Button>
                  <Button
                    aria-label="Hủy tạo bài học"
                    variant="outline"
                    size="sm"
                    onClick={onCancelCreateLesson}
                    leftIcon={<X className="h-4 w-4" />}
                  />
                </div>
              </div>
            )}

            {/* End Drop Zone */}
            {!isCreatingLesson && !dndDisabled && (
              <EndDropZone
                sectionId={section.id}
                activeType={activeType}
                activeId={activeId}
                activeLesson={activeLesson}
                sectionLessons={uniqueLessons}
              />
            )}
          </div>

          {/* Nút thêm bài học (2 lựa chọn: Trình tạo đầy đủ + Thêm nhanh) */}
          {!isCreatingLesson && (
            <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
              <button
                type="button"
                onClick={onStartFullLesson}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary-pastel bg-primary-light/30 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-light/70"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tạo bài học</span>
              </button>
              <button
                type="button"
                onClick={onStartQuickLesson}
                title="Thêm nhanh bài học ngay trong chương"
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary-pastel hover:bg-surface-muted hover:text-foreground"
              >
                <Zap className="h-3.5 w-3.5 text-warning-foreground" />
                <span>Nhanh</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== END DROP ZONE =====
function EndDropZone({
  sectionId,
  activeType,
  activeId,
  activeLesson,
  sectionLessons,
}: {
  sectionId: string;
  activeType: "section" | "lesson" | null;
  activeId: string | null;
  activeLesson: Lesson | null;
  sectionLessons: Lesson[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${sectionId}-end`,
    data: {
      type: "section-end",
      sectionId,
    },
  });

  const shouldShow =
    activeType === "lesson" &&
    activeId &&
    activeLesson &&
    !sectionLessons.some((l) => l.id === activeId) &&
    isOver;

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 ${
        shouldShow ? "min-h-[72px]" : "min-h-[6px]"
      }`}
    >
      {shouldShow && (
        <div className="flex min-h-[72px] items-center justify-center rounded-xl border border-dashed border-primary bg-primary-light/40">
          <div className="flex items-center gap-2 text-primary">
            <GripVertical animated={false} className="h-4 w-4" />
            <span className="text-xs font-semibold">Thả vào cuối chương</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== LESSON CARD =====
function LessonCard({
  lesson,
  orderCode,
  viewMode,
  dndDisabled,
  isEditing,
  editTitle,
  onEditTitleChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditLessonDetails,
  onPreviewLesson,
  onManageResources,
  onManageQuiz,
  isSubmitting,
}: {
  lesson: Lesson;
  orderCode: string;
  viewMode: "board" | "outline";
  dndDisabled: boolean;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (title: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onEditLessonDetails: () => void;
  onPreviewLesson: () => void;
  onManageResources: () => void;
  onManageQuiz: () => void;
  isSubmitting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id, disabled: dndDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  const meta = getLessonMeta(lesson.lesson_type);
  const LessonIcon = meta.Icon;
  const isVideo = normalizeLessonType(lesson.lesson_type) === "video";

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        willChange: isDragging ? "transform" : "auto",
      }}
      className={`group rounded-xl border transition-all duration-150 ${
        isDragging
          ? "min-h-[72px] border-dashed border-primary bg-primary-light/30 opacity-55"
          : "border-border bg-surface shadow-xs hover:border-primary-pastel hover:shadow-md"
      }`}
    >
      {isEditing ? (
        <div className="space-y-2.5 p-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            className="w-full rounded-xl border border-primary-pastel bg-background px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              else if (e.key === "Escape") onCancelEdit();
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onSaveEdit}
              disabled={!editTitle.trim() || isSubmitting}
              leftIcon={<Check className="h-3.5 w-3.5" />}
              className="flex-1"
            >
              Lưu
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelEdit}
              leftIcon={<X className="h-3.5 w-3.5" />}
            >
              Hủy
            </Button>
          </div>
        </div>
      ) : isDragging ? (
        <div className="flex min-h-[72px] items-center justify-center text-primary">
          <GripVertical animated={false} className="mr-1.5 h-4 w-4" />
          <span className="text-xs font-semibold">Đang di chuyển...</span>
        </div>
      ) : (
        <div
          className={`p-3 ${
            viewMode === "outline"
              ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              : ""
          }`}
        >
          {/* Nội dung bài học (khu vực kéo thả) */}
          <div
            {...(dndDisabled ? {} : attributes)}
            {...(dndDisabled ? {} : listeners)}
            className={`flex min-w-0 flex-1 items-start gap-2.5 ${
              dndDisabled ? "" : "cursor-grab active:cursor-grabbing"
            }`}
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors group-hover:border-primary-pastel group-hover:bg-primary-light group-hover:text-primary ${
                dndDisabled ? "opacity-40" : ""
              }`}
            >
              <GripVertical animated={false} className="h-3.5 w-3.5" />
            </div>

            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBoxClass}`}
            >
              <LessonIcon
                animated={false}
                className={`h-4 w-4 ${meta.iconTextClass}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] font-bold text-muted-foreground">
                  {orderCode}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${meta.badgeClass}`}
                >
                  {meta.shortLabel}
                </span>
              </div>
              <p className="mt-1 break-words text-sm font-medium leading-snug text-foreground">
                {lesson.title}
              </p>
            </div>
          </div>

          {/* Thanh thao tác nhanh 1 chạm */}
          <div
            className={`flex shrink-0 items-center justify-end gap-1 ${
              viewMode === "board"
                ? "mt-2.5 border-t border-border/60 pt-2"
                : ""
            }`}
          >
            {isVideo && (
              <>
                <button
                  type="button"
                  aria-label="Quản lý tài liệu"
                  title="Quản lý tài liệu"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageResources();
                  }}
                  className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary-light/70 hover:text-primary"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Quản lý câu hỏi trắc nghiệm"
                  title="Quản lý câu hỏi trắc nghiệm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageQuiz();
                  }}
                  className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-warning-bg hover:text-warning-foreground"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              aria-label="Đổi tên bài học"
              title="Đổi tên nhanh"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
              className="cursor-pointer rounded-lg p-1.5 text-primary transition-colors hover:bg-primary-light/70"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Tùy chọn bài học"
                  title="Thêm tùy chọn"
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary-light/70 hover:text-primary"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[210px] rounded-2xl border border-border bg-surface p-1.5 shadow-xl"
                  align="end"
                  sideOffset={6}
                >
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-primary-light/60 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditLessonDetails();
                    }}
                  >
                    <Pencil className="h-4 w-4 text-primary" />
                    <span>Chỉnh sửa chi tiết</span>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-info-bg/70 hover:text-info-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewLesson();
                    }}
                  >
                    <Eye className="h-4 w-4 text-info-foreground" />
                    <span>Xem trước bài học</span>
                  </DropdownMenu.Item>

                  {isVideo && (
                    <>
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-primary-light/60 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onManageResources();
                        }}
                      >
                        <Paperclip className="h-4 w-4 text-primary" />
                        <span>Quản lý tài liệu</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground outline-none transition-colors hover:bg-warning-bg/70 hover:text-warning-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onManageQuiz();
                        }}
                      >
                        <ClipboardList className="h-4 w-4 text-warning-foreground" />
                        <span>Câu hỏi trắc nghiệm</span>
                      </DropdownMenu.Item>
                    </>
                  )}

                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-destructive-foreground outline-none transition-colors hover:bg-destructive-bg"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Xóa bài học</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChaptersManagement;
