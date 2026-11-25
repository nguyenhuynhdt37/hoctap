"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import {
  BookOpen,
  Compass,
  Grid3x3,
  LayoutGrid,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trophy,
} from "pulsoicon-react";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { Button } from "@/components/ui";
import type {
  AdminCatalogOverview,
  CatalogTaxonomyKind,
  TaxonomyItem,
} from "@/types/catalog";
import CatalogAdminNav from "./catalog-nav";
import AtlasView from "./atlas-view";
import MatrixView from "./matrix-view";
import DirectoryView from "./directory-view";
import CampaignsView from "./campaigns-view";
import TaxonomyDrawer from "./taxonomy-drawer";

type StudioView = "atlas" | "matrix" | "directory" | "campaigns";

const STUDIO_VIEWS: {
  key: StudioView;
  label: string;
  subtitle: string;
  icon: typeof Compass;
}[] = [
  {
    key: "atlas",
    label: "Bản đồ tổng quan",
    subtitle: "3 Cấp học · 12 Khối lớp · Radar khoảng trống",
    icon: Compass,
  },
  {
    key: "matrix",
    label: "Ma trận Lớp × Môn",
    subtitle: "Bật/tắt 1 chạm & Heatmap phủ sóng",
    icon: Grid3x3,
  },
  {
    key: "directory",
    label: "Kho Danh Mục",
    subtitle: "Thẻ trực quan, thứ tự & ghim nổi bật",
    icon: LayoutGrid,
  },
  {
    key: "campaigns",
    label: "Kỳ thi & Định hướng",
    subtitle: "Chiến dịch mốc thi & hành trình học tập",
    icon: Trophy,
  },
];

const CATALOG_QUERY_SCHEMA = {
  view: {
    type: "string",
    default: "atlas" as StudioView,
    allowed: ["atlas", "matrix", "directory", "campaigns"] as const,
  },
  tab: {
    type: "string",
    default: "subjects" as CatalogTaxonomyKind,
    allowed: [
      "levels",
      "grades",
      "subjects",
      "learning-goals",
      "exams",
    ] as const,
  },
  search: { type: "string", default: "" },
} as const;

const fetcher = <T,>(url: string) => api.get<T>(url).then((r) => r.data);

