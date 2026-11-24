"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type {
  LearningPreferencesPayload,
  PersonalizedRoadmapBlueprint,
} from "@/types/learning-paths";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Clock,
  Compass,
  GraduationCap,
  Target,
  X,
} from "pulsoicon-react";

interface RoadmapConfigStudioProps {
  blueprint: PersonalizedRoadmapBlueprint;
  mode: "inline" | "modal";
  open?: boolean;
  saving?: boolean;
  onClose?: () => void;
  onSave: (payload: LearningPreferencesPayload) => Promise<void>;
}

const DAILY_MINUTES_OPTIONS = [15, 30, 45, 60, 90];

const SUBJECT_NAMES_BY_SLUG: Record<string, string> = {
  toan: "Toán",
  "tieng-anh": "Tiếng Anh",
  "ngu-van": "Ngữ văn",
  "tieng-viet": "Tiếng Việt",
  "vat-ly": "Vật lí",
  "hoa-hoc": "Hóa học",
  "sinh-hoc": "Sinh học",
  "lich-su": "Lịch sử",
  "dia-ly": "Địa lí",
  khtn: "Khoa học tự nhiên",
  "lich-su-dia-ly": "Lịch sử & Địa lí",
  "tin-hoc": "Tin học",
  "khoa-hoc": "Khoa học",
  "tu-nhien-xa-hoi": "Tự nhiên & Xã hội",
  "tin-hoc-cong-nghe": "Tin học & Công nghệ",
};

function tierOfGrade(grade: number): "tieu-hoc" | "thcs" | "thpt" {
  if (grade <= 5) return "tieu-hoc";
  if (grade <= 9) return "thcs";
  return "thpt";
}

function subjectsForTier(tier: "tieu-hoc" | "thcs" | "thpt"): string[] {
  if (tier === "tieu-hoc") {
    return [
      "toan",
      "tieng-viet",
      "tieng-anh",
      "khoa-hoc",
      "tu-nhien-xa-hoi",
      "lich-su-dia-ly",
      "tin-hoc-cong-nghe",
    ];
  }
  if (tier === "thcs") {
    return ["toan", "ngu-van", "tieng-anh", "khtn", "lich-su-dia-ly", "tin-hoc"];
  }
  return [
    "toan",
    "ngu-van",
    "tieng-anh",
    "vat-ly",
    "hoa-hoc",
    "sinh-hoc",
    "lich-su",
    "dia-ly",
    "tin-hoc",
  ];
}

