"use client";
import { useEffect, useId, useState } from "react";
import useSWR from "swr";
import { Button, Input } from "@/components/ui";
import type { CourseChoice } from "@/types/learning-paths";
import {
  fetchLearning,
  LoadError,
  price,
} from "@/components/learning-paths/shared";
export default function CoursePicker({
  value,
  onChange,
  subjectId,
  single = false,
  limit = 20,
  disabled = false,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  subjectId?: string;
  single?: boolean;
  limit?: number;
  disabled?: boolean;
}) {
  const name = useId();
  const max = single ? 1 : limit;
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(input), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const query = new URLSearchParams({ keyword });
  if (subjectId) query.set("subject_id", subjectId);
  const { data, error, mutate } = useSWR<{ items: CourseChoice[] }>(
    `/admin/learning-paths/course-options?${query}`,
    fetchLearning,
  );
  const selectedQuery = new URLSearchParams();
  value.forEach((id) => selectedQuery.append("ids", id));
  const { data: selected, error: selectedError, mutate: reloadSelected } = useSWR<{ items: CourseChoice[] }>(
    value.length
      ? `/admin/learning-paths/course-options?${selectedQuery}`
      : null,
    fetchLearning,
  );
  function move(index: number, direction: number) {
    const next = [...value];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    onChange(next);
  }
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-3">
      <Input
        label="Tìm và chọn khóa học"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Nhập tên khóa học…"
      />
      <p className="text-xs text-muted-foreground">
        Đã chọn {value.length}/{max} khóa.{" "}
        {single
          ? "Chọn một khóa để quản lý."
          : "Thứ tự dưới đây là thứ tự tuyển chọn."}
      </p>
      {!!value.length && (
        <ol className="space-y-2">
          {value.map((id, index) => (
            <li
              key={id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary-pastel bg-primary-light p-3"
            >
              <span className="min-w-0 flex-1 text-sm">
                {index + 1}.{" "}
                {selected?.items.find((c) => c.id === id)?.title ??
                  (selectedError ? "Chưa tải được tên khóa" : selected ? "Khóa không còn khả dụng — hãy bỏ và chọn lại" : "Đang tải tên khóa…")}
              </span>
              <div className="flex gap-1">
                {!single && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      aria-label="Đưa khóa lên"
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === value.length - 1}
                      aria-label="Đưa khóa xuống"
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(value.filter((x) => x !== id))}
                >
                  Bỏ
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {selectedError && <LoadError error={selectedError} retry={() => reloadSelected()} />}
      {error ? (
        <LoadError error={error} retry={() => mutate()} />
      ) : !data ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải khóa học…
        </p>
      ) : (
        <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
          {data.items.length ? (
            data.items.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg p-3 hover:bg-background"
              >
                <input
                  type={single ? "radio" : "checkbox"}
                  name={single ? name : undefined}
                  disabled={
                    !value.includes(c.id) && value.length >= max && !single
                  }
                  className="mt-1 accent-primary"
                  checked={value.includes(c.id)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? single
                          ? [c.id]
                          : [...value, c.id]
                        : value.filter((x) => x !== c.id),
                    )
                  }
                />
                <span className="min-w-0 text-sm">
                  <span className="block font-medium">{c.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {price(c.base_price, c.currency)} ·{" "}
                    {c.is_published && c.approval_status === "approved"
                      ? "Công khai"
                      : "Chưa mở bán"}
                  </span>
                </span>
              </label>
            ))
          ) : (
            <p className="p-3 text-sm text-muted-foreground">
              Không tìm thấy khóa học.
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
