"use client";

import { useEffect, useState, type FormEvent } from "react";
import useSWR from "swr";
import api from "@/lib/utils/fetcher/client/axios";
import { Badge, Button, Input } from "@/components/ui";
import type { CatalogOptions } from "@/types/catalog";
import type {
  PathDraft,
  Framework,
  LearningPath,
} from "@/types/learning-paths";
import {
  fetchLearning,
  control,
  message,
} from "@/components/learning-paths/shared";
import CoursePicker from "./course-picker";
import SlugField from "./slug-field";

export const emptyPath = (): PathDraft => ({
  slug: "",
  subject_id: "",
  title: "",
  description: "",
  stages: [],
});

export default function PathEditor({
  initial,
  versionId,
  onSaved,
  onStateChange,
}: {
  initial: PathDraft;
  versionId?: string;
  onSaved: (item: LearningPath) => void;
  onStateChange?: (state: { dirty: boolean; busy: boolean }) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    onStateChange?.({
      dirty: JSON.stringify(draft) !== JSON.stringify(initial),
      busy,
    });
  }, [draft, initial, busy, onStateChange]);
  const { data: options, error: optionError } = useSWR<CatalogOptions>(
    "/catalog/filters",
    fetchLearning,
  );
  const { data: frameworks } = useSWR<Framework[]>(
    "/learning-paths/frameworks",
    fetchLearning,
  );
  const selected = draft.stages[current];
  function stage(change: Partial<PathDraft["stages"][number]>) {
    setDraft({
      ...draft,
      stages: draft.stages.map((s, index) =>
        index === current ? { ...s, ...change } : s,
      ),
    });
  }
  function move(direction: number) {
    const stages = [...draft.stages];
    [stages[current], stages[current + direction]] = [
      stages[current + direction],
      stages[current],
    ];
    setDraft({ ...draft, stages });
    setCurrent(current + direction);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      const url = versionId
        ? `/admin/learning-paths/versions/${versionId}`
        : "/admin/learning-paths";
      const { data } = await api.request<LearningPath>({
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
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="primary">1. Thông tin chung</Badge>
            <span className="text-xs text-muted-foreground">
              Có thể lưu trước khi chọn đủ khóa học.
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Tên lộ trình"
              required
              minLength={3}
              maxLength={180}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <label className="space-y-2 text-sm">
              <span className="font-medium">Môn học</span>
              <select
                required
                disabled={!!draft.path_id || draft.stages.length > 0}
                className={control}
                value={draft.subject_id}
                onChange={(e) =>
                  setDraft({ ...draft, subject_id: e.target.value })
                }
              >
                <option value="">Chọn môn trước khi thêm chặng</option>
                {options?.subjects
                  .filter((s) => s.is_active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              {optionError && (
                <span className="text-destructive-foreground">
                  Chưa tải được môn học. Hãy mở lại trình biên tập.
                </span>
              )}
            </label>
            <div className="sm:col-span-2">
              <SlugField
                title={draft.title}
                value={draft.slug}
                onChange={(slug) => setDraft({ ...draft, slug })}
                prefix="/lo-trinh/"
                locked={!!draft.path_id}
              />
            </div>
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="font-medium">Giới thiệu và mục tiêu</span>
              <textarea
                className={control}
                rows={3}
                maxLength={20000}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
              <span className="text-xs text-muted-foreground">
                Giới thiệu ít nhất 20 ký tự khi xuất bản.
              </span>
            </label>
          </div>
        </section>
        <section className="space-y-4 border-t border-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="primary">
              2. Các chặng học · {draft.stages.length}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!draft.subject_id || draft.stages.length >= 20 || busy}
              onClick={() => {
                setDraft({
                  ...draft,
                  stages: [
                    ...draft.stages,
                    {
                      title: `Chặng ${draft.stages.length + 1}`,
                      description: "",
                      target_level_id: null,
                      groups: [],
                    },
                  ],
                });
                setCurrent(draft.stages.length);
              }}
            >
              ＋ Thêm chặng
            </Button>
          </div>
          {!selected ? (
            <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
              Chọn môn học rồi thêm chặng theo thứ tự kiến thức bạn muốn học
              sinh theo học.
            </div>
          ) : (
            <div className="grid items-start gap-5 md:grid-cols-[190px_1fr]">
              <nav
                aria-label="Chọn chặng biên tập"
                className="flex gap-2 overflow-x-auto md:flex-col"
              >
                {draft.stages.map((s, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-current={current === index ? "step" : undefined}
                    onClick={() => setCurrent(index)}
                    className={`min-w-36 rounded-xl border p-3 text-left text-sm transition-colors ${current === index ? "border-primary-pastel bg-primary-light text-primary" : "border-border bg-surface text-foreground hover:bg-background"}`}
                  >
                    <span className="block font-semibold">
                      {index + 1}. {s.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {s.groups.length} học phần ·{" "}
                      {s.groups.reduce((n, g) => n + g.course_ids.length, 0)}{" "}
                      khóa
                    </span>
                  </button>
                ))}
              </nav>
              <div className="space-y-5 rounded-2xl border border-border bg-background p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    Biên tập chặng {current + 1}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={current === 0 || busy}
                      onClick={() => move(-1)}
                      aria-label="Đưa chặng lên"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={current === draft.stages.length - 1 || busy}
                      onClick={() => move(1)}
                      aria-label="Đưa chặng xuống"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setDraft({
                          ...draft,
                          stages: draft.stages.filter((_, i) => i !== current),
                        });
                        setCurrent(Math.max(0, current - 1));
                      }}
                    >
                      Bỏ chặng
                    </Button>
                  </div>
                </div>
                <Input
                  label="Tên chặng"
                  required
                  maxLength={180}
                  value={selected.title}
                  onChange={(e) => stage({ title: e.target.value })}
                />
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">
                    Mục tiêu và kiến thức đầu vào
                  </span>
                  <textarea
                    rows={3}
                    maxLength={10000}
                    className={control}
                    value={selected.description}
                    onChange={(e) => stage({ description: e.target.value })}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">
                    Trình độ đầu ra (tùy chọn)
                  </span>
                  <select
                    className={control}
                    value={selected.target_level_id ?? ""}
                    onChange={(e) =>
                      stage({ target_level_id: e.target.value || null })
                    }
                  >
                    <option value="">Theo nội dung và cấp lớp</option>
                    {frameworks
                      ?.filter((f) => f.subject_id === draft.subject_id)
                      .map((f) => (
                        <optgroup key={f.id} label={f.name}>
                          {f.levels.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                  </select>
                </label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Mỗi học phần cần hoàn thành một khóa. Các khóa trong cùng học
                  phần là những lựa chọn thay thế cho nhau.
                </p>
                {selected.groups.map((group, index) => (
                  <section
                    key={index}
                    className="space-y-4 rounded-xl border border-border bg-surface p-4"
                  >
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Input
                          label={`Học phần ${index + 1}`}
                          required
                          maxLength={180}
                          value={group.title}
                          onChange={(e) =>
                            stage({
                              groups: selected.groups.map((g, i) =>
                                i === index
                                  ? { ...g, title: e.target.value }
                                  : g,
                              ),
                            })
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          stage({
                            groups: selected.groups.filter(
                              (_, i) => i !== index,
                            ),
                          })
                        }
                      >
                        Bỏ
                      </Button>
                    </div>
                    <CoursePicker
                      subjectId={draft.subject_id}
                      value={group.course_ids}
                      onChange={(ids) =>
                        stage({
                          groups: selected.groups.map((g, i) =>
                            i === index ? { ...g, course_ids: ids } : g,
                          ),
                        })
                      }
                    />
                  </section>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selected.groups.length >= 20 || busy}
                  onClick={() =>
                    stage({
                      groups: [
                        ...selected.groups,
                        {
                          title: `Học phần ${selected.groups.length + 1}`,
                          course_ids: [],
                        },
                      ],
                    })
                  }
                >
                  ＋ Thêm học phần
                </Button>
              </div>
            </div>
          )}
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
