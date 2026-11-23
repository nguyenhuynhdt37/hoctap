"use client";

import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { ArrowDown, ArrowUp, BookOpen, Check, Trash2 } from "pulsoicon-react";
import { Badge, Button, Input } from "@/components/ui";
import {
  fetchLearning,
  LoadError,
  price,
} from "@/components/learning-paths/shared";

export type CourseOption = {
  id: string;
  title: string;
  slug?: string;
  base_price: string | number;
  currency: string;
  thumbnail_url?: string | null;
};

export type SelectedCourseItem = {
  course_id: string;
  title: string;
  thumbnail?: string | null;
  list_price?: string | number;
};

export type CourseInfo = {
  id: string;
  title: string;
  price: number;
  currency?: string;
  thumbnail_url?: string | null;
};

const EMPTY_SELECTED_COURSES: SelectedCourseItem[] = [];
const EMPTY_COURSES_INFO: Record<string, CourseInfo> = {};

export default function LecturerCoursePicker({
  value,
  onChange,
  disabled = false,
  selectedCourses = EMPTY_SELECTED_COURSES,
  coursesInfo = EMPTY_COURSES_INFO,
  onCourseSelect,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  selectedCourses?: SelectedCourseItem[];
  coursesInfo?: Record<string, CourseInfo>;
  onCourseSelect?: (course: CourseInfo) => void;
}) {
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [knownCourses, setKnownCourses] = useState<Record<string, CourseInfo>>({});

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(input), 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, error, mutate } = useSWR<{ items: CourseOption[] }>(
    `/lecturer/bundles/course-options?keyword=${encodeURIComponent(keyword)}`,
    fetchLearning,
  );

  // Cập nhật bộ nhớ đệm knownCourses từ dữ liệu API và selectedCourses (chỉ update local state)
  useEffect(() => {
    const updated: Record<string, CourseInfo> = {};

    if (selectedCourses && selectedCourses.length > 0) {
      for (const item of selectedCourses) {
        updated[item.course_id] = {
          id: item.course_id,
          title: item.title,
          price: Number(item.list_price || 0),
          thumbnail_url: item.thumbnail,
        };
      }
    }

    if (data?.items) {
      for (const course of data.items) {
        updated[course.id] = {
          id: course.id,
          title: course.title,
          price: Number(course.base_price || 0),
          currency: course.currency,
          thumbnail_url: course.thumbnail_url,
        };
      }
    }

    if (Object.keys(updated).length > 0) {
      setKnownCourses((prev) => {
        let changed = false;
        for (const [id, info] of Object.entries(updated)) {
          const existing = prev[id];
          if (
            !existing ||
            existing.title !== info.title ||
            existing.price !== info.price ||
            existing.currency !== info.currency ||
            existing.thumbnail_url !== info.thumbnail_url
          ) {
            changed = true;
            break;
          }
        }
        return changed ? { ...prev, ...updated } : prev;
      });
    }
  }, [data, selectedCourses]);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function toggle(course: CourseOption) {
    if (value.includes(course.id)) {
      onChange(value.filter((item) => item !== course.id));
    } else if (value.length < 60) {
      const info: CourseInfo = {
        id: course.id,
        title: course.title,
        price: Number(course.base_price || 0),
        currency: course.currency,
        thumbnail_url: course.thumbnail_url,
      };
      setKnownCourses((prev) => ({
        ...prev,
        [course.id]: info,
      }));
      onCourseSelect?.(info);
      onChange([...value, course.id]);
    }
  }

  // Danh sách các khóa học đã chọn được ánh xạ thông tin
  const selectedList = useMemo(() => {
    return value.map((id) => {
      const info = coursesInfo[id] || knownCourses[id];
      const initial = selectedCourses?.find((c) => c.course_id === id);
      return {
        id,
        title: info?.title || initial?.title || "Khóa học đã chọn",
        price: info?.price ?? Number(initial?.list_price || 0),
        thumbnail: info?.thumbnail_url || initial?.thumbnail || null,
      };
    });
  }, [value, knownCourses, coursesInfo, selectedCourses]);

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      <div>
        <Input
          label="Tìm và thêm khóa học của bạn"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Nhập tên khóa học để tìm kiếm…"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Đã chọn: <strong className="text-foreground">{value.length}</strong> / 60 khóa học
          </span>
          <span>Chọn tối thiểu 2 khóa để tạo lộ trình combo</span>
        </div>
      </div>

      {error && <LoadError error={error} retry={() => mutate()} />}
      {!data && !error && (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải danh sách khóa học…
        </p>
      )}
      {data?.items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Không tìm thấy khóa học nào phù hợp.
        </p>
      )}

      {/* Danh sách các khóa học tìm kiếm được */}
      {data && data.items.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Khóa học sẵn sàng thêm vào combo (nhấp để chọn hoặc bỏ chọn):
          </p>
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {data.items.map((course) => {
              const selected = value.includes(course.id);
              return (
                <li key={course.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(course)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-2.5 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary-light/80 shadow-2xs ring-1 ring-primary/20"
                        : "border-border bg-surface hover:border-primary-pastel hover:bg-surface-muted"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Thumbnail nhỏ 16:9 */}
                      <div className="relative h-11 w-18 shrink-0 overflow-hidden rounded-lg bg-primary-light flex items-center justify-center">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BookOpen className="h-4 w-4 text-primary" />
                        )}
                        {selected && (
                          <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Tiêu đề & giá */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {course.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Giá bán lẻ:{" "}
                          <span className="font-semibold text-primary">
                            {price(course.base_price, course.currency)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Badge trạng thái */}
                    <div className="shrink-0">
                      {selected ? (
                        <Badge variant="primary" size="sm">
                          Đã thêm
                        </Badge>
                      ) : (
                        <Badge variant="outline" size="sm">
                          + Chọn
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Danh sách khóa học đã chọn theo lộ trình thứ tự học */}
      {selectedList.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Thứ tự lộ trình học ({selectedList.length} khóa)
            </h3>
            <span className="text-xs text-muted-foreground">
              Học viên sẽ được hướng dẫn học tuần tự theo thứ tự này
            </span>
          </div>

          <ol aria-label="Thứ tự khóa học trong combo" className="space-y-2">
            {selectedList.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-2.5 shadow-2xs"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* Badge số thứ tự Bước */}
                  <Badge variant="neutral" size="sm" className="font-semibold shrink-0">
                    Bước {index + 1}
                  </Badge>

                  {/* Thumbnail */}
                  <div className="h-10 w-16 shrink-0 overflow-hidden rounded-md bg-primary-light flex items-center justify-center">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <BookOpen animated={false} className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  {/* Tên khóa & giá */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Giá lẻ: <span className="font-medium text-foreground">{price(item.price)}</span>
                    </p>
                  </div>
                </div>

                {/* Các nút điều hướng vị trí */}
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    aria-label={`Đưa khóa ${index + 1} lên trước`}
                    onClick={() => move(index, -1)}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === selectedList.length - 1}
                    aria-label={`Đưa khóa ${index + 1} xuống sau`}
                    onClick={() => move(index, 1)}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Bỏ khóa ${item.title}`}
                    onClick={() => onChange(value.filter((id) => id !== item.id))}
                    className="h-8 w-8 p-0 text-destructive-foreground hover:bg-destructive-bg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </fieldset>
  );
}
