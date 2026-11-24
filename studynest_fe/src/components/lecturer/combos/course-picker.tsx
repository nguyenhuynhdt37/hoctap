"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Coins,
  Layers,
  Search,
  Trash2,
} from "pulsoicon-react";
import { Badge, Button } from "@/components/ui";
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
  const [knownCourses, setKnownCourses] = useState<Record<string, CourseInfo>>(
    {},
  );

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(input), 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, error, mutate } = useSWR<{ items: CourseOption[] }>(
    `/lecturer/bundles/course-options?keyword=${encodeURIComponent(keyword)}`,
    fetchLearning,
  );

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

  const totalRetail = useMemo(
    () => selectedList.reduce((sum, item) => sum + (item.price || 0), 0),
    [selectedList],
  );

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-5">
      {/* Ô tìm kiếm kho khóa học */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="combo-course-search"
            className="text-sm font-semibold text-foreground"
          >
            Kho khóa học của bạn
          </label>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/60 px-3 py-0.5 text-xs font-semibold text-primary">
            <Layers animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
            Đã chọn {value.length} / 60 khóa
          </span>
        </div>

        <div className="relative">
          <Search
            animated={false}
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="combo-course-search"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Nhập tên khóa học để tìm và thêm vào lộ trình..."
            className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Chọn tối thiểu 2 khóa học. Nhấn vào từng thẻ để thêm hoặc bỏ khỏi combo.
        </p>
      </div>

      {error && <LoadError error={error} retry={() => mutate()} />}
      {!data && !error && (
        <div role="status" className="grid gap-2.5 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border bg-surface-muted"
            />
          ))}
        </div>
      )}
      {data?.items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
          Không tìm thấy khóa học nào phù hợp với từ khóa hiện tại.
        </div>
      )}

      {/* Danh sách khóa học sẵn sàng thêm */}
      {data && data.items.length > 0 && (
        <div className="space-y-2">
          <ul className="grid max-h-72 grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {data.items.map((course) => {
              const selected = value.includes(course.id);
              return (
                <li key={course.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(course)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-2.5 text-left transition-all cursor-pointer ${
                      selected
                        ? "border-primary bg-primary-light/75 shadow-2xs ring-1 ring-primary/20"
                        : "border-border bg-surface hover:border-primary-pastel hover:bg-primary-light/25"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-18 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-primary-light flex items-center justify-center">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BookOpen
                            animated={false}
                            className="h-4 w-4 text-primary"
                            aria-hidden="true"
                          />
                        )}
                        {selected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/50">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {course.title}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Coins
                            animated={false}
                            className="h-3.5 w-3.5 text-primary"
                            aria-hidden="true"
                          />
                          <span className="font-semibold text-primary tabular-nums">
                            {price(course.base_price, course.currency)}
                          </span>
                        </p>
                      </div>
                    </div>

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

      {/* Bản đồ lộ trình tuần tự (Visual Roadmap Timeline) */}
      {selectedList.length > 0 && (
        <div className="space-y-3.5 rounded-2xl border border-primary-pastel/70 bg-gradient-to-br from-primary-light/35 via-surface to-secondary-light/25 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">
                Bản đồ lộ trình tuần tự ({selectedList.length} chặng)
              </h3>
              <p className="text-xs text-muted-foreground">
                Sắp xếp thứ tự học viên nên hoàn thành từ cơ bản đến nâng cao.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <span>Tổng giá lẻ:</span>
              <strong className="inline-flex items-center gap-1 text-primary tabular-nums">
                <Coins animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                {price(totalRetail)}
              </strong>
            </div>
          </div>

          <ol
            aria-label="Thứ tự khóa học trong combo"
            className="relative space-y-2.5"
          >
            {selectedList.map((item, index) => {
              const isLast = index === selectedList.length - 1;
              return (
                <li key={item.id} className="relative flex gap-3">
                  {/* Đường dẫn dọc Timeline */}
                  <div className="flex flex-col items-center pt-1">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-pastel bg-surface text-xs font-bold tabular-nums text-primary shadow-2xs">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className="mt-1 w-0.5 flex-1 rounded-full bg-primary-pastel/80"
                      />
                    )}
                  </div>

                  {/* Thẻ chặng khóa học */}
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-2.5 shadow-2xs transition-colors hover:border-primary-pastel">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-primary-light">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BookOpen
                            animated={false}
                            className="h-4 w-4 text-primary"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Chặng {index + 1} · Giá lẻ:{" "}
                          <span className="font-semibold text-foreground tabular-nums">
                            {price(item.price)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Nút di chuyển thứ tự & xóa */}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        aria-label={`Đưa khóa ${index + 1} lên trước`}
                        onClick={() => move(index, -1)}
                        className="h-8 w-8 rounded-full p-0"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isLast}
                        aria-label={`Đưa khóa ${index + 1} xuống sau`}
                        onClick={() => move(index, 1)}
                        className="h-8 w-8 rounded-full p-0"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Bỏ khóa ${item.title}`}
                        onClick={() =>
                          onChange(value.filter((id) => id !== item.id))
                        }
                        className="h-8 w-8 rounded-full p-0 text-destructive-foreground hover:bg-destructive-bg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </fieldset>
  );
}
