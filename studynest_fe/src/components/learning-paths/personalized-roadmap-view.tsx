"use client";

import { CoinPrice } from "@/components/ui";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type {
  LearningPreferencesPayload,
  PersonalizedRoadmapBlueprint,
  RoadmapCourseItem,
} from "@/types/learning-paths";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  Compass,
  GraduationCap,
  Layers,
  MapPin,
  Play,
  SlidersHorizontal,
  Star,
  Target,
} from "pulsoicon-react";
import { RoadmapConfigStudio } from "./roadmap-config-studio";
import { LoadError } from "./shared";

const fetcher = async (url: string) => {
  const res = await api.get<PersonalizedRoadmapBlueprint>(url);
  return res.data;
};

// Tọa độ đường bay độ cao 12 trạm lớp trên SVG viewBox 1000x210
const FLIGHT_POINTS: Array<{ grade: number; x: number; y: number; alt: string }> = [
  { grade: 1, x: 48, y: 168, alt: "100m" },
  { grade: 2, x: 130, y: 156, alt: "180m" },
  { grade: 3, x: 212, y: 148, alt: "260m" },
  { grade: 4, x: 294, y: 134, alt: "340m" },
  { grade: 5, x: 376, y: 124, alt: "420m" },
  { grade: 6, x: 458, y: 108, alt: "540m" },
  { grade: 7, x: 540, y: 98, alt: "660m" },
  { grade: 8, x: 622, y: 84, alt: "780m" },
  { grade: 9, x: 704, y: 74, alt: "900m" },
  { grade: 10, x: 786, y: 58, alt: "1.020m" },
  { grade: 11, x: 868, y: 46, alt: "1.120m" },
  { grade: 12, x: 950, y: 34, alt: "1.200m" },
];

const FLIGHT_PATH_D =
  "M 48 168 C 90 162, 100 158, 130 156 C 170 152, 180 150, 212 148 C 250 144, 260 138, 294 134 C 335 130, 345 127, 376 124 C 418 118, 428 112, 458 108 C 500 102, 510 101, 540 98 C 580 92, 592 88, 622 84 C 662 79, 675 77, 704 74 C 745 68, 756 62, 786 58 C 826 52, 840 50, 868 46 C 908 40, 924 37, 950 34";

const FLIGHT_AREA_D = `${FLIGHT_PATH_D} L 950 205 L 48 205 Z`;

function CourseThumbnail({
  course,
  className,
}: {
  course: RoadmapCourseItem;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden bg-primary-light/40",
        className,
      )}
    >
      {course.thumbnail ? (
        <img
          src={course.thumbnail}
          alt={course.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary/40">
          <BookOpen aria-hidden="true" animated={false} className="size-8" />
        </div>
      )}
      <span className="absolute left-3 top-3 rounded-full border border-white/50 bg-surface/90 px-2.5 py-0.5 text-[10px] font-bold text-foreground shadow-2xs backdrop-blur-xs">
        {course.subject_name}
      </span>
      {course.is_enrolled && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-2xs">
          <Play solid aria-hidden="true" animated={false} className="size-2.5" />
          <span>{course.progress_percent}%</span>
        </span>
      )}
    </div>
  );
}

