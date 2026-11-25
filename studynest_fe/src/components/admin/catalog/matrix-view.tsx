"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import {
  Check,
  Filter,
  Lock,
  Plus,
  Search,
} from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import type { AdminCatalogOverview, TaxonomyItem } from "@/types/catalog";
import { CatalogIcon, getPalette } from "./catalog-visuals";

interface MatrixViewProps {
  overview: AdminCatalogOverview;
  onRefresh: () => Promise<void>;
  onEditSubject: (subject: TaxonomyItem) => void;
}

function getErr(error: unknown) {
  return axios.isAxiosError(error) &&
    typeof error.response?.data?.detail === "string"
    ? error.response.data.detail
    : "Không cập nhật được liên kết ma trận.";
}

export default function MatrixView({
  overview,
  onRefresh,
  onEditSubject,
}: MatrixViewProps) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const cellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of overview.grade_subjects) {
      map.set(`${c.grade_id}:${c.subject_id}`, c.course_count);
    }
    return map;
  }, [overview.grade_subjects]);

  const visibleLevels = useMemo(() => {
    const sorted = [...overview.levels].sort(
      (a, b) => a.order_index - b.order_index,
    );
    return levelFilter === "all"
      ? sorted
      : sorted.filter((l) => l.id === levelFilter);
  }, [overview.levels, levelFilter]);

  const groupedGrades = useMemo(() => {
    return visibleLevels.map((level) => ({
      level,
      grades: overview.grades
        .filter((g) => g.education_level_id === level.id)
        .sort((a, b) => (a.grade_number ?? 0) - (b.grade_number ?? 0)),
    }));
  }, [visibleLevels, overview.grades]);

  const flatGrades = useMemo(
    () => groupedGrades.flatMap((g) => g.grades),
    [groupedGrades],
  );

  const filteredSubjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return overview.subjects.filter((s) => {
      if (
        q &&
        !`${s.name} ${s.code} ${s.tagline ?? ""}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (onlyGaps) {
        return flatGrades.some((g) => {
          const cnt = cellMap.get(`${g.id}:${s.id}`);
          return cnt === 0;
        });
      }
      return true;
    });
  }, [overview.subjects, search, onlyGaps, flatGrades, cellMap]);

  async function toggleCell(gradeId: string, subjectId: string, currentlyOn: boolean) {
    const key = `${gradeId}:${subjectId}`;
    setBusyKey(key);
    try {
      await api.post("/admin/catalog/matrix/toggle", {
        grade_ids: [gradeId],
        subject_id: subjectId,
        enabled: !currentlyOn,
      });
      await onRefresh();
      toast.success(!currentlyOn ? "Đã bật môn học cho lớp" : "Đã gỡ môn khỏi lớp");
    } catch (error) {
      toast.error(getErr(error));
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleLevelBatch(
    levelId: string,
    gradeIds: string[],
    subjectId: string,
    allEnabled: boolean,
  ) {
    if (gradeIds.length === 0) return;
    const key = `batch:${levelId}:${subjectId}`;
    setBusyKey(key);
    try {
      await api.post("/admin/catalog/matrix/toggle", {
        grade_ids: gradeIds,
        subject_id: subjectId,
        enabled: !allEnabled,
      });
      await onRefresh();
      toast.success(
        !allEnabled
          ? "Đã bật môn cho toàn bộ cấp học"
          : "Đã gỡ môn khỏi cấp học",
      );
    } catch (error) {
      toast.error(getErr(error));
    } finally {
      setBusyKey(null);
    }
  }

  function heatClass(count: number | undefined): string {
    if (count === undefined) {
      return "border-border/60 bg-background/60 text-muted-foreground/50 hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary";
    }
    if (count === 0) {
      return "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground hover:opacity-90";
    }
    if (count <= 5) {
      return "border-primary-pastel bg-primary-light text-primary";
    }
    if (count <= 15) {
      return "border-primary/40 bg-primary-pastel/75 text-primary font-semibold";
    }
    return "border-primary bg-primary text-primary-foreground font-semibold shadow-xs";
  }

  return (
    <div className="space-y-5">
      {/* Toolbar + Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-surface p-4 shadow-[0_8px_24px_-12px_rgba(53,111,167,0.10)]">
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm môn học..."
              className="h-9 w-52 rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setLevelFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                levelFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cả 3 cấp
            </button>
            {overview.levels.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setLevelFilter(lvl.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  levelFilter === lvl.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lvl.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOnlyGaps((v) => !v)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
              onlyGaps
                ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-foreground"
            }`}
          >
            <Filter size={13} animated={false} />
            Chỉ hiện ô trống (0 khóa)
          </button>
        </div>

        {/* Heatmap Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-border/70 bg-background" />
            Chưa bật
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-accent-vanilla-border bg-accent-vanilla" />
            Đã bật (0 khóa)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-primary-pastel bg-primary-light" />
            1–5 khóa
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-primary bg-primary" />
            16+ khóa
          </span>
        </div>
      </div>

      {/* Interactive Matrix Table */}
      <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-[0_14px_36px_-14px_rgba(53,111,167,0.14)]">
        <table className="w-full min-w-[820px] border-collapse text-left text-xs">
          <thead>
            {/* Group Header Row: Education Levels */}
            <tr className="border-b border-border bg-background/70">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 w-56 border-r border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
              >
                Môn học ({filteredSubjects.length})
              </th>
              {groupedGrades.map(({ level, grades }) => {
                const palette = getPalette(level.color_token);
                if (grades.length === 0) return null;
                return (
                  <th
                    key={level.id}
                    colSpan={grades.length}
                    className={`border-r border-border px-2 py-2 text-center text-xs font-semibold ${palette.softBg} ${palette.text}`}
                  >
                    {level.name}
                  </th>
                );
              })}
              <th
                rowSpan={2}
                className="w-40 px-3 py-3 text-center text-xs font-semibold text-muted-foreground"
              >
                Bật nhanh theo cấp
              </th>
            </tr>
            {/* Sub Header Row: Individual Grades */}
            <tr className="border-b border-border bg-background/40">
              {flatGrades.map((grade) => (
                <th
                  key={grade.id}
                  className="w-12 border-r border-border/50 px-1 py-2 text-center font-semibold text-foreground"
                >
                  <div>L{grade.grade_number}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.map((subject) => {
              const palette = getPalette(subject.color_token);
              return (
                <tr
                  key={subject.id}
                  className="border-b border-border/60 transition-colors hover:bg-primary-light/20"
                >
                  {/* Sticky Subject Label */}
                  <td className="sticky left-0 z-10 border-r border-border bg-surface px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => onEditSubject(subject)}
                      className="group flex w-full items-center gap-2.5 text-left"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${palette.softBg} ${palette.border} ${palette.text}`}
                      >
                        <CatalogIcon
                          name={subject.icon}
                          size={15}
                          animated={false}
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                          {subject.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {subject.course_count ?? 0} khóa ·{" "}
                          {subject.grade_count ?? 0} lớp
                        </div>
                      </div>
                    </button>
                  </td>

                  {/* Grade Cells */}
                  {flatGrades.map((grade) => {
                    const key = `${grade.id}:${subject.id}`;
                    const count = cellMap.get(key);
                    const isOn = count !== undefined;
                    const isLocked = isOn && (count ?? 0) > 0;
                    const isBusy = busyKey === key;

                    return (
                      <td
                        key={grade.id}
                        className="border-r border-border/40 p-1.5 text-center"
                      >
                        <button
                          type="button"
                          disabled={isBusy || !subject.is_active}
                          onClick={() => toggleCell(grade.id, subject.id, isOn)}
                          title={
                            isLocked
                              ? `${grade.name} · ${subject.name}: ${count} khóa học đang dùng (được bảo vệ)`
                              : isOn
                                ? `${grade.name} · ${subject.name}: Đã bật (0 khóa) — bấm để gỡ`
                                : `${grade.name} · ${subject.name}: Chưa bật — bấm để kích hoạt`
                          }
                          className={`mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-xl border text-[11px] transition-all ${heatClass(count)} ${isBusy ? "animate-pulse opacity-60" : ""}`}
                        >
                          {isOn ? (
                            count > 0 ? (
                              <span className="flex items-center gap-0.5 leading-none">
                                {count}
                                <Lock
                                  size={9}
                                  animated={false}
                                  className="opacity-70"
                                />
                              </span>
                            ) : (
                              <Check size={14} animated={false} />
                            )
                          ) : (
                            <Plus
                              size={12}
                              animated={false}
                              className="opacity-40"
                            />
                          )}
                        </button>
                      </td>
                    );
                  })}

                  {/* Batch Level Toggle Pills */}
                  <td className="px-2.5 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {groupedGrades.map(({ level, grades }) => {
                        const gradeIds = grades.map((g) => g.id);
                        const enabledCount = gradeIds.filter((gid) =>
                          cellMap.has(`${gid}:${subject.id}`),
                        ).length;
                        const allEnabled =
                          gradeIds.length > 0 &&
                          enabledCount === gradeIds.length;
                        const bKey = `batch:${level.id}:${subject.id}`;
                        const shortLabel =
                          level.code === "tieu-hoc"
                            ? "TH"
                            : level.code === "thcs"
                              ? "C2"
                              : level.code === "thpt"
                                ? "C3"
                                : level.name.slice(0, 3);
                        return (
                          <button
                            key={level.id}
                            type="button"
                            disabled={busyKey === bKey || !subject.is_active}
                            onClick={() =>
                              toggleLevelBatch(
                                level.id,
                                gradeIds,
                                subject.id,
                                allEnabled,
                              )
                            }
                            title={`${allEnabled ? "Gỡ" : "Bật"} ${subject.name} cho toàn bộ ${level.name} (${enabledCount}/${gradeIds.length})`}
                            className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
                              allEnabled
                                ? "border-primary bg-primary text-primary-foreground"
                                : enabledCount > 0
                                  ? "border-primary-pastel bg-primary-light text-primary"
                                  : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary"
                            }`}
                          >
                            {shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredSubjects.length === 0 && (
              <tr>
                <td
                  colSpan={flatGrades.length + 2}
                  className="p-10 text-center text-sm text-muted-foreground"
                >
                  Không có môn học nào khớp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