export default function CatalogAdmin() {
  const { values, setParam, setParams } =
    useUrlQueryState(CATALOG_QUERY_SCHEMA);
  const { view, tab, search } = values;
  const { inputValue: searchInput, setInputValue: setSearchInput } =
    useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const {
    data: overview,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<AdminCatalogOverview>("/admin/catalog/overview", fetcher, {
    revalidateOnFocus: false,
  });

  const [drawerState, setDrawerState] = useState<{
    open: boolean;
    kind: CatalogTaxonomyKind;
    initial: Partial<TaxonomyItem> | null;
  }>({
    open: false,
    kind: "subjects",
    initial: null,
  });

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const openEditDrawer = useCallback(
    (kind: CatalogTaxonomyKind, item: TaxonomyItem) => {
      setDrawerState({ open: true, kind, initial: item });
    },
    [],
  );

  const openCreateDrawer = useCallback(
    (kind: CatalogTaxonomyKind, preset?: Partial<TaxonomyItem>) => {
      const list =
        kind === "levels"
          ? overview?.levels
          : kind === "grades"
            ? overview?.grades
            : kind === "subjects"
              ? overview?.subjects
              : kind === "learning-goals"
                ? overview?.learning_goals
                : overview?.exams;
      const nextOrder = (list?.length ?? 0) + 1;
      setDrawerState({
        open: true,
        kind,
        initial: {
          is_active: true,
          order_index: nextOrder,
          ...preset,
        },
      });
    },
    [overview],
  );

  const coveragePercent =
    overview && overview.health.matrix_total_links > 0
      ? Math.round(
          (overview.health.matrix_covered_links /
            overview.health.matrix_total_links) *
            100,
        )
      : 0;

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      <CatalogAdminNav
        unclassifiedCount={overview?.health.unclassified_courses}
      />

      {/* Editorial Hero Banner — Cloudy Blue Pastel Sky */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/70 bg-gradient-to-br from-primary-light/90 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/75 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-primary-pastel/35 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-2xs">
              <BookOpen size={13} animated={false} />
              Mây Mây Curriculum Studio
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Kiến trúc Chương trình Học &amp; Danh mục
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Điều phối toàn bộ bản đồ 3 cấp học, 12 khối lớp, ma trận môn học,
              mốc kỳ thi và lộ trình mục tiêu — trực quan, tức thì và có trợ lý
              AI biên tập metadata.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => void handleRefresh()}
              disabled={isValidating}
            >
              <RefreshCw
                size={15}
                className={isValidating ? "animate-spin" : ""}
              />
              Làm mới
            </Button>
            <Button
              onClick={() =>
                openCreateDrawer(view === "directory" ? tab : "subjects")
              }
            >
              <Plus size={16} />
              Tạo danh mục mới
            </Button>
          </div>
        </div>

        {/* 4 Floating Glass KPI Pills */}
        {overview && (
          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Khung phân tầng
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {overview.levels.length} cấp · {overview.grades.length} lớp
              </p>
              <p className="mt-0.5 text-[11px] text-primary">
                {overview.subjects.length} môn học chuẩn GDPT
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Phủ sóng Ma trận
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {coveragePercent}%{" "}
                <span className="text-sm font-semibold text-muted-foreground">
                  ({overview.health.matrix_covered_links}/
                  {overview.health.matrix_total_links})
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {overview.health.content_gaps_count === 0
                  ? "Không có ô trống khóa học"
                  : `${overview.health.content_gaps_count} ô Lớp × Môn cần mở khóa`}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Hệ sinh thái Khóa học
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {overview.health.published_courses}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  / {overview.health.total_courses}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-success-foreground">
                Đang xuất bản công khai
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface/85 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck size={13} className="text-primary" />
                Sức khỏe Phân loại
              </p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {overview.exams.length} kỳ thi ·{" "}
                {overview.learning_goals.length} mục tiêu
              </p>
              <p
                className={`mt-0.5 text-[11px] font-medium ${
                  overview.health.unclassified_courses > 0
                    ? "text-warning-foreground"
                    : "text-success-foreground"
                }`}
              >
                {overview.health.unclassified_courses > 0
                  ? `${overview.health.unclassified_courses} khóa chưa gán đầy đủ`
                  : "100% khóa học đã chuẩn hóa"}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 4 Studio Workspace Switcher */}
      <nav
        aria-label="Không gian làm việc Curriculum Studio"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {STUDIO_VIEWS.map(({ key, label, subtitle, icon: Icon }) => {
          const active = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setParam("view", key)}
              className={`group flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_12px_28px_-12px_rgba(53,111,167,0.45)]"
                  : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light/40"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  active
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-primary-light text-primary group-hover:bg-surface"
                }`}
              >
                <Icon size={19} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {label}
                </span>
                <span
                  className={`block truncate text-[11px] ${
                    active
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          <span>Không tải được dữ liệu tổng quan Curriculum Studio.</span>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading || !overview ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-3xl border border-border bg-surface p-6"
            >
              <div className="h-12 w-2/3 rounded-2xl bg-primary-light/70" />
              <div className="mt-5 space-y-3">
                <div className="h-16 rounded-2xl bg-background" />
                <div className="h-16 rounded-2xl bg-background" />
                <div className="h-16 rounded-2xl bg-background" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {view === "atlas" && (
            <AtlasView
              overview={overview}
              onEditItem={openEditDrawer}
              onCreateItem={openCreateDrawer}
              onJumpToMatrix={() => setParam("view", "matrix")}
            />
          )}

          {view === "matrix" && (
            <MatrixView
              overview={overview}
              onRefresh={handleRefresh}
              onEditSubject={(subject) => openEditDrawer("subjects", subject)}
            />
          )}

          {view === "directory" && (
            <DirectoryView
              overview={overview}
              activeTab={tab}
              onTabChange={(nextTab) =>
                setParams({ view: "directory", tab: nextTab, search: "" })
              }
              search={searchInput}
              onSearchChange={setSearchInput}
              onRefresh={handleRefresh}
              onEditItem={openEditDrawer}
              onCreateItem={(k) => openCreateDrawer(k)}
            />
          )}

          {view === "campaigns" && (
            <CampaignsView
              overview={overview}
              onEditItem={openEditDrawer}
              onCreateItem={(k) => openCreateDrawer(k)}
            />
          )}
        </>
      )}

      {/* Slide-over Inspector Drawer */}
      <TaxonomyDrawer
        open={drawerState.open}
        kind={drawerState.kind}
        initial={drawerState.initial}
        levels={overview?.levels ?? []}
        onClose={() => setDrawerState((prev) => ({ ...prev, open: false }))}
        onSaved={handleRefresh}
      />
    </main>
  );
}
