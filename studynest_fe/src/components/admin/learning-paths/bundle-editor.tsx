"use client";
import { useEffect, useState, type FormEvent } from "react";
import useSWR from "swr";
import api from "@/lib/utils/fetcher/client/axios";
import { Badge, Button, Input } from "@/components/ui";
import type {
  Bundle,
  BundleDraft,
  LearningPath,
  PageResult,
} from "@/types/learning-paths";
import {
  fetchLearning,
  LoadError,
  control,
  message,
  price,
} from "@/components/learning-paths/shared";
import CoursePicker from "./course-picker";
import SlugField from "./slug-field";
export const emptyBundle = (): BundleDraft => ({
  slug: "",
  title: "",
  description: "",
  price: "0",
  course_ids: [],
  path_version_id: null,
});
export default function BundleEditor({
  initial,
  versionId,
  onSaved,
  onStateChange,
}: {
  initial: BundleDraft;
  versionId?: string;
  onSaved: (item: Bundle) => void;
  onStateChange?: (state: { dirty: boolean; busy: boolean }) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    onStateChange?.({
      dirty: JSON.stringify(draft) !== JSON.stringify(initial),
      busy,
    });
  }, [draft, initial, busy, onStateChange]);
  const { data: paths, error: pathsError, mutate: reloadPaths } = useSWR<PageResult<LearningPath>>(
    "/learning-paths?limit=50",
    fetchLearning,
  );
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      const url = versionId
        ? `/admin/bundles/versions/${versionId}`
        : "/admin/bundles";
      const { data } = await api.request<Bundle>({
        url,
        method: versionId ? "PUT" : "POST",
        data: draft,
      });
      onSaved(data);
    } catch (error) {
      setFailure(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      id="catalog-editor-form"
      onSubmit={save}
      aria-busy={busy}
      className="space-y-7"
    >
      <fieldset disabled={busy} className="min-w-0 space-y-7">
        <section className="space-y-4">
          <Badge variant="primary">1. Thông tin combo</Badge>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Tên combo"
              required
              minLength={3}
              maxLength={180}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Input
              label="Giá trọn gói · VND"
              required
              type="number"
              min={0}
              step="0.01"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            />
            <div className="sm:col-span-2">
              <SlugField
                title={draft.title}
                value={draft.slug}
                onChange={(slug) => setDraft({ ...draft, slug })}
                prefix="/combo/"
                locked={!!draft.bundle_id}
              />
            </div>
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="font-medium">Giới thiệu và quyền lợi</span>
              <textarea
                maxLength={20000}
                rows={3}
                className={control}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
              <span className="text-xs text-muted-foreground">
                Cần ít nhất 20 ký tự khi xuất bản.
              </span>
            </label>
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="font-medium">Lộ trình liên kết (tùy chọn)</span>
              <select
                className={control}
                disabled={!paths || !!pathsError}
                value={draft.path_version_id ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    path_version_id: e.target.value || null,
                  })
                }
              >
                <option value="">Combo độc lập</option>
                {draft.path_version_id && !paths?.items.some((p) => p.id === draft.path_version_id) && (
                  <option value={draft.path_version_id}>
                    Giữ phiên bản lộ trình đang liên kết
                  </option>
                )}
                {paths?.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · v{p.version}
                  </option>
                ))}
              </select>
              {pathsError && <LoadError error={pathsError} retry={() => reloadPaths()} />}
              <span className="text-xs text-muted-foreground">
                Combo liên kết cần có ít nhất một khóa cho mỗi học phần của lộ
                trình.
              </span>
            </label>
          </div>
        </section>
        <section className="space-y-4 border-t border-border pt-6">
          <Badge variant="primary">
            2. Khóa học trong combo · {draft.course_ids.length}
          </Badge>
          <CoursePicker
            limit={60}
            value={draft.course_ids}
            onChange={(ids) => setDraft({ ...draft, course_ids: ids })}
          />
        </section>
        <section className="rounded-xl border border-primary-pastel bg-primary-light p-4 text-sm">
          <p className="font-semibold text-primary">
            Giá dự kiến: {price(draft.price)}
          </p>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Giá combo không vượt tổng giá lẻ. Sau khi lưu, hệ thống mở bước
            kiểm tra nội dung và xuất bản. Bạn có thể quản lý mã giảm riêng
            ngay tại bước kiểm tra hoặc trên danh sách combo.
          </p>
        </section>
        {failure && (
          <p
            role="alert"
            className="rounded-xl bg-destructive-bg p-4 text-sm text-destructive-foreground"
          >
            {failure}
          </p>
        )}
      </fieldset>
    </form>
  );
}
