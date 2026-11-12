"use client";

import { Alert, Button, Card, EmptyState } from "@/components/ui";
import { showToast } from "@/lib/utils/helpers/toast";

import api from "@/lib/utils/fetcher/client/axios";
import {
  ApiLesson,
  ApiSection,
  ApiSectionsResponse,
  Lesson,
  Section,
  SectionsResponse,
} from "@/types/lecturer/chapter";
import {
  closestCorners,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
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
import {
  BookOpen,
  Check,
  ChevronLeft,
  ClipboardList,
  Code,
  Eye,
  FileText,
  GraduationCap,
  GripVertical,
  HelpCircle,
  MoreVertical,
  Paperclip,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

// Helper function to get lesson icon and color based on lesson_type
const getLessonIcon = (lessonType?: string) => {
  switch (lessonType) {
    case "video":
      return {
        Icon: Play,
        color: "bg-primary-light border border-primary-pastel",
        iconColor: "text-primary",
      };
    case "quiz":
      return {
        Icon: HelpCircle,
        color: "bg-warning-bg border border-warning-border",
        iconColor: "text-warning-foreground",
      };
    case "code":
      return {
        Icon: Code,
        color: "bg-info-bg border border-info-border",
        iconColor: "text-info-foreground",
      };
    case "info":
      return {
        Icon: FileText,
        color: "bg-secondary/60 border border-border",
        iconColor: "text-foreground",
      };
    case "article":
      return {
        Icon: BookOpen,
        color: "bg-success-bg border border-success-border",
        iconColor: "text-success-foreground",
      };
    default:
      return {
        Icon: Play,
        color: "bg-primary-light border border-primary-pastel",
        iconColor: "text-primary",
      };
  }
};

// Helper function to map API response to UI format
const mapApiResponseToSections = (
  apiData: ApiSectionsResponse
): SectionsResponse => {
  return {
    status: "success",
    course_id: apiData.course_id,
    sections: [...apiData.sections]
      .sort((a, b) => a.position - b.position)
      .map((apiSection) => ({
        id: apiSection.section_id,
        title: apiSection.section_title,
        lessons: [...apiSection.lessons]
          .sort((a, b) => a.position - b.position)
          .map((apiLesson) => ({
            id: apiLesson.lesson_id,
            title: apiLesson.lesson_title,
            lesson_type: apiLesson.lesson_type,
          })),
      })),
  };
};

const ChaptersManagement = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course_id") as string;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"section" | "lesson" | null>(
    null
  );
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | null>(null);
  const [overLessonId, setOverLessonId] = useState<string | null>(null);
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

  // Fetch sections
  const { data, error, isLoading, mutate } = useSWR<SectionsResponse>(
    courseId ? `/lecturer/chapters/${courseId}` : null,
    async (url: string) => {
      const response = await api.get<ApiSectionsResponse>(url);
      // Map API response to UI format
      return mapApiResponseToSections(response.data);
    },
    {
      // Tắt tự động refetch khi focus hoặc chuyển trang
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      // Mỗi khóa học có bảng chương riêng; không hiển thị chương của khóa trước.
      keepPreviousData: false,
      // Không tự động refetch nếu data đã stale
      revalidateIfStale: false,
    }
  );

  // Use sections from API
  const sectionsData = data?.sections || [];

  // Tạo displaySections với useMemo để đảm bảo unique và stable reference
  const displaySections = useMemo(() => {
    if (!sectionsData || sectionsData.length === 0) return [];

    const uniqueSections = sectionsData
      .filter(
        (section, index, self) =>
          section.id && index === self.findIndex((s) => s.id === section.id)
      )
      .map((section) => ({
        ...section,
        lessons: (section.lessons || [])
          .filter(
            (lesson, index, self) =>
              lesson.id && index === self.findIndex((l) => l.id === lesson.id)
          )
          .filter((lesson) => lesson.id), // Đảm bảo lesson có id
      }))
      .filter((section) => section.id); // Đảm bảo section có id

    return uniqueSections;
  }, [sectionsData]);

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
  }, [courseId]);

  // Revalidate data when component mounts or courseId changes
  useEffect(() => {
    if (courseId) {
      mutate();
    }
  }, [courseId, mutate]);

  // DnD Sensors - Improved for smoother dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = String(active.id);

    // Set activeId ngay lập tức
    setActiveId(activeIdStr);
    setOverSectionId(null);
    setOverLessonId(null);

    // Tìm lesson từ sectionsData (sử dụng data hiện tại)
    let lesson: Lesson | undefined;
    let isSection = false;

    // Kiểm tra xem có phải là section không
    isSection = sectionsData.some((s) => s.id === activeIdStr);

    if (!isSection) {
      // Nếu không phải section, tìm lesson
      for (const section of sectionsData) {
        lesson = section.lessons.find((l) => l.id === activeIdStr);
        if (lesson) {
          break;
        }
      }
    }

    // Set state dựa trên kết quả
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
      // Không tìm thấy section hoặc lesson, reset state
      setActiveType(null);
      setActiveLesson(null);
      setActiveSection(null);
    }
  };

  // Custom collision detection: khi drag section, chỉ detect section, bỏ qua lessons
  const customCollisionDetection: CollisionDetection = (args) => {
    const { active } = args;

    // Kiểm tra xem có đang drag section không (dựa vào sectionsData)
    const isDraggingSection = sectionsData.some((s) => s.id === active.id);

    // Nếu đang drag section, chỉ detect section containers và section droppable zones
    if (isDraggingSection) {
      const collisions = closestCorners(args);

      // Filter: chỉ giữ lại collisions với section hoặc section-droppable
      return collisions.filter((collision) => {
        const id = collision.id.toString();
        // Giữ section containers (id là section id trong sectionsData)
        if (sectionsData.some((s) => s.id === collision.id)) {
          return true;
        }
        // Giữ section droppable zones
        if (id.startsWith("section-droppable-")) {
          return true;
        }
        // Bỏ qua tất cả lessons và end zones
        return false;
      });
    }

    // Nếu drag lesson, dùng collision detection bình thường
    return closestCorners(args);
  };

  // Handle drag over - highlight section when dragging lesson over it
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      setOverSectionId(null);
      setOverLessonId(null);
      return;
    }

    // Check if we're dragging a section
    const isDraggingSection = sectionsData.some((s) => s.id === active.id);

    // Check if we're dragging a lesson
    const isDraggingLesson = sectionsData.some((s) =>
      s.lessons.some((l) => l.id === active.id)
    );

    // Nếu đang kéo section, track section đang được hover
    if (isDraggingSection) {
      let targetSection: Section | undefined;

      // Kiểm tra xem có phải drop zone của section không
      const overIdStr = String(over.id);
      if (overIdStr.startsWith("section-droppable-")) {
        const sectionId = overIdStr.replace("section-droppable-", "");
        targetSection = sectionsData.find((s) => s.id === sectionId);
      }

      // Nếu không tìm thấy, thử tìm section trực tiếp
      if (!targetSection) {
        targetSection = sectionsData.find((s) => s.id === over.id);
      }

      // Nếu vẫn không tìm thấy, tìm section chứa lesson được hover
      // Nhưng vẫn coi như đang hover vào section đó, không phải lesson
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

    // Chỉ xử lý khi đang kéo lesson
    if (!isDraggingLesson) {
      setOverSectionId(null);
      setOverLessonId(null);
      return;
    }

    // Find which section we're over
    const targetSection =
      displaySections.find((s) => {
        if (s.id === over.id) return true; // Dropped on section
        return s.lessons.some((l) => l.id === over.id); // Dropped on lesson
      }) ||
      sectionsData.find((s) => {
        if (s.id === over.id) return true; // Dropped on section
        return s.lessons.some((l) => l.id === over.id); // Dropped on lesson
      });

    // Chỉ update state khi giá trị thay đổi để tránh re-render không cần thiết
    const newOverSectionId = targetSection?.id || null;
    if (overSectionId !== newOverSectionId) {
      setOverSectionId(newOverSectionId);
    }

    // Track lesson nào đang được hover (để biết insert vào đâu)
    let newOverLessonId: string | null = null;
    if (targetSection) {
      // Nếu hover vào một lesson cụ thể
      const hoveredLesson = targetSection.lessons.find((l) => l.id === over.id);
      if (hoveredLesson) {
        newOverLessonId = hoveredLesson.id;
      }
    }

    // Chỉ update state khi giá trị thay đổi
    if (overLessonId !== newOverLessonId) {
      setOverLessonId(newOverLessonId);
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Lưu overSectionId trước khi reset
    const currentOverSectionId = overSectionId;

    setActiveId(null);
    setActiveType(null);
    setActiveLesson(null);
    setActiveSection(null);
    setOverSectionId(null);
    setOverLessonId(null);

    if (!over || !active) return;

    // Find active item
    let activeSection: Section | undefined;
    let activeLesson: Lesson | undefined;

    for (const section of sectionsData) {
      if (section.id === active.id) {
        activeSection = section;
        break;
      }
      const lesson = section.lessons.find((l) => l.id === active.id);
      if (lesson) {
        activeLesson = lesson;
        activeSection = section;
        break;
      }
    }

    if (!activeSection) return;

    // Handle section drag
    if (activeSection.id === active.id) {
      let overSection: Section | undefined;

      // Ưu tiên dùng currentOverSectionId từ handleDragOver (đã được track chính xác)
      if (currentOverSectionId) {
        overSection = sectionsData.find((s) => s.id === currentOverSectionId);
      }

      // Nếu không có currentOverSectionId, kiểm tra xem có phải drop zone không
      if (!overSection) {
        const overIdStr = String(over.id);
        if (overIdStr.startsWith("section-droppable-")) {
          const sectionId = overIdStr.replace("section-droppable-", "");
          overSection = sectionsData.find((s) => s.id === sectionId);
        }
      }

      // Nếu vẫn không tìm thấy, thử tìm section trực tiếp
      if (!overSection) {
        overSection = sectionsData.find((s) => s.id === over.id);
      }

      // Nếu vẫn không tìm thấy, có thể là lesson trong section - tìm section chứa lesson đó
      if (!overSection) {
        overSection = sectionsData.find((s) =>
          s.lessons.some((l) => l.id === over.id)
        );
      }

      // Nếu không tìm thấy section hợp lệ hoặc drop vào chính nó, không làm gì cả
      if (!overSection || activeSection.id === overSection.id) {
        return;
      }

      const oldIndex = sectionsData.findIndex((s) => s.id === activeSection.id);
      const overIndex = sectionsData.findIndex((s) => s.id === overSection.id);

      // Nếu vị trí không đổi thì không làm gì
      if (oldIndex === overIndex) {
        return;
      }

      // Sử dụng arrayMove để tính toán vị trí chính xác
      const newSections = arrayMove(sectionsData, oldIndex, overIndex);

      // Optimistic update
      await mutate(
        (current) => {
          if (!current) return current;
          return { ...current, sections: newSections };
        },
        { revalidate: false }
      );

      // Call API to reorder sections
      try {
        await api.put(`/lecturer/chapters/${courseId}/sections/reorder`, {
          section_ids: newSections.map((s) => s.id),
        });
      } catch (error) {
        console.error("Error reordering sections:", error);
        mutate(); // Revert on error
      }
      return;
    }

    // Handle lesson drag
    if (activeLesson) {
      // Kiểm tra xem có phải drop vào end zone không
      const overIdStr = String(over.id);
      const isEndZone =
        overIdStr.startsWith("section-") && overIdStr.endsWith("-end");

      let targetSection: Section | undefined;
      let overLesson: Lesson | undefined;

      if (isEndZone) {
        // Drop vào end zone - extract sectionId (format: "section-{sectionId}-end")
        const match = overIdStr.match(/^section-(.+)-end$/);
        const sectionId = match ? match[1] : null;
        if (sectionId) {
          targetSection = sectionsData.find((s) => s.id === sectionId);
        }
        overLesson = undefined; // Không có lesson cụ thể, sẽ thêm vào cuối
      } else {
        // Tìm section theo cách cũ
        targetSection = sectionsData.find((s) => {
          if (s.id === over.id) return true; // Dropped on section
          return s.lessons.some((l) => l.id === over.id); // Dropped on lesson
        });

        // Find which lesson we're over
        if (targetSection) {
          overLesson = targetSection.lessons.find((l) => l.id === over.id);
        }
      }

      // Nếu không tìm thấy section hợp lệ (kéo ra ngoài phạm vi), không làm gì cả
      if (!targetSection) {
        // Reset active states và quay về vị trí ban đầu (không cần update vì chưa optimistic update)
        return;
      }

      // Remove from source
      const sourceSection = sectionsData.find((s) =>
        s.lessons.some((l) => l.id === active.id)
      );
      if (!sourceSection) return;

      // Tìm vị trí hiện tại của lesson trong source section
      const currentIndex = sourceSection.lessons.findIndex(
        (l) => l.id === activeLesson.id
      );

      // Tính toán vị trí mới
      let newTargetLessons: Lesson[];
      let newPosition: number;
      let hasChanged = false;

      if (overLesson) {
        // Thả vào một lesson cụ thể
        const targetIndex = targetSection.lessons.indexOf(overLesson);

        if (sourceSection.id === targetSection.id) {
          // Cùng section: sắp xếp lại trong section

          // Nếu kéo về chính vị trí cũ (targetIndex === currentIndex) thì không làm gì
          if (targetIndex === currentIndex) {
            return;
          }

          // Tính toán vị trí insert mới
          // Logic: Tạo mảng mới, xóa phần tử ở currentIndex, sau đó insert vào vị trí đúng
          newTargetLessons = [...sourceSection.lessons];

          // Xóa lesson ở vị trí hiện tại trước
          const [removedLesson] = newTargetLessons.splice(currentIndex, 1);

          // Tính toán vị trí insert sau khi đã xóa
          // Khi kéo trong cùng section, dnd-kit thường muốn:
          // - Kéo xuống: insert SAU bài được over
          // - Kéo lên: insert TRƯỚC bài được over
          let insertIndex: number;
          if (currentIndex < targetIndex) {
            // Kéo xuống: sau khi xóa ở currentIndex, bài được over sẽ ở vị trí targetIndex - 1
            // Ta muốn insert SAU bài được over, nên insert vào targetIndex
            insertIndex = targetIndex - 1;
            newTargetLessons.splice(insertIndex + 1, 0, removedLesson);
            newPosition = insertIndex + 1;
          } else {
            // Kéo lên: sau khi xóa ở currentIndex, bài được over vẫn ở vị trí targetIndex
            // Ta muốn insert TRƯỚC bài được over, nên insert vào targetIndex
            insertIndex = targetIndex;
            newTargetLessons.splice(insertIndex, 0, removedLesson);
            newPosition = insertIndex;
          }

          // Nếu vị trí cuối cùng giống vị trí ban đầu thì không làm gì
          if (newPosition === currentIndex) {
            return;
          }

          hasChanged = true;
        } else {
          // Khác section: di chuyển sang section khác
          newTargetLessons = [...targetSection.lessons];
          newTargetLessons.splice(targetIndex, 0, activeLesson);
          newPosition = targetIndex;
          hasChanged = true;
        }
      } else {
        // Thả vào section (không phải lesson cụ thể)
        if (sourceSection.id === targetSection.id) {
          // Nếu kéo và thả lại vào chính section đó (không phải lesson cụ thể) thì không làm gì
          return;
        } else {
          // Thêm vào cuối section khác
          newTargetLessons = [...targetSection.lessons, activeLesson];
          newPosition = newTargetLessons.length - 1;
          hasChanged = true;
        }
      }

      // Nếu không có thay đổi thì không làm gì
      if (!hasChanged) {
        return;
      }

      // Tính toán lessons cho source và target
      let sourceLessons: Lesson[];
      let finalTargetLessons: Lesson[];

      if (sourceSection.id === targetSection.id) {
        // Cùng section: chỉ cần dùng newTargetLessons
        sourceLessons = newTargetLessons;
        finalTargetLessons = newTargetLessons;
      } else {
        // Khác section: remove từ source, add vào target
        sourceLessons = sourceSection.lessons.filter((l) => l.id !== active.id);
        finalTargetLessons = newTargetLessons;
      }

      const newSections = sectionsData.map((s) => {
        if (s.id === sourceSection.id) {
          return { ...s, lessons: sourceLessons };
        }
        if (
          s.id === targetSection.id &&
          sourceSection.id !== targetSection.id
        ) {
          return { ...s, lessons: finalTargetLessons };
        }
        return s;
      });

      // Optimistic update
      await mutate(
        (current) => {
          if (!current) return current;
          return { ...current, sections: newSections };
        },
        { revalidate: false }
      );

      // Call API to move lesson
      try {
        await api.put(`/lecturer/lessons/${activeLesson.id}/move`, {
          section_id: targetSection.id,
          position: newPosition,
        });
      } catch (error) {
        console.error("Error moving lesson:", error);
        mutate(); // Revert on error
      }
    }
  };

  // Handle create section
  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) return;

    try {
      const response = await api.post<ApiSection>(
        `/lecturer/chapters/${courseId}/section`,
        {
          title: newSectionTitle.trim(),
        }
      );
      console.log("Created section:", response.data);

      // Optimistic update - map API response to UI format
      const newSection: Section = {
        id: response.data.section_id,
        title: response.data.section_title,
        lessons: [],
      };

      // Update cache immediately
      await mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            sections: [...current.sections, newSection],
          };
        },
        { revalidate: false }
      );

      setNewSectionTitle("");
      setIsCreatingSection(false);
    } catch (error) {
      console.error("Error creating section:", error);
      // Revalidate on error to revert
      mutate();
    }
  };

  // Handle update section
  const handleUpdateSection = async (sectionId: string) => {
    if (!editSectionTitle.trim()) return;

    try {
      const response = await api.put<ApiSection>(
        `/lecturer/chapters/${sectionId}/edit`,
        {
          title: editSectionTitle.trim(),
        }
      );

      // Optimistic update - use API response
      await mutate(
        (current) => {
          if (!current) return current;
          return {
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
          };
        },
        { revalidate: false }
      );

      setEditSectionTitle("");
      setIsEditingSection(null);
    } catch (error) {
      console.error("Error updating section:", error);
      mutate();
    }
  };

  // Handle click delete section - check if section has lessons
  const handleClickDeleteSection = (sectionId: string) => {
    const section = sectionsData.find((s) => s.id === sectionId);
    if (section && section.lessons.length > 0) {
      showToast.error(
        "Không thể xóa chương học này vì chương còn chứa bài học. Vui lòng xóa tất cả bài học trước khi xóa chương."
      );
      return;
    }
    setSectionToDelete(sectionId);
  };

  // Handle delete section
  const handleDeleteSection = async () => {
    if (!sectionToDelete) return;

    // Kiểm tra nếu chương có bài học thì không cho xóa
    const section = sectionsData.find((s) => s.id === sectionToDelete);
    if (section && section.lessons.length > 0) {
      showToast.error(
        "Không thể xóa chương học này vì chương còn chứa bài học. Vui lòng xóa tất cả bài học trước khi xóa chương."
      );
      setSectionToDelete(null);
      return;
    }

    try {
      await api.delete(`/lecturer/chapters/${sectionToDelete}/delete`);

      // Optimistic update
      await mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            sections: current.sections.filter((s) => s.id !== sectionToDelete),
          };
        },
        { revalidate: false }
      );

      setSectionToDelete(null);
    } catch (error) {
      console.error("Error deleting section:", error);
      mutate();
    }
  };

  // Handle create lesson
  const handleCreateLesson = async (sectionId: string) => {
    if (!newLessonTitle.trim()) return;

    try {
      const response = await api.post<ApiLesson>(
        `/lecturer/chapters/sections/${sectionId}/lessons`,
        {
          title: newLessonTitle.trim(),
          lesson_type: "video",
        }
      );

      // Map API response to UI format
      const newLesson: Lesson = {
        id: response.data.lesson_id,
        title: response.data.lesson_title,
      };

      // Optimistic update - đảm bảo không có duplicate lessons
      await mutate(
        (current) => {
          if (!current) return current;
          return {
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
          };
        },
        { revalidate: false }
      );

      setNewLessonTitle("");
      setIsCreatingLesson(null);
    } catch (error) {
      console.error("Error creating lesson:", error);
      mutate();
    }
  };

  // Handle update lesson
  const handleUpdateLesson = async (lessonId: string) => {
    if (!editLessonTitle.trim()) return;

    try {
      await api.put(`/lecturer/lessons/${lessonId}/rename`, {
        title: editLessonTitle.trim(),
      });

      // Optimistic update
      await mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            sections: current.sections.map((s) => ({
              ...s,
              lessons: s.lessons.map((l) =>
                l.id === lessonId ? { ...l, title: editLessonTitle.trim() } : l
              ),
            })),
          };
        },
        { revalidate: false }
      );

      setEditLessonTitle("");
      setIsEditingLesson(null);
    } catch (error) {
      console.error("Error updating lesson:", error);
      mutate();
    }
  };

  // Handle edit lesson details - navigate to lesson detail page
  const handleEditLessonDetails = (lessonId: string) => {
    router.push(`/lecturer/lessons/${lessonId}/edit`);
  };

  // Handle preview lesson - navigate to preview page
  const handlePreviewLesson = (lessonId: string) => {
    router.push(`/lecturer/lessons/${lessonId}/preview`);
  };

  // Handle manage lesson resources - navigate to resources page
  const handleManageResources = (lessonId: string) => {
    router.push(`/lecturer/lessons/${lessonId}/resources`);
  };

  // Handle manage lesson quiz - navigate to quiz page
  const handleManageQuiz = (lessonId: string) => {
    router.push(`/lecturer/quizzes-lesson?${new URLSearchParams({ lesson_id: lessonId, course_id: courseId })}`);
  };

  // Handle delete lesson
  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;

    try {
      await api.delete(`/lecturer/lessons/${lessonToDelete}`);

      // Optimistic update
      await mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            sections: current.sections.map((s) => ({
              ...s,
              lessons: s.lessons.filter((l) => l.id !== lessonToDelete),
            })),
          };
        },
        { revalidate: false }
      );

      setLessonToDelete(null);
    } catch (error) {
      console.error("Error deleting lesson:", error);
      mutate();
    }
  };

  if (!courseId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Alert variant="warning" title="Chưa chọn khóa học">
          <p>Vui lòng chọn khóa học trước khi quản lý chương và bài học.</p>
          <Button className="mt-4" onClick={() => router.push("/lecturer/courses")}>
            Danh sách khóa học
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2 transition-colors cursor-pointer text-sm font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            Quay lại
          </button>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-2">
            Quản lý chương học
          </h1>
          <p className="text-muted-foreground">
            Quản lý và sắp xếp các chương học và bài học của khóa học
          </p>
        </div>

        {/* Stats */}
        {sectionsData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-light border border-primary-pastel rounded-xl flex items-center justify-center text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng chương học</p>
                  <p className="text-2xl font-bold text-foreground">
                    {sectionsData.length}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-info-bg border border-info-border rounded-xl flex items-center justify-center text-info-foreground">
                  <Play className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng bài học</p>
                  <p className="text-2xl font-bold text-foreground">
                    {sectionsData.reduce(
                      (sum, section) => sum + section.lessons.length,
                      0
                    )}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success-bg border border-success-border rounded-xl flex items-center justify-center text-success-foreground">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Trung bình bài/chương
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {sectionsData.length > 0
                      ? (
                          sectionsData.reduce(
                            (sum, section) => sum + section.lessons.length,
                            0
                          ) / sectionsData.length
                        ).toFixed(1)
                      : "0"}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-muted-foreground">
              Đang tải danh sách chương học...
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
      </div>

      {/* Trello Board - Full Width */}
      <div
        className="w-full overflow-x-auto pb-6"
        style={{ scrollbarWidth: "thin" }}
      >
        <div
          className={`flex px-4 ${
            displaySections.length > 0 && displaySections.length <= 4
              ? "justify-center"
              : "justify-start"
          }`}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 min-w-max py-2">
              {displaySections.length > 0 && (
                <SortableContext
                  key={`sections-${courseId}-${displaySections.length}`}
                  items={displaySections.map((s) => s.id).filter(Boolean)}
                  strategy={horizontalListSortingStrategy}
                >
                  {displaySections.map((section) => (
                    <SectionColumn
                      key={`${courseId}-${section.id}`}
                      section={section}
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
                      onStartCreateLesson={() => {
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
                        if (isEditingLesson) {
                          handleUpdateLesson(isEditingLesson);
                        }
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
                      course_id={data?.course_id || courseId}
                    />
                  ))}
                </SortableContext>
              )}

              {/* Add Section Column - Trello Style */}
              <div className="flex-shrink-0 w-80">
                {isCreatingSection ? (
                  <Card className="p-4 h-fit">
                    <h3 className="text-lg font-bold text-foreground mb-4">
                      Tạo chương học mới
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        placeholder="Nhập tên chương học..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary font-medium text-foreground placeholder:text-muted-foreground"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCreateSection();
                          } else if (e.key === "Escape") {
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
                          disabled={!newSectionTitle.trim()}
                          leftIcon={<Check className="h-4 w-4" />}
                          className="flex-1"
                        >
                          Tạo
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
                    onClick={() => {
                      setIsCreatingSection(true);
                      setNewSectionTitle("");
                    }}
                    className="w-full min-h-[200px] bg-surface/80 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary-light/30 transition-all duration-200 flex flex-col items-center justify-center gap-3 p-6 group cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-primary-light border border-primary-pastel rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Plus className="h-6 w-6" />
                    </div>
                    <span className="text-muted-foreground font-medium group-hover:text-primary transition-colors">
                      Thêm chương học mới
                    </span>
                  </button>
                )}
              </div>
            </div>

            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: "ease-out",
              }}
              style={{
                cursor: "grabbing",
              }}
            >
              {activeId && activeType === "section" && activeSection ? (
                <div className="flex-shrink-0 w-80 bg-surface rounded-2xl border-2 border-primary-pastel shadow-lg p-4 h-fit opacity-95 pointer-events-none">
                  {/* Section Header */}
                  <div className="mb-4 pb-4 border-b border-border/70">
                    <div className="flex items-start justify-between gap-2">
                      <div className="cursor-grab active:cursor-grabbing flex items-center gap-2 flex-1 group">
                        <div className="w-8 h-8 bg-primary-light border border-primary-pastel rounded-lg flex items-center justify-center text-primary">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-foreground text-lg">
                            {activeSection.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activeSection.lessons.length} bài học
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="p-2 rounded-lg text-primary">
                          <Pencil className="h-4 w-4" />
                        </div>
                        <div className="p-2 rounded-lg text-destructive-foreground">
                          <Trash2 className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lessons List */}
                  <div className="space-y-2 mb-4 min-h-[100px]">
                    {activeSection.lessons
                      .filter(
                        (lesson, index, self) =>
                          index === self.findIndex((l) => l.id === lesson.id)
                      )
                      .slice(0, 3)
                      .map((lesson) => {
                        const { Icon, color, iconColor } = getLessonIcon(
                          lesson.lesson_type
                        );
                        return (
                          <div
                            key={lesson.id}
                            className="bg-surface rounded-xl border border-border shadow-xs p-3"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}
                              >
                                <Icon className={`h-5 w-5 ${iconColor}`} />
                              </div>
                              <p className="text-sm font-medium text-foreground flex-1 leading-relaxed break-words pt-1">
                                {lesson.title}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    {activeSection.lessons.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        +{activeSection.lessons.length - 3} bài học khác
                      </p>
                    )}
                  </div>

                  {/* Add Lesson Button */}
                  <button className="w-full px-3 py-2 text-sm text-muted-foreground rounded-xl transition-colors flex items-center gap-2 justify-center font-medium border border-dashed border-border">
                    <Plus className="h-4 w-4" />
                    Thêm bài học
                  </button>
                </div>
              ) : activeId && activeType === "lesson" && activeLesson ? (
                (() => {
                  const { Icon, color, iconColor } = getLessonIcon(
                    activeLesson.lesson_type
                  );
                  return (
                    <div
                      className="bg-surface rounded-xl border-2 border-primary shadow-xl opacity-95 pointer-events-none"
                      style={{
                        width: "320px",
                        minWidth: "320px",
                        maxWidth: "320px",
                        transform: "rotate(1deg)",
                      }}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-7 h-7 bg-primary-light border border-primary-pastel rounded-lg flex items-center justify-center flex-shrink-0 text-primary">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 flex items-start gap-3">
                            <div
                              className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}
                            >
                              <Icon className={`h-5 w-5 ${iconColor}`} />
                            </div>
                            <p className="text-sm font-medium text-foreground flex-1 leading-relaxed break-words pt-1">
                              {activeLesson.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/70">
                          <div className="p-1.5 rounded-lg text-primary">
                            <Pencil className="h-3.5 w-3.5" />
                          </div>
                          <div className="p-1.5 rounded-lg text-destructive-foreground">
                            <Trash2 className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Empty State */}
        {sectionsData.length === 0 && !isCreatingSection && (
          <Card className="p-8 mt-8">
            <EmptyState
              icon={<BookOpen className="h-8 w-8 text-primary" />}
              title="Chưa có chương học nào"
              description="Bắt đầu tạo chương học đầu tiên để xây dựng nội dung khóa học!"
            />
          </Card>
        )}
      </div>

      {/* Delete Section Modal */}
      {sectionToDelete &&
        (() => {
          const section = sectionsData.find((s) => s.id === sectionToDelete);
          const hasLessons = section && section.lessons.length > 0;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {hasLessons
                    ? "Không thể xóa chương học"
                    : "Xác nhận xóa chương học"}
                </h3>
                {hasLessons ? (
                  <Alert
                    variant="destructive"
                    title="Chương học này còn chứa bài học"
                    className="mb-6"
                  >
                    Chương học có {section?.lessons.length} bài học. Vui lòng
                    xóa tất cả bài học trước khi xóa chương.
                  </Alert>
                ) : (
                  <p className="text-muted-foreground text-sm mb-6">
                    Bạn có chắc chắn muốn xóa chương học này? Hành động này
                    không thể hoàn tác.
                  </p>
                )}
                <div className="flex gap-3">
                  {!hasLessons && (
                    <Button
                      variant="destructive"
                      onClick={handleDeleteSection}
                      className="flex-1"
                    >
                      Xóa
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSectionToDelete(null)}
                    className={hasLessons ? "w-full" : "flex-1"}
                  >
                    {hasLessons ? "Đóng" : "Hủy"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Delete Lesson Modal */}
      {lessonToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              Xác nhận xóa bài học
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Bạn có chắc chắn muốn xóa bài học này? Hành động này không thể
              hoàn tác.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteLesson}
                className="flex-1"
              >
                Xóa
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

// Section Column Component (Trello Column)
function SectionColumn({
  section,
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
  onStartCreateLesson,
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
  overSectionId,
  overLessonId,
  activeId,
  activeType,
  activeLesson,
  course_id,
}: {
  section: Section;
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
  onStartCreateLesson: () => void;
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
  course_id: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  // Thêm droppable zone cho section để dễ detect khi drag section khác qua
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `section-droppable-${section.id}`,
    data: {
      type: "section",
      sectionId: section.id,
    },
  });

  const router = useRouter();
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDroppableRef(node);
      }}
      style={{
        ...style,
        willChange: isDragging ? "transform" : undefined,
      }}
      className={`flex-shrink-0 w-80 bg-surface rounded-2xl border-2 shadow-xs hover:shadow-md p-4 h-fit ${
        isDragging
          ? "opacity-50"
          : isHighlighted ||
            (activeType === "section" && activeId !== section.id && isOver)
          ? "border-primary shadow-lg bg-primary-light/20 transition-colors duration-150"
          : "border-border transition-colors duration-150"
      }`}
    >
      {/* Section Header */}
      <div className="mb-4 pb-4 border-b border-border/70">
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary font-bold text-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSaveEdit();
                } else if (e.key === "Escape") {
                  onCancelEdit();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onSaveEdit}
                disabled={!editTitle.trim()}
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
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing flex items-center gap-2 flex-1 group"
            >
              <div className="w-8 h-8 bg-primary-light border border-primary-pastel rounded-lg flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-lg">
                  {section.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {section.lessons.length} bài học
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onStartEdit}
                className="p-2 hover:bg-primary-light/60 rounded-lg transition-colors group cursor-pointer"
                title="Chỉnh sửa"
              >
                <Pencil className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 hover:bg-destructive-bg rounded-lg transition-colors group cursor-pointer"
                title="Xóa"
              >
                <Trash2 className="h-4 w-4 text-destructive-foreground group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lessons List */}
      <div className="space-y-2 mb-4 min-h-[100px] max-h-[600px] overflow-y-auto pr-1">
        <SortableContext
          key={`lessons-${section.id}-${section.lessons.length}`}
          items={section.lessons
            .filter((lesson) => lesson.id)
            .filter(
              (lesson, index, self) =>
                index === self.findIndex((l) => l.id === lesson.id)
            )
            .map((l) => l.id)
            .filter(Boolean)}
          strategy={verticalListSortingStrategy}
        >
          {section.lessons
            .filter((lesson) => lesson.id)
            .filter(
              (lesson, index, self) =>
                index === self.findIndex((l) => l.id === lesson.id)
            )
            .map((lesson) => {
              // Kiểm tra xem có hiển thị placeholder trước lesson này không
              const showPlaceholderBefore =
                overSectionId === section.id &&
                activeType === "lesson" &&
                activeId &&
                activeLesson &&
                !section.lessons.some((l) => l.id === activeId) &&
                overLessonId === lesson.id;

              return (
                <div key={`${section.id}-${lesson.id}`}>
                  {/* Placeholder trước lesson được hover */}
                  {showPlaceholderBefore && (
                    <div className="rounded-xl border border-dashed border-primary bg-primary-light/40 mb-2 min-h-[80px] flex items-center justify-center">
                      <div className="flex items-center gap-2 text-primary">
                        <div className="w-6 h-6 bg-primary-light rounded-lg flex items-center justify-center">
                          <GripVertical className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">
                          Thả vào đây
                        </span>
                      </div>
                    </div>
                  )}
                  <LessonCard
                    lesson={lesson}
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
                    onManageResources={() =>
                      router.push(`/lecturer/resources?lesson_id=${lesson.id}`)
                    }
                    onManageQuiz={() =>
                      router.push(
                        `/lecturer/quizzes-lesson?lesson_id=${lesson.id}&course_id=${course_id}`
                      )
                    }
                  />
                </div>
              );
            })}
        </SortableContext>

        {/* Create Lesson Form */}
        {isCreatingLesson && (
          <div className="bg-background rounded-xl p-3 border border-border shadow-xs">
            <input
              type="text"
              value={newLessonTitle}
              onChange={(e) => onNewLessonTitleChange(e.target.value)}
              placeholder="Nhập tên bài học..."
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onCreateLesson();
                } else if (e.key === "Escape") {
                  onCancelCreateLesson();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onCreateLesson}
                disabled={!newLessonTitle.trim()}
                leftIcon={<Check className="h-4 w-4" />}
                className="flex-1"
              >
                Thêm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelCreateLesson}
                leftIcon={<X className="h-4 w-4" />}
              />
            </div>
          </div>
        )}

        {/* Drop Zone ở cuối danh sách */}
        {!isCreatingLesson && (
          <EndDropZone
            sectionId={section.id}
            activeType={activeType}
            activeId={activeId}
            activeLesson={activeLesson}
            sectionLessons={section.lessons}
          />
        )}

        {/* Add Lesson Button */}
        {!isCreatingLesson && (
          <button
            onClick={onStartCreateLesson}
            className="w-full px-3 py-2.5 text-sm text-muted-foreground hover:bg-primary-light/50 hover:text-primary rounded-xl transition-colors flex items-center gap-2 justify-center font-medium border border-dashed border-border hover:border-primary cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Thêm bài học
          </button>
        )}
      </div>
    </div>
  );
}

// End Drop Zone Component
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
      className={`mb-2 transition-all duration-200 ${
        shouldShow ? "min-h-[80px]" : "min-h-[0px]"
      }`}
    >
      {shouldShow && (
        <div className="rounded-xl border border-dashed border-primary bg-primary-light/40 min-h-[80px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-primary">
            <div className="w-6 h-6 bg-primary-light rounded-lg flex items-center justify-center">
              <GripVertical className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Thả vào đây</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Lesson Card Component (Trello Card)
function LessonCard({
  lesson,
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
}: {
  lesson: Lesson;
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
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  // Debug: log lesson type để kiểm tra
  // console.log("Lesson type:", lesson.lesson_type, "Lesson:", lesson);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        willChange: isDragging ? "transform" : "auto",
      }}
      className={`rounded-xl border transition-all duration-200 group cursor-grab active:cursor-grabbing ${
        isDragging
          ? "border border-dashed border-primary bg-primary-light/30 opacity-60 min-h-[80px]"
          : "bg-surface border-border shadow-xs hover:shadow-md hover:border-primary-pastel"
      }`}
    >
      {isEditing ? (
        <div className="p-3 space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary font-medium"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSaveEdit();
              } else if (e.key === "Escape") {
                onCancelEdit();
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onSaveEdit}
              disabled={!editTitle.trim()}
              leftIcon={<Check className="h-4 w-4" />}
              className="flex-1"
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
        <div className="p-3">
          {isDragging ? (
            // Placeholder khi đang drag
            <div className="flex items-center justify-center min-h-[60px] opacity-80">
              <div className="flex items-center gap-2 text-primary">
                <div className="w-6 h-6 bg-primary-light rounded-lg flex items-center justify-center">
                  <GripVertical className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Đang di chuyển...</span>
              </div>
            </div>
          ) : (
            <>
              <div
                {...attributes}
                {...listeners}
                className="flex items-start gap-3 mb-3"
              >
                {/* Drag Handle - Always visible */}
                <div className="w-7 h-7 bg-primary-light border border-primary-pastel rounded-lg flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform text-primary">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex items-start gap-3">
                  {/* Lesson Icon */}
                  {(() => {
                    const { Icon, color, iconColor } = getLessonIcon(
                      lesson.lesson_type
                    );
                    return (
                      <div
                        className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                      </div>
                    );
                  })()}

                  {/* Title */}
                  <p className="text-sm font-medium text-foreground flex-1 leading-relaxed break-words pt-1">
                    {lesson.title}
                  </p>
                </div>
              </div>

              {/* Actions - Always visible but subtle */}
              <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/70">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartEdit();
                  }}
                  className="p-1.5 hover:bg-primary-light/60 rounded-lg transition-colors group/btn cursor-pointer"
                  title="Chỉnh sửa tên"
                >
                  <Pencil className="h-3.5 w-3.5 text-primary group-hover/btn:scale-110 transition-transform" />
                </button>

                {/* More Options Dropdown */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-1.5 hover:bg-primary-light/60 rounded-lg transition-colors group/btn cursor-pointer"
                      title="Thêm tùy chọn"
                    >
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground group-hover/btn:text-primary group-hover/btn:scale-110 transition-all" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[200px] bg-surface rounded-xl shadow-lg border border-border p-1.5 z-50"
                      align="end"
                      sideOffset={5}
                    >
                      <DropdownMenu.Item
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-primary-light/60 hover:text-primary cursor-pointer outline-none transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditLessonDetails();
                        }}
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                        <span>Chỉnh sửa chi tiết</span>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-info-bg/70 hover:text-info-foreground cursor-pointer outline-none transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewLesson();
                        }}
                      >
                        <Eye className="h-4 w-4 text-info-foreground" />
                        <span>Xem trước bài học</span>
                      </DropdownMenu.Item>

                      {/* Chỉ hiển thị "Quản lý tài liệu" và "Quản lý câu hỏi trắc nghiệm" cho video lessons */}
                      {lesson.lesson_type === "video" && (
                        <>
                          <DropdownMenu.Separator className="h-px bg-border my-1" />

                          <DropdownMenu.Item
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-primary-light/60 hover:text-primary cursor-pointer outline-none transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onManageResources();
                            }}
                          >
                            <Paperclip className="h-4 w-4 text-primary" />
                            <span>Quản lý tài liệu</span>
                          </DropdownMenu.Item>

                          <DropdownMenu.Item
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-warning-bg/70 hover:text-warning-foreground cursor-pointer outline-none transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onManageQuiz();
                            }}
                          >
                            <ClipboardList className="h-4 w-4 text-warning-foreground" />
                            <span>Quản lý câu hỏi trắc nghiệm</span>
                          </DropdownMenu.Item>
                        </>
                      )}

                      {/* Separator trước nút xóa */}
                      <DropdownMenu.Separator className="h-px bg-border my-1" />

                      <DropdownMenu.Item
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-destructive-foreground rounded-lg hover:bg-destructive-bg cursor-pointer outline-none transition-colors"
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ChaptersManagement;
