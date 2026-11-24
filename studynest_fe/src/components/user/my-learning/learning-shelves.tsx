"use client";

import { useState } from "react";
import { FolderOpen, Plus, Trash2, X } from "pulsoicon-react";
import { Button, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { cn } from "@/lib/utils";
import type { LearningListItem, LearningListTone } from "@/types/user/courses-me";

interface LearningShelvesProps {
  lists: LearningListItem[];
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
  onChanged: () => void;
}

const TONE_STYLES: Record<
  LearningListTone,
  { label: string; dot: string; card: string; active: string }
> = {
  sky: {
    label: "Xanh mây",
    dot: "bg-primary",
    card: "border-primary-pastel/80 bg-primary-light/40 text-foreground hover:border-primary",
    active: "border-primary bg-primary text-primary-foreground shadow-sm",
  },
  rose: {
    label: "Hồng phấn",
    dot: "bg-secondary-foreground",
    card: "border-secondary-pastel bg-secondary/45 text-foreground hover:border-secondary-foreground/40",
    active: "border-secondary-foreground/40 bg-secondary text-secondary-foreground shadow-sm ring-2 ring-secondary-pastel",
  },
  lavender: {
    label: "Tím oải hương",
    dot: "bg-accent-foreground",
    card: "border-accent-border bg-accent/45 text-foreground hover:border-accent-foreground/40",
    active: "border-accent-foreground/40 bg-accent text-accent-foreground shadow-sm ring-2 ring-accent-border",
  },
  vanilla: {
    label: "Vàng kem",
    dot: "bg-accent-vanilla-foreground",
    card: "border-accent-vanilla-border bg-accent-vanilla/50 text-foreground hover:border-accent-vanilla-foreground/40",
    active: "border-accent-vanilla-foreground/40 bg-accent-vanilla text-accent-vanilla-foreground shadow-sm ring-2 ring-accent-vanilla-border",
  },
};

export function LearningShelves({
  lists,
  selectedListId,
  onSelectList,
  onChanged,
}: LearningShelvesProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [tone, setTone] = useState<LearningListTone>("sky");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast.info("Hãy đặt tên cho tủ sách của bạn nhé.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/purchases/lists", {
        name: trimmed,
        color_tone: tone,
      });
      setName("");
      setCreating(false);
      showToast.success(`Đã tạo tủ sách “${trimmed}”!`);
      onChanged();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      showToast.error(
        typeof detail === "string" && detail.trim() ? detail : "Không thể tạo tủ sách lúc này.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: LearningListItem) => {
    if (deletingId) return;
    setDeletingId(item.id);
    try {
      await api.delete(`/purchases/lists/${item.id}`);
      if (selectedListId === item.id) onSelectList(null);
      showToast.success(`Đã xóa tủ sách “${item.name}”.`);
      onChanged();
    } catch {
      showToast.error("Không thể xóa tủ sách lúc này.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mb-7 rounded-[24px] border border-primary-pastel/70 bg-surface/90 p-4 shadow-2xs sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-primary-light text-primary">
            <FolderOpen className="size-4" animated={false} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-sm font-bold text-foreground sm:text-base">
              Tủ sách cá nhân của bạn ({lists.length})
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Gom khóa học theo mục tiêu ôn thi hoặc chủ đề yêu thích để lọc chỉ bằng 1 chạm
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/70 px-3 text-xs font-extrabold text-primary transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
        >
          <span className="inline-flex shrink-0">
            {creating ? (
              <X className="size-3.5" animated={false} aria-hidden="true" />
            ) : (
              <Plus className="size-3.5" animated={false} aria-hidden="true" />
            )}
          </span>
          <span>{creating ? "Đóng" : "Tạo tủ sách"}</span>
        </button>
      </div>

      {/* Form tạo tủ sách mới gọn nhẹ */}
      {creating && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="mb-3.5 flex flex-col gap-2.5 rounded-2xl border border-primary-pastel bg-background/70 p-3 sm:flex-row sm:items-center"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên tủ sách (vd: Ôn thi giữa kỳ, Lập trình cuối tuần...)"
            maxLength={80}
            className="flex-1"
          />

          <div className="flex items-center gap-1.5">
            {(Object.keys(TONE_STYLES) as LearningListTone[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                title={TONE_STYLES[t].label}
                aria-label={TONE_STYLES[t].label}
                className={cn(
                  "size-6 rounded-full border-2 transition-transform cursor-pointer",
                  TONE_STYLES[t].dot,
                  tone === t ? "scale-115 border-foreground ring-2 ring-primary/30" : "border-surface",
                )}
              />
            ))}
          </div>

          <Button size="sm" type="submit" isLoading={submitting} disabled={submitting}>
            Lưu tủ sách
          </Button>
        </form>
      )}

      {/* Dải thẻ tủ sách */}
      {lists.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectList(null)}
            className={cn(
              "shrink-0 rounded-2xl border px-3.5 py-2 text-xs font-extrabold transition-all cursor-pointer",
              selectedListId === null
                ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-foreground",
            )}
          >
            Tất cả tủ sách
          </button>

          {lists.map((item) => {
            const toneKey = (
              item.color_tone in TONE_STYLES ? item.color_tone : "sky"
            ) as LearningListTone;
            const style = TONE_STYLES[toneKey];
            const isSelected = selectedListId === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  "group flex shrink-0 items-center gap-2 rounded-2xl border py-1.5 pr-1.5 pl-3 text-xs font-bold transition-all",
                  isSelected ? style.active : style.card,
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectList(isSelected ? null : item.id)}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <span className={cn("size-2 rounded-full", isSelected ? "bg-current" : style.dot)} />
                  <span>{item.name}</span>
                  <span className="rounded-full bg-surface/80 px-1.5 py-0.5 text-[10px] font-black text-foreground tabular-nums">
                    {item.course_count}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={deletingId === item.id}
                  onClick={() => void handleDelete(item)}
                  aria-label={`Xóa tủ sách ${item.name}`}
                  title="Xóa tủ sách"
                  className="grid size-6 place-items-center rounded-full opacity-60 transition-opacity hover:bg-surface/80 hover:opacity-100 cursor-pointer"
                >
                  <Trash2 className="size-3" animated={false} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Chưa có tủ sách nào — bấm <strong>“Tạo tủ sách”</strong> để tự phân loại lộ trình học theo cách riêng của bạn!
        </p>
      )}
    </section>
  );
}