function RoadmapCourseCard({
  course,
  milestoneLabel,
  accentTone,
}: {
  course: RoadmapCourseItem;
  milestoneLabel: string;
  accentTone: "sky" | "lavender" | "vanilla";
}) {
  const hoverBorder =
    accentTone === "lavender"
      ? "hover:border-accent-border"
      : accentTone === "vanilla"
        ? "hover:border-accent-vanilla-border"
        : "hover:border-primary-pastel";

  const milestoneText =
    accentTone === "lavender"
      ? "text-accent-foreground"
      : accentTone === "vanilla"
        ? "text-warning-foreground"
        : "text-primary";

  const href = course.is_enrolled
    ? `/learning/${course.slug}`
    : `/courses/${course.slug}`;

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[24px] border border-border bg-surface shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
        hoverBorder,
      )}
    >
      {/* Luôn giữ chuẩn tỷ lệ 16:9 nguyên vẹn, không cắt méo */}
      <CourseThumbnail course={course} />

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-[10px] font-extrabold uppercase tracking-wider tabular-nums",
                milestoneText,
              )}
            >
              {milestoneLabel}
            </span>
            {course.rating_avg > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-warning-foreground tabular-nums">
                <Star
                  solid
                  aria-hidden="true"
                  animated={false}
                  className="size-3"
                />
                <span>{course.rating_avg}</span>
              </span>
            )}
          </div>

          <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-primary">
            {course.title}
          </h3>
          <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
            {course.match_reason}
          </p>
        </div>

        <div className="mt-3.5 space-y-2.5 border-t border-border/60 pt-3">
          {course.is_enrolled ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-muted-foreground">Tiến độ học</span>
                <span className="text-primary tabular-nums">
                  {course.progress_percent}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-light">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max(5, course.progress_percent)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <CoinPrice
                priceVnd={course.base_price}
                size="sm"
                showWhiteDiscount={false}
              />
              <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                <span>Xem ngay</span>
                <ArrowRight
                  aria-hidden="true"
                  animated={false}
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </div>
          )}

          {course.is_enrolled && (
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <span>Vào học tiếp</span>
              <ArrowRight
                aria-hidden="true"
                animated={false}
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PersonalizedRoadmapView() {
  const [previewGrade, setPreviewGrade] = useState<number | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const swrKey = previewGrade
    ? `/learning-paths/my/blueprint?grade=${previewGrade}`
    : "/learning-paths/my/blueprint";

  const { data, error, isLoading, mutate } =
    useSWR<PersonalizedRoadmapBlueprint>(swrKey, fetcher, {
      revalidateOnFocus: false,
      keepPreviousData: true,
    });

  const handleSavePreferences = async (payload: LearningPreferencesPayload) => {
    setSavingPrefs(true);
    try {
      const res = await api.put<PersonalizedRoadmapBlueprint>(
        "/learning-paths/my/preferences",
        payload,
      );
      setPreviewGrade(payload.grade_level);
      setSubjectFilter("");
      setConfigModalOpen(false);
      await mutate(res.data, { revalidate: false });
      showToast.success(
        `Đã thiết lập bản đồ Lớp ${payload.grade_level} theo cấu hình của bạn!`,
      );
    } catch {
      showToast.error("Không thể lưu cấu hình lộ trình lúc này.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSwitchTrackInstant = async (trackCode: string) => {
    if (!data || savingPrefs) return;
    const found = data.catalog.tracks.find((t) => t.code === trackCode);
    if (!found) return;
    await handleSavePreferences({
      grade_level: data.active_grade,
      learning_track: found.code,
      focus_subjects: found.default_subjects,
      goal_mode: data.profile.goal_mode,
      daily_goal_minutes: data.profile.daily_goal_minutes,
    });
  };

  const tierTracks = useMemo(() => {
    if (!data) return [];
    return data.catalog.tracks.filter((t) => t.tier === data.active_tier.key);
  }, [data]);

  const filteredStages = useMemo(() => {
    if (!data) return [];
    if (!subjectFilter) return data.stages;
    return data.stages.map((stage) => ({
      ...stage,
      courses: stage.courses.filter((c) => c.subject_slug === subjectFilter),
    }));
  }, [data, subjectFilter]);

  if (error) {
    return (
      <main className="user-container py-10">
        <LoadError error={error} retry={() => void mutate()} />
      </main>
    );
  }

  if (!data) {
    return (
      <main
        role="status"
        aria-label="Đang tải bản đồ đường bay 12 tầng mây"
        className="user-container space-y-6 py-8 animate-pulse"
      >
        <div className="h-[340px] rounded-[36px] bg-primary/10" />
        <div className="h-72 rounded-[32px] border border-border bg-surface/80" />
      </main>
    );
  }

  const stage1 = filteredStages[0];
  const stage2 = filteredStages[1];
  const stage3 = filteredStages[2];
  const activePoint =
    FLIGHT_POINTS[data.active_grade - 1] ?? FLIGHT_POINTS[9];
  const nextGrade = data.active_grade < 12 ? data.active_grade + 1 : null;

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="user-container space-y-10 py-6 sm:py-8">
        {/* ============================================================
            TẦNG 1: BẢN ĐỒ ĐƯỜNG BAY 12 TẦNG MÂY (INTERACTIVE ALTITUDE ATLAS)
           ============================================================ */}
        <section
          aria-label="Bản đồ đường bay 12 tầng mây từ Lớp 1 đến Lớp 12"
          className="relative isolate overflow-hidden rounded-[36px] border border-primary-pastel/80 bg-gradient-to-b from-[#EAF3FC] via-[#F6FAFF] to-surface p-5 shadow-md sm:p-7"
        >
          {/* Vầng sáng mây nền */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-20 -z-10 h-64 w-64 rounded-full bg-accent-vanilla/50 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 -z-10 h-72 w-72 rounded-full bg-accent/45 blur-3xl"
          />

          {/* Dải Boarding Header phía trên bản đồ */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3 py-1 text-[11px] font-bold tracking-wider text-primary uppercase">
                  <Compass
                    aria-hidden="true"
                    animated={false}
                    className="size-3.5"
                  />
                  <span>
                    Tầng mây {activePoint.alt} · {data.active_tier.region_name}
                  </span>
                </span>
                <span className="rounded-full border border-border bg-surface/90 px-3 py-1 text-[11px] font-bold text-foreground">
                  {data.profile.fullname}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground tabular-nums">
                  <Clock
                    aria-hidden="true"
                    animated={false}
                    className="size-3 text-primary"
                  />
                  <span>{data.profile.daily_goal_minutes} phút/ngày</span>
                </span>
              </div>

              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Trạm Lớp {data.active_grade}{" "}
                <span className="text-primary">·</span>{" "}
                <span className="text-primary">{data.active_track.label}</span>
              </h1>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {data.active_track.description} — Mục tiêu hiện tại:{" "}
                <strong className="font-semibold text-foreground">
                  {data.profile.goal_label}
                </strong>
                . Chạm vào bất kỳ điểm mây nào trên đường bay để dịch chuyển qua 12 cấp lớp.
              </p>
            </div>

            {/* Cụm nút Boarding Tag */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setConfigModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary-hover cursor-pointer"
              >
                <span className="inline-flex items-center">
                  <SlidersHorizontal
                    aria-hidden="true"
                    animated={false}
                    className="size-3.5"
                  />
                </span>
                <span>Cấu hình hồ sơ 1→12</span>
              </button>

              <Link
                href="/combo"
                className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-4 py-2.5 text-xs font-bold text-primary transition hover:bg-primary-light"
              >
                <Layers
                  aria-hidden="true"
                  animated={false}
                  className="size-3.5"
                />
                <span>Combo tiết kiệm</span>
              </Link>
            </div>
          </div>

          {/* ĐƯỜNG CONG ĐỘ CAO SVG 12 TRẠM LỚP (TƯƠNG TÁC TRỰC TIẾP) */}
          <div className="relative mt-5 overflow-x-auto pb-2">
            <div className="min-w-[740px]">
              <svg
                viewBox="0 0 1000 212"
                className="h-44 w-full select-none sm:h-52"
                role="img"
                aria-label="Đường bay độ cao 12 cấp lớp từ Lớp 1 đến Lớp 12"
              >
                <defs>
                  <linearGradient id="flightFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F8E9C9" stopOpacity="0.55" />
                    <stop offset="50%" stopColor="#BFD7ED" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#E3D5F5" stopOpacity="0.55" />
                  </linearGradient>
                  <linearGradient id="flightStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#C9922E" />
                    <stop offset="48%" stopColor="#356FA7" />
                    <stop offset="100%" stopColor="#6D4FA1" />
                  </linearGradient>
                </defs>

                {/* 3 Vùng trời chia nền dọc nhẹ */}
                <rect
                  x="16"
                  y="10"
                  width="395"
                  height="194"
                  rx="20"
                  fill="#FFF9EC"
                  fillOpacity="0.55"
                />
                <rect
                  x="420"
                  y="10"
                  width="320"
                  height="194"
                  rx="20"
                  fill="#E8F2FA"
                  fillOpacity="0.45"
                />
                <rect
                  x="748"
                  y="10"
                  width="238"
                  height="194"
                  rx="20"
                  fill="#EFE8FA"
                  fillOpacity="0.55"
                />

                {/* Nhãn 3 Vùng trời */}
                <text
                  x="32"
                  y="32"
                  fill="#875415"
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="0.08em"
                >
                  TIỂU HỌC · VÙNG ƯƠM MẦM
                </text>
                <text
                  x="436"
                  y="32"
                  fill="#285C90"
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="0.08em"
                >
                  THCS · VÙNG KHÁM PHÁ
                </text>
                <text
                  x="764"
                  y="32"
                  fill="#593E7A"
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="0.08em"
                >
                  THPT · VÙNG CHINH PHỤC
                </text>

                {/* Đường độ cao nét đứt */}
                <line
                  x1="28"
                  y1="168"
                  x2="972"
                  y2="168"
                  stroke="#CBD5E1"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                />
                <line
                  x1="28"
                  y1="108"
                  x2="972"
                  y2="108"
                  stroke="#CBD5E1"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                />

                {/* Vùng tô dưới đường bay */}
                <path d={FLIGHT_AREA_D} fill="url(#flightFill)" />

                {/* Đường bay chính */}
                <path
                  d={FLIGHT_PATH_D}
                  fill="none"
                  stroke="url(#flightStroke)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* 12 Trạm Mây tương tác */}
                {FLIGHT_POINTS.map((pt, idx) => {
                  const station = data.grade_map[idx];
                  const isActive = pt.grade === data.active_grade;
                  const isMine = station?.is_user_grade;
                  const strokeCol =
                    pt.grade <= 5
                      ? "#B57B1C"
                      : pt.grade <= 9
                        ? "#356FA7"
                        : "#593E7A";

                  return (
                    <g
                      key={pt.grade}
                      onClick={() => {
                        setPreviewGrade(pt.grade);
                        setSubjectFilter("");
                      }}
                      className="cursor-pointer"
                    >
                      {/* Cột gióng xuống đáy cho trạm đang chọn */}
                      {isActive && (
                        <line
                          x1={pt.x}
                          y1={pt.y + 18}
                          x2={pt.x}
                          y2="200"
                          stroke={strokeCol}
                          strokeDasharray="3 4"
                          strokeWidth="1.5"
                          opacity="0.55"
                        />
                      )}

                      {/* Vòng hào quang cho trạm đang chọn */}
                      {isActive && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="23"
                          fill={strokeCol}
                          fillOpacity="0.16"
                        />
                      )}

                      {/* Nút trạm tròn */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isActive ? "16" : "12"}
                        fill={isActive ? "#356FA7" : "#FFFFFF"}
                        stroke={isActive ? "#BFD7ED" : strokeCol}
                        strokeWidth={isActive ? "3" : "2.2"}
                      />

                      {/* Số lớp trong trạm */}
                      <text
                        x={pt.x}
                        y={pt.y + 4}
                        textAnchor="middle"
                        fill={isActive ? "#FFFFFF" : "#3D4A5A"}
                        fontSize={isActive ? "12" : "10.5"}
                        fontWeight="800"
                      >
                        {pt.grade}
                      </text>

                      {/* Chấm "Bạn" trên lớp chính của user */}
                      {isMine && (
                        <g>
                          <rect
                            x={pt.x - 16}
                            y={pt.y - 34}
                            width="32"
                            height="15"
                            rx="7.5"
                            fill="#356FA7"
                          />
                          <text
                            x={pt.x}
                            y={pt.y - 23.5}
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize="8.5"
                            fontWeight="800"
                          >
                            BẠN
                          </text>
                        </g>
                      )}

                      {/* Số khóa học nhỏ bên dưới */}
                      <text
                        x={pt.x}
                        y={pt.y + (isActive ? 31 : 26)}
                        textAnchor="middle"
                        fill={isActive ? "#356FA7" : "#6F7C8C"}
                        fontSize="9.5"
                        fontWeight={isActive ? "700" : "600"}
                      >
                        {station?.total_courses ?? 0} khóa
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* DẢI CHUYỂN NHÓM ĐỊNH HƯỚNG 1 CHẠM NGAY DƯỚI ĐƯỜNG BAY */}
          <div className="mt-3 flex flex-col gap-3 rounded-[24px] border border-border/80 bg-surface/90 p-3.5 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Nhóm {data.active_tier.label}:
              </span>
              {tierTracks.map((track) => {
                const active = track.code === data.active_track.code;
                return (
                  <button
                    key={track.code}
                    type="button"
                    disabled={savingPrefs}
                    onClick={() => void handleSwitchTrackInstant(track.code)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-60",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                        : "border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary",
                    )}
                  >
                    {active && (
                      <span className="inline-flex items-center">
                        <Check
                          aria-hidden="true"
                          animated={false}
                          className="size-3"
                        />
                      </span>
                    )}
                    <span>{track.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap
                  aria-hidden="true"
                  animated={false}
                  className="size-4 text-primary"
                />
                <span>
                  Đã sở hữu:{" "}
                  <strong className="text-foreground">
                    {data.active_grade_stats.enrolled_courses}/
                    {data.active_grade_stats.total_courses}
                  </strong>
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* ONBOARDING INLINE cho tài khoản chưa từng cấu hình */}
        {!data.profile.is_configured && (
          <RoadmapConfigStudio
            blueprint={data}
            mode="inline"
            saving={savingPrefs}
            onSave={handleSavePreferences}
          />
        )}

        {/* DẢI LỌC MÔN HỌC TRỌNG TÂM */}
        {data.available_subjects.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubjectFilter("")}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-bold transition cursor-pointer",
                !subjectFilter
                  ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                  : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-primary",
              )}
            >
              <span>Tất cả môn Lớp {data.active_grade}</span>
            </button>
            {data.available_subjects.map((sub) => {
              const active = subjectFilter === sub.slug;
              return (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() =>
                    setSubjectFilter((prev) =>
                      prev === sub.slug ? "" : sub.slug,
                    )
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                      : sub.is_focus
                        ? "border-primary-pastel bg-primary-light/80 text-primary hover:bg-primary-light"
                        : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-foreground",
                  )}
                >
                  <span>{sub.name}</span>
                  <span className="text-[10px] opacity-75 tabular-nums">
                    {sub.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ============================================================
            TẦNG 2: BẢN ĐỒ 3 TRẠM (CARD ĐỒNG ĐỀU, ẢNH 16:9 NGUYÊN VẸN)
           ============================================================ */}
        <div
          className={cn(
            "space-y-8 transition-opacity",
            isLoading ? "opacity-60" : "opacity-100",
          )}
        >
          {/* TRẠM 01: ĐIỂM CẤT CÁNH (SKY BLUE PASTEL) */}
          {stage1 && (
            <section className="rounded-[32px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/55 via-surface to-surface p-5 shadow-xs sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light font-display text-lg font-bold text-primary shadow-2xs">
                    01
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                      Điểm cất cánh · Lớp {data.active_grade}
                    </p>
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      Khởi động &amp; Xây nền chắc
                    </h2>
                  </div>
                </div>
                <span className="rounded-full border border-primary-pastel bg-surface px-3.5 py-1 text-xs font-bold text-primary tabular-nums">
                  Tiến độ trạm: {stage1.progress_percent}%
                </span>
              </div>

              {stage1.courses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-xs text-muted-foreground">
                  Chưa có khóa học thuộc môn đang lọc ở Trạm 01.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {stage1.courses.map((course, idx) => (
                    <RoadmapCourseCard
                      key={course.id}
                      course={course}
                      milestoneLabel={`Mốc 01.${idx + 1}`}
                      accentTone="sky"
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TRẠM 02: TĂNG TỐC CHUYÊN SÂU (LAVENDER PASTEL) */}
          {stage2 && (
            <section className="rounded-[32px] border border-accent-border/80 bg-gradient-to-br from-accent/35 via-surface to-primary-light/25 p-5 shadow-xs sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-accent-border bg-accent font-display text-lg font-bold text-accent-foreground shadow-2xs">
                    02
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-foreground">
                      Tăng tốc chuyên sâu · {data.active_track.badge}
                    </p>
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      {data.active_track.label}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {data.profile.focus_subjects.slice(0, 4).map((slug) => (
                    <span
                      key={slug}
                      className="rounded-full border border-accent-border bg-surface/90 px-3 py-1 text-[11px] font-bold text-accent-foreground"
                    >
                      #{slug}
                    </span>
                  ))}
                </div>
              </div>

              {stage2.courses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-accent-border bg-surface/80 p-8 text-center text-xs text-muted-foreground">
                  Chưa có khóa học thuộc môn đang lọc ở Trạm 02.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {stage2.courses.map((course, idx) => (
                    <RoadmapCourseCard
                      key={course.id}
                      course={course}
                      milestoneLabel={`Mốc 02.${idx + 1}`}
                      accentTone="lavender"
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TRẠM 03: BỨT PHÁ & MỞ RỘNG (VANILLA PASTEL) */}
          {stage3 && (
            <section className="rounded-[32px] border border-accent-vanilla-border/80 bg-gradient-to-br from-accent-vanilla/35 via-surface to-surface p-5 shadow-xs sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-accent-vanilla font-display text-lg font-bold text-warning-foreground shadow-2xs">
                    03
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-warning-foreground">
                      Hoàn thiện toàn diện · Lớp {data.active_grade}
                    </p>
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      Bứt phá &amp; Mở rộng biên độ
                    </h2>
                  </div>
                </div>

                {nextGrade && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewGrade(nextGrade);
                      setSubjectFilter("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-accent-vanilla/70 px-4 py-2 text-xs font-bold text-warning-foreground transition hover:bg-accent-vanilla cursor-pointer"
                  >
                    <span>Bay tiếp lên Lớp {nextGrade}</span>
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </button>
                )}
              </div>

              {stage3.courses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-accent-vanilla-border bg-surface/80 p-8 text-center text-xs text-muted-foreground">
                  Chưa có khóa học thuộc môn đang lọc ở Trạm 03.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {stage3.courses.map((course, idx) => (
                    <RoadmapCourseCard
                      key={course.id}
                      course={course}
                      milestoneLabel={`Mốc 03.${idx + 1}`}
                      accentTone="vanilla"
                    />
                  ))}
                </div>
              )}

              {/* Cổng chuyển tiếp nằm ngang rộng rãi phía dưới, không ép méo card */}
              <div className="mt-5 flex flex-col gap-3 rounded-[22px] border border-primary-pastel bg-gradient-to-r from-primary-light/80 via-surface to-accent/35 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-surface text-primary shadow-2xs">
                    <MapPin
                      aria-hidden="true"
                      animated={false}
                      className="size-5"
                    />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      {nextGrade
                        ? `Sẵn sàng khám phá trạm tiếp theo: Lớp ${nextGrade}?`
                        : "Bạn đang ở tầng mây cao nhất: Lớp 12 · Chinh phục Đại học"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {nextGrade
                        ? `Xem trước lộ trình và tổ hợp môn ở Lớp ${nextGrade} để chuẩn bị sớm.`
                        : "Bạn có thể tinh chỉnh lại tổ hợp khối thi A/B/C/D bất cứ lúc nào."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (nextGrade) {
                      setPreviewGrade(nextGrade);
                      setSubjectFilter("");
                    } else {
                      setConfigModalOpen(true);
                    }
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-2xs transition hover:bg-primary-hover cursor-pointer"
                >
                  <span>
                    {nextGrade ? `Bay lên Lớp ${nextGrade}` : "Tùy chỉnh khối thi"}
                  </span>
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            </section>
          )}
        </div>

        {/* TẦNG 3: LỘ TRÌNH CHUYÊN ĐỀ ĐANG THEO DÕI (GỌN TINH TẾ) */}
        <section
          aria-label="Lộ trình tuyển chọn đang theo dõi"
          className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              <Target aria-hidden="true" animated={false} className="size-3.5" />
              <span>Thư viện lộ trình tuyển chọn</span>
            </p>
            <h2 className="text-base font-bold text-foreground">
              {data.following_paths.length > 0
                ? `Bạn đang theo dõi ${data.following_paths.length} lộ trình chuyên đề`
                : "Mở rộng thêm với các lộ trình chuyên đề theo môn học"}
            </h2>
            {data.following_paths.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {data.following_paths.map((item) => (
                  <Link
                    key={item.version_id}
                    href={`/learning-paths/${item.slug}?version=${item.version_id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/70 px-3.5 py-1 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    <span>{item.title}</span>
                    <ArrowUpRight aria-hidden="true" className="size-3" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/learning-paths"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
          >
            <span>Khám phá tất cả</span>
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </section>
      </div>

      {/* Modal tùy chỉnh hồ sơ lộ trình */}
      <RoadmapConfigStudio
        blueprint={data}
        mode="modal"
        open={configModalOpen}
        saving={savingPrefs}
        onClose={() => setConfigModalOpen(false)}
        onSave={handleSavePreferences}
      />
    </main>
  );
}
