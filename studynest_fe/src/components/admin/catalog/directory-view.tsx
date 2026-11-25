"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Star,
  Table2,
  Trash2,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  AdminCatalogOverview,
  CatalogTaxonomyKind,
  TaxonomyItem,
} from "@/types/catalog";
import {
  CatalogIcon,
  EXAM_TYPE_LABELS,
  TAXONOMY_KIND_META,
  getPalette,
} from "./catalog-visuals";

interface DirectoryViewProps {
  overview: AdminCatalogOverview;
  activeTab: CatalogTaxonomyKind;
  onTabChange: (tab: CatalogTaxonomyKind) => void;
  search: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => Promise<void>;
  onEditItem: (kind: CatalogTaxonomyKind, item: TaxonomyItem) => void;
  onCreateItem: (kind: CatalogTaxonomyKind) => void;
}

const TAB_ORDER: CatalogTaxonomyKind[] = [
  "levels",
  "grades",
  "subjects",
  "learning-goals",
  "exams",
];

function getErr(error: unknown) {
  return axios.isAxiosError(error) &&
    typeof error.response?.data?.detail === "string"
    ? error.response.data.detail
    : "Không thể thực hiện thao tác.";
}

export default function DirectoryView({
  overview,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  onRefresh,
  onEditItem,
  onCreateItem,
}: DirectoryViewProps) {
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "featured" | "inactive"
  >("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const itemsByTab: Record<CatalogTaxonomyKind, TaxonomyItem[]> = useMemo(
    () => ({
      levels: overview.levels,
      grades: overview.grades,
      subjects: overview.subjects,
      "learning-goals": overview.learning_goals,
      exams: overview.exams,
    }),
    [overview],
  );

  const levelNameMap = useMemo(
    () => new Map(overview.levels.map((l) => [l.id, l.name])),
    [overview.levels],
  );

  const rawItems = itemsByTab[activeTab] ?? [];

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rawItems.filter((item) => {
      if (statusFilter === "active" && !item.is_active) return false;
      if (statusFilter === "inactive" && item.is_active) return false;
      if (statusFilter === "featured" && !item.is_featured) return false;
      if (
        q &&
        !`${item.name} ${item.code} ${item.slug ?? ""} ${item.tagline ?? ""}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [rawItems, search, statusFilter]);

  async function quickToggle(
    item: TaxonomyItem,
    patch: { is_active?: boolean; is_featured?: boolean },
  ) {
    setBusyId(item.id);
    try {
      await api.patch(`/admin/catalog/${activeTab}/${item.id}/quick`, patch);
      await onRefresh();
      if (patch.is_featured !== undefined) {
        toast.success(
          patch.is_featured ? "Đã ghim nổi bật" : "Đã bỏ ghim nổi bật",
        );
      } else {
        toast.success(
          patch.is_active ? "Đã kích hoạt mục phân loại" : "Đã ẩn mục phân loại",
        );
      }
    } catch (error) {
      toast.error(getErr(error));
    } finally {
      setBusyId(null);
    }
  }

  async function moveOrder(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rawItems.length) return;
    const reordered = [...rawItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setBusyId(moved.id);
    try {
      await api.put(`/admin/catalog/${activeTab}/reorder`, {
        ids: reordered.map((x) => x.id),
      });
      await onRefresh();
      toast.success("Đã cập nhật thứ tự hiển thị");
    } catch (error) {
      toast.error(getErr(error));
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(item: TaxonomyItem) {
    if (
      !window.confirm(
        `Xóa “${item.name}”? Các mục đang được khóa học sử dụng sẽ được hệ thống bảo vệ và không cho xóa.`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    try {
      await api.delete(`/admin/catalog/${activeTab}/${item.id}`);
      await onRefresh();
      toast.success("Đã xóa mục phân loại");
    } catch (error) {
      toast.error(getErr(error));
    } finally {
      setBusyId(null);
    }
  }

  const canReorder = statusFilter === "all" && search.trim() === "";

  return (
    <div className="space-y-5">
      {/* Sub-tabs for 5 Taxonomy Entities */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="5 nhóm danh mục học thuật"
          className="flex flex-wrap gap-2"
        >
          {TAB_ORDER.map((key) => {
            const meta = TAXONOMY_KIND_META[key];
            const count = itemsByTab[key]?.length ?? 0;
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(key)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
                }`}
              >
                <CatalogIcon name={meta.defaultIcon} size={15} animated={false} />
                <span>{meta.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-primary-light text-primary"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <Button onClick={() => onCreateItem(activeTab)}>
          <Plus size={16} />
          Tạo {TAXONOMY_KIND_META[activeTab].singular}
        </Button>
      </div>

      {/* Filter & Layout Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search
              size={15}
              animated={false}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Tìm ${TAXONOMY_KIND_META[activeTab].label.toLowerCase()} theo tên, mã...`}
              className="h-9 w-64 rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
            {(
              [
                ["all", "Tất cả"],
                ["active", "Hoạt động"],
                ["featured", "Nổi bật"],
                ["inactive", "Đã ẩn"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setLayout("cards")}
            aria-label="Hiển thị dạng thẻ"
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              layout === "cards"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid size={14} animated={false} />
            Thẻ
          </button>
          <button
            type="button"
            onClick={() => setLayout("table")}
            aria-label="Hiển thị dạng bảng"
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              layout === "table"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Table2 size={14} animated={false} />
            Bảng
          </button>
        </div>
      </div>

      {/* Cards Grid Layout */}
      {layout === "cards" ? (
        filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted-foreground">
            Chưa có mục phân loại nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item, idx) => {
              const palette = getPalette(item.color_token);
              const isBusy = busyId === item.id;
              const examMeta = item.exam_type
                ? EXAM_TYPE_LABELS[item.exam_type]
                : null;
              return (
                <article
                  key={item.id}
                  className={`group flex flex-col justify-between rounded-3xl border bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(53,111,167,0.18)] ${
                    item.is_active
                      ? "border-border hover:border-primary-pastel"
                      : "border-border/60 opacity-70"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${palette.softBg} ${palette.border} ${palette.text}`}
                        >
                          <CatalogIcon name={item.icon} size={22} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-foreground">
                            {item.name}
                          </h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <code className="rounded-md bg-background px-1.5 py-0.5 text-[11px]">
                              {item.code}
                            </code>
                            {activeTab === "grades" && item.education_level_id && (
                              <span>
                                · {levelNameMap.get(item.education_level_id)}
                              </span>
                            )}
                            {examMeta && (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getPalette(examMeta.color).badgeBg}`}
                              >
                                {examMeta.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Feature Star */}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          quickToggle(item, { is_featured: !item.is_featured })
                        }
                        title={
                          item.is_featured
                            ? "Đang ghim nổi bật — bấm để bỏ"
                            : "Ghim nổi bật"
                        }
                        aria-label={`Ghim nổi bật ${item.name}`}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                          item.is_featured
                            ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-accent-vanilla-border hover:text-accent-vanilla-foreground"
                        }`}
                      >
                        <Star size={14} animated={false} />
                      </button>
                    </div>

                    <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
                      {item.tagline ||
                        item.description ||
                        "Chưa có mô tả ngắn — bấm Sửa để bổ sung hoặc dùng AI Gợi ý."}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/70 pt-3.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-primary-light px-2.5 py-1 font-semibold text-primary">
                        {item.course_count ?? 0} khóa
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          item.is_active
                            ? "bg-success-bg text-success-foreground"
                            : "bg-destructive-bg text-destructive-foreground"
                        }`}
                      >
                        {item.is_active ? "Hoạt động" : "Đã ẩn"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {canReorder && (
                        <>
                          <button
                            type="button"
                            disabled={isBusy || idx === 0}
                            onClick={() => moveOrder(idx, -1)}
                            aria-label={`Đưa ${item.name} lên trước`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-30"
                          >
                            <ArrowUp size={13} animated={false} />
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || idx === rawItems.length - 1}
                            onClick={() => moveOrder(idx, 1)}
                            aria-label={`Đưa ${item.name} xuống sau`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-30"
                          >
                            <ArrowDown size={13} animated={false} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          quickToggle(item, { is_active: !item.is_active })
                        }
                        title={item.is_active ? "Ẩn danh mục" : "Kích hoạt lại"}
                        aria-label={
                          item.is_active
                            ? `Ẩn ${item.name}`
                            : `Kích hoạt ${item.name}`
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {item.is_active ? (
                          <Eye size={13} animated={false} />
                        ) : (
                          <EyeOff size={13} animated={false} />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onEditItem(activeTab, item)}
                        aria-label={`Sửa ${item.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary-light hover:text-primary"
                      >
                        <Pencil size={13} animated={false} />
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => removeItem(item)}
                        aria-label={`Xóa ${item.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive-border hover:bg-destructive-bg hover:text-destructive-foreground"
                      >
                        <Trash2 size={13} animated={false} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        /* Compact Table Layout */
        <div className="overflow-x-auto rounded-3xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-primary-light/60 text-xs font-semibold text-foreground">
              <tr>
                <th className="px-4 py-3.5">Danh mục</th>
                <th className="px-4 py-3.5">Mã / Slug</th>
                <th className="px-4 py-3.5">Khóa học</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const palette = getPalette(item.color_token);
                const isBusy = busyId === item.id;
                return (
                  <tr
                    key={item.id}
                    className="border-t border-border/70 transition-colors hover:bg-primary-light/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${palette.softBg} ${palette.border} ${palette.text}`}
                        >
                          <CatalogIcon
                            name={item.icon}
                            size={16}
                            animated={false}
                          />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-semibold text-foreground">
                            <span>{item.name}</span>
                            {item.is_featured && (
                              <Star
                                size={12}
                                animated={false}
                                className="text-accent-vanilla-foreground"
                              />
                            )}
                          </div>
                          {item.tagline && (
                            <p className="max-w-md truncate text-xs text-muted-foreground">
                              {item.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded-lg bg-background px-2 py-1 text-xs text-foreground">
                        {item.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {item.course_count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.is_active
                            ? "bg-success-bg text-success-foreground"
                            : "bg-destructive-bg text-destructive-foreground"
                        }`}
                      >
                        {item.is_active ? "Hoạt động" : "Đã ẩn"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => onEditItem(activeTab, item)}
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => removeItem(item)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-sm text-muted-foreground"
                  >
                    Chưa có dữ liệu phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