export function RoadmapConfigStudio({
  blueprint,
  mode,
  open = true,
  saving = false,
  onClose,
  onSave,
}: RoadmapConfigStudioProps) {
  const [mounted, setMounted] = useState(false);
  const [grade, setGrade] = useState<number>(
    blueprint.profile.grade_level ?? blueprint.active_grade ?? 10,
  );
  const [trackCode, setTrackCode] = useState<string>(
    blueprint.profile.learning_track || blueprint.active_track.code,
  );
  const [focusSubjects, setFocusSubjects] = useState<string[]>(
    blueprint.profile.focus_subjects?.length
      ? blueprint.profile.focus_subjects
      : blueprint.active_track.default_subjects,
  );
  const [goalMode, setGoalMode] = useState<string>(
    blueprint.profile.goal_mode || "giu-vung",
  );
  const [dailyMinutes, setDailyMinutes] = useState<number>(
    blueprint.profile.daily_goal_minutes || 30,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mode === "modal" && open) {
      setGrade(blueprint.profile.grade_level ?? blueprint.active_grade ?? 10);
      setTrackCode(blueprint.profile.learning_track || blueprint.active_track.code);
      setFocusSubjects(
        blueprint.profile.focus_subjects?.length
          ? blueprint.profile.focus_subjects
          : blueprint.active_track.default_subjects,
      );
      setGoalMode(blueprint.profile.goal_mode || "giu-vung");
      setDailyMinutes(blueprint.profile.daily_goal_minutes || 30);
    }
  }, [mode, open, blueprint]);

  useEffect(() => {
    if (mode !== "modal" || !open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, open, onClose]);

  const currentTier = tierOfGrade(grade);
  const tierTracks = useMemo(
    () => blueprint.catalog.tracks.filter((t) => t.tier === currentTier),
    [blueprint.catalog.tracks, currentTier],
  );
  const tierSubjects = useMemo(() => subjectsForTier(currentTier), [currentTier]);

  const handleSelectGrade = (nextGrade: number) => {
    setGrade(nextGrade);
    const nextTier = tierOfGrade(nextGrade);
    if (nextTier !== currentTier) {
      const nextTracks = blueprint.catalog.tracks.filter(
        (t) => t.tier === nextTier,
      );
      const preferred =
        nextGrade === 8 || nextGrade === 9
          ? nextTracks.find((t) => t.code === "on-thi-vao-10") ?? nextTracks[0]
          : nextTracks[0];
      if (preferred) {
        setTrackCode(preferred.code);
        setFocusSubjects(preferred.default_subjects);
      }
    }
  };

  const handleSelectTrack = (code: string) => {
    setTrackCode(code);
    const found = tierTracks.find((t) => t.code === code);
    if (found) {
      setFocusSubjects(found.default_subjects);
    }
  };

  const toggleSubject = (slug: string) => {
    setFocusSubjects((prev) => {
      if (prev.includes(slug)) {
        if (prev.length <= 1) return prev;
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= 6) return prev;
      return [...prev, slug];
    });
  };

  const handleSubmit = async () => {
    await onSave({
      grade_level: grade,
      learning_track: trackCode,
      focus_subjects: focusSubjects,
      goal_mode: goalMode,
      daily_goal_minutes: dailyMinutes,
    });
  };

  const content = (
    <div className="space-y-6">
      {/* Bước 1: Chọn Lớp 1 → 12 theo 3 vùng trời */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            <GraduationCap
              aria-hidden="true"
              animated={false}
              className="size-4"
            />
            <span>Bước 1 · Chọn Lớp của bạn (Lớp 1 → 12)</span>
          </p>
          <span className="rounded-full border border-primary-pastel bg-primary-light px-2.5 py-0.5 text-xs font-bold text-primary">
            Đang chọn: Lớp {grade}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {blueprint.catalog.tiers.map((tier) => {
            const isTierActive = tier.key === currentTier;
            const tierTone =
              tier.key === "tieu-hoc"
                ? "border-accent-vanilla-border bg-accent-vanilla/30"
                : tier.key === "thcs"
                  ? "border-primary-pastel bg-primary-light/40"
                  : "border-accent-border bg-accent/35";

            return (
              <div
                key={tier.key}
                className={cn(
                  "rounded-2xl border p-3.5 transition-all",
                  isTierActive
                    ? tierTone
                    : "border-border bg-background/70 opacity-85 hover:opacity-100",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {tier.label}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {tier.region_name}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tier.grades.map((g) => {
                    const active = grade === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleSelectGrade(g)}
                        className={cn(
                          "min-w-11 flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition cursor-pointer tabular-nums",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                            : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary",
                        )}
                      >
                        <span>Lớp {g}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bước 2: Chọn Nhóm định hướng phù hợp bậc học */}
      <div className="space-y-3">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          <Compass aria-hidden="true" animated={false} className="size-4" />
          <span>Bước 2 · Chọn Nhóm định hướng học tập</span>
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {tierTracks.map((track) => {
            const active = trackCode === track.code;
            return (
              <button
                key={track.code}
                type="button"
                onClick={() => handleSelectTrack(track.code)}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-left transition-all cursor-pointer",
                  active
                    ? "border-primary bg-primary-light/65 shadow-2xs ring-1 ring-primary/30"
                    : "border-border bg-surface hover:border-primary-pastel hover:bg-background",
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="rounded-full border border-primary-pastel bg-surface px-2.5 py-0.5 text-[10px] font-bold text-primary">
                    {track.badge}
                  </span>
                  {active && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check
                        aria-hidden="true"
                        animated={false}
                        className="size-3"
                      />
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-foreground">
                  {track.label}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {track.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bước 3: Tinh chỉnh Môn trọng tâm, Mục tiêu & Nhịp học */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2.5 rounded-2xl border border-border bg-background/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              Môn trọng tâm ({focusSubjects.length}/6)
            </p>
            <span className="text-[11px] text-muted-foreground">
              Chọn ít nhất 1 môn
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tierSubjects.map((slug) => {
              const selected = focusSubjects.includes(slug);
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleSubject(slug)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                      : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-primary",
                  )}
                >
                  {selected && (
                    <span className="inline-flex items-center">
                      <Check
                        aria-hidden="true"
                        animated={false}
                        className="size-3"
                      />
                    </span>
                  )}
                  <span>{SUBJECT_NAMES_BY_SLUG[slug] || slug}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Target aria-hidden="true" animated={false} className="size-3.5 text-primary" />
              <span>Mục tiêu cá nhân</span>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {blueprint.catalog.goals.map((g) => {
                const active = goalMode === g.code;
                return (
                  <button
                    key={g.code}
                    type="button"
                    onClick={() => setGoalMode(g.code)}
                    className={cn(
                      "rounded-xl border px-2.5 py-2 text-left text-xs font-semibold transition cursor-pointer",
                      active
                        ? "border-primary bg-primary-light text-primary"
                        : "border-border bg-surface text-foreground hover:border-primary-pastel",
                    )}
                  >
                    <span>{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/70 pt-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Clock aria-hidden="true" animated={false} className="size-3.5 text-primary" />
              <span>Nhịp học mỗi ngày</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DAILY_MINUTES_OPTIONS.map((min) => {
                const active = dailyMinutes === min;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDailyMinutes(min)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-bold transition cursor-pointer tabular-nums",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-primary",
                    )}
                  >
                    <span>{min} phút</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Nút lưu cấu hình */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border pt-4">
        {mode === "modal" && onClose && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            className="rounded-full px-5 text-xs font-semibold"
          >
            Để sau
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          size="md"
          isLoading={saving}
          loadingText="Đang kiến tạo lộ trình..."
          onClick={() => void handleSubmit()}
          className="rounded-full px-6 text-xs font-bold shadow-sm"
        >
          {mode === "inline"
            ? `Kiến tạo lộ trình Lớp ${grade} cho tôi`
            : `Lưu cấu hình Lớp ${grade}`}
        </Button>
      </div>
    </div>
  );

  if (mode === "inline") {
    return (
      <section
        aria-label="Thiết lập lộ trình cá nhân hóa"
        className="overflow-hidden rounded-[30px] border border-primary-pastel bg-gradient-to-br from-surface via-surface to-primary-light/40 p-6 shadow-sm sm:p-7"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              <Compass aria-hidden="true" animated={false} className="size-3.5" />
              <span>Thiết lập hồ sơ học tập 1 lần</span>
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
              Bạn đang ở trạm Lớp nào trên hành trình 1→12?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Chọn Lớp, nhóm định hướng và môn trọng tâm để Mây Mây tự động thiết kế bản đồ 3 chặng riêng cho bạn. Bạn có thể thay đổi bất kỳ lúc nào.
            </p>
          </div>
        </div>
        {content}
      </section>
    );
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Tùy chỉnh hồ sơ lộ trình cá nhân"
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary-light/65 via-surface to-accent/35 px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Tùy chỉnh hồ sơ lộ trình cá nhân
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Thay đổi lớp học, nhóm định hướng hoặc môn trọng tâm để cập nhật bản đồ ngay lập tức.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bảng tùy chỉnh"
              className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto p-6">{content}</div>
      </div>
    </div>,
    document.body,
  );
}
