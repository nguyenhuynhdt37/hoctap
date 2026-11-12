"use client";
import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/utils/fetcher/client/axios";
import { Button } from "@/components/ui";
import type {
  CatalogOptions,
  CourseTaxonomyInput,
  Provider,
  TaxonomyItem,
} from "@/types/catalog";

export const selectClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const fetcher = <T,>(url: string) => api.get<T>(url).then((r) => r.data);
export default function CourseTaxonomyForm({
  value,
  onChange,
  admin = false,
}: {
  admin?: boolean;
  value: CourseTaxonomyInput;
  onChange: (value: CourseTaxonomyInput) => void;
}) {
  const { data, error, mutate } = useSWR<CatalogOptions>(
    "/catalog/filters",
    fetcher,
  );
  const { data: providers, error: providerError } = useSWR<{
    items: Provider[];
  }>(admin ? "/admin/providers?size=100" : "/lecturer/providers", fetcher);
  const [level, setLevel] = useState("");
  if (error || providerError)
    return (
      <div
        role="alert"
        className="rounded-xl bg-destructive-bg p-4 text-destructive-foreground"
      >
        Không tải được phân loại hoặc đơn vị.{" "}
        <Button type="button" variant="outline" onClick={() => mutate()}>
          Thử lại
        </Button>
      </div>
    );
  if (!data || !providers)
    return (
      <p role="status" className="animate-pulse text-muted-foreground">
        Đang tải phân loại giáo dục…
      </p>
    );
  const subjects = data.subjects.filter((subject) =>
    value.grade_ids.every((grade) =>
      data.grade_subjects.some(
        (link) => link.grade_id === grade && link.subject_id === subject.id,
      ),
    ),
  );
  const multi = (
    label: string,
    items: TaxonomyItem[],
    field: "grade_ids" | "learning_goal_ids" | "exam_ids",
  ) => (
    <fieldset className="space-y-3">
      <legend className="mb-2 font-medium">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              className="accent-primary"
              checked={value[field].includes(item.id)}
              onChange={(event) => {
                const ids = event.target.checked
                  ? [...value[field], item.id]
                  : value[field].filter((id) => id !== item.id);
                onChange({ ...value, [field]: ids });
              }}
            />
            {item.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-5 text-foreground">
      <div>
        <h3 className="text-lg font-semibold">Phân loại giáo dục</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn lớp, môn và mục tiêu để học sinh tìm đúng khóa học.
        </p>
      </div>
      <label className="block space-y-2">
        <span>Cấp học để lọc lớp</span>
        <select
          className={selectClass}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">Tất cả cấp học</option>
          {data.levels.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      {multi(
        "Khối lớp (có thể chọn nhiều)",
        data.grades.filter((x) => !level || x.education_level_id === level),
        "grade_ids",
      )}
      <label className="block space-y-2">
        <span>Môn học chính</span>
        <select
          className={selectClass}
          value={value.subject_id ?? ""}
          onChange={(e) =>
            onChange({ ...value, subject_id: e.target.value || null })
          }
        >
          <option value="">Chưa phân loại</option>
          {subjects.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
          {value.subject_id &&
            !subjects.some((x) => x.id === value.subject_id) && (
              <option value={value.subject_id}>
                Môn đã chọn không phù hợp lớp — hãy chọn lại
              </option>
            )}
        </select>
      </label>
      {multi("Mục tiêu học tập", data.learning_goals, "learning_goal_ids")}
      {multi("Kỳ thi liên quan (tùy chọn)", data.exams, "exam_ids")}
      <label className="block space-y-2">
        <span>Đơn vị cung cấp</span>
        <select
          className={selectClass}
          value={value.provider_id ?? ""}
          onChange={(e) =>
            onChange({ ...value, provider_id: e.target.value || null })
          }
        >
          <option value="">Giáo viên trực tiếp cung cấp</option>
          {value.provider_id &&
            !providers.items.some((x) => x.id === value.provider_id) && (
              <option value={value.provider_id}>
                Đơn vị hiện tại chưa được xác minh hoặc bạn đã bị thu hồi quyền
              </option>
            )}
          {providers.items.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      {!admin && (
        <p className="text-sm text-muted-foreground">
          Chỉ hiển thị đơn vị đã được admin xác minh và cấp quyền cho bạn.{" "}
          <a
            href="/lecturer/providers"
            className="font-medium text-primary underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tra cứu hoặc yêu cầu tạo đơn vị
          </a>
          .
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Hình thức: Video bài giảng. Trung tâm có thể chuẩn bị khóa nháp; việc mở
        bán cần cơ chế đối soát riêng.
      </p>
    </section>
  );
}
