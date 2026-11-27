"use client";

import { useState } from "react";
import {
  Archive,
  BookOpen,
  Gift,
  Heart,
  Layers,
  LayoutGrid,
  List,
} from "pulsoicon-react";
import useSWR from "swr";
import { Badge } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { cn } from "@/lib/utils";
import type { LearningCockpitResponse } from "@/types/user/courses-me";
import { FavoritesPanel } from "../favorites/favorites-panel";
import { CockpitHero } from "./cockpit-hero";
import { CourseListPanel } from "./course-list-panel";
import { IncomingGiftsPanel, type IncomingGiftItem } from "./incoming-gifts-panel";
import { LearningShelves } from "./learning-shelves";
import { OwnedBundlesPanel } from "./owned-bundles-panel";

type VaultSpace = "active" | "bundles" | "archived" | "favorites" | "gifts";

interface IncomingGiftsResponse {
  gifts: IncomingGiftItem[];
}

const fetchIncomingGiftCount = async (): Promise<IncomingGiftsResponse> => {
  const res = await api.get<IncomingGiftsResponse>("/learning/player/gifts/incoming");
  return res.data;
};

const fetchCockpit = async (): Promise<LearningCockpitResponse> => {
  const res = await api.get<LearningCockpitResponse>("/purchases/cockpit");
  return res.data;
};

export default function CoursesMeSection() {
  const [space, setSpace] = useState<VaultSpace>("active");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [archivedCount, setArchivedCount] = useState<number>(0);
  const [refreshSeed, setRefreshSeed] = useState<number>(0);
  const [stats, setStats] = useState<{
    total: number;
    inProgress: number;
    completed: number;
    avgProgress: number;
  }>({
    total: 0,
    inProgress: 0,
    completed: 0,
    avgProgress: 0,
  });

  const {
    data: cockpit,
    isLoading: cockpitLoading,
    mutate: mutateCockpit,
  } = useSWR<LearningCockpitResponse>("/purchases/cockpit", fetchCockpit, {
    revalidateOnFocus: false,
  });

  const { data: incomingGiftsData, mutate: mutateGifts } = useSWR<IncomingGiftsResponse>(
    "/learning/player/gifts/incoming",
    fetchIncomingGiftCount,
    { revalidateOnFocus: false },
  );

  const giftList = Array.isArray(incomingGiftsData?.gifts)
    ? incomingGiftsData.gifts
    : Array.isArray(incomingGiftsData)
      ? (incomingGiftsData as unknown as IncomingGiftItem[])
      : [];

  const claimableGiftsCount = giftList.filter((g) => g.status === "claimable").length;
  const learningLists = cockpit?.lists ?? [];
  const ownedBundles = cockpit?.owned_bundles ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-20 text-foreground selection:bg-primary-pastel/60 selection:text-foreground">
      {/* Đốm mây Ambient Pastel */}
      <div
        className="pointer-events-none absolute -top-20 left-1/4 -z-10 h-[320px] w-[660px] rounded-full bg-gradient-to-b from-primary-light/75 via-secondary-light/35 to-transparent blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-64 -right-24 -z-10 h-80 w-80 rounded-full bg-accent/25 blur-3xl"
        aria-hidden="true"
      />

      <div className="user-container pt-7 md:pt-9">
        {/* Tiêu đề gọn tinh tế */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge
              variant="info"
              className="mb-2.5 px-3 py-1 text-xs font-semibold tracking-wide shadow-2xs"
            >
              Cloudy Learning Cockpit • Mây Mây
            </Badge>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              Góc học tập của tôi
            </h1>
          </div>
        </div>

        {/* ── TẦNG 1: PERSONAL LEARNING COCKPIT HERO ── */}
        <CockpitHero cockpit={cockpit} isLoading={cockpitLoading} stats={stats} />

        {/* ── TẦNG 2: TỦ SÁCH CÁ NHÂN (CUSTOM LEARNING SHELVES) ── */}
        <LearningShelves
          lists={learningLists}
          selectedListId={selectedListId}
          onSelectList={(id) => {
            setSelectedListId(id);
            if (id && space !== "active") setSpace("active");
          }}
          onChanged={() => {
            void mutateCockpit();
            setRefreshSeed((n) => n + 1);
          }}
        />

        {/* ── TẦNG 3: VAULT SPACE DOCK + CHUYỂN LƯỚI / DANH SÁCH ── */}
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-primary-pastel/70 bg-surface/95 p-2 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSpace("active")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer",
                space === "active"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-primary-light/60 hover:text-primary",
              )}
            >
              <BookOpen className="size-4" animated={false} aria-hidden="true" />
              <span>Đang học</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums",
                  space === "active"
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-primary-light text-primary",
                )}
              >
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSpace("bundles")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer",
                space === "bundles"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-primary-light/60 hover:text-primary",
              )}
            >
              <Layers className="size-4" animated={false} aria-hidden="true" />
              <span>Combo đã mua</span>
              {ownedBundles.length > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums",
                    space === "bundles"
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-primary-light text-primary",
                  )}
                >
                  {ownedBundles.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSpace("archived")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer",
                space === "archived"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-accent/55 hover:text-accent-foreground",
              )}
            >
              <Archive className="size-4" animated={false} aria-hidden="true" />
              <span>Kho lưu trữ</span>
              {archivedCount > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums",
                    space === "archived"
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-accent text-accent-foreground",
                  )}
                >
                  {archivedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSpace("favorites")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer",
                space === "favorites"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-secondary/60 hover:text-secondary-foreground",
              )}
            >
              <Heart className="size-4" solid={space === "favorites"} animated={false} aria-hidden="true" />
              <span>Yêu thích</span>
            </button>

            <button
              type="button"
              onClick={() => setSpace("gifts")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer",
                space === "gifts"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-secondary/60 hover:text-secondary-foreground",
              )}
            >
              <Gift className="size-4" animated={false} aria-hidden="true" />
              <span>Hộp quà tặng</span>
              {claimableGiftsCount > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black text-secondary-foreground tabular-nums">
                  {claimableGiftsCount} mới
                </span>
              )}
            </button>
          </div>

          {/* Chuyển đổi Lưới / Danh sách (cho Đang học & Kho lưu trữ) */}
          {(space === "active" || space === "archived") && (
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setLayout("grid")}
                aria-label="Chế độ xem lưới"
                title="Xem dạng lưới"
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-colors cursor-pointer",
                  layout === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="size-3.5" animated={false} aria-hidden="true" />
                <span className="hidden sm:inline">Lưới</span>
              </button>
              <button
                type="button"
                onClick={() => setLayout("list")}
                aria-label="Chế độ xem danh sách"
                title="Xem dạng danh sách"
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-colors cursor-pointer",
                  layout === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-3.5" animated={false} aria-hidden="true" />
                <span className="hidden sm:inline">Danh sách</span>
              </button>
            </div>
          )}
        </div>

        {/* Nội dung từng không gian */}
        {space === "active" && (
          <CourseListPanel
            key={`active-${refreshSeed}`}
            archived={false}
            selectedListId={selectedListId}
            layout={layout}
            learningLists={learningLists}
            onStatsChange={setStats}
            onArchivedCountChange={setArchivedCount}
            onArchiveMutated={() => setRefreshSeed((n) => n + 1)}
            onCockpitRefresh={() => void mutateCockpit()}
          />
        )}

        {space === "bundles" && (
          <OwnedBundlesPanel bundles={ownedBundles} isLoading={cockpitLoading} />
        )}

        {space === "archived" && (
          <CourseListPanel
            key={`archived-${refreshSeed}`}
            archived={true}
            layout={layout}
            onArchivedCountChange={setArchivedCount}
            onArchiveMutated={() => setRefreshSeed((n) => n + 1)}
            onCockpitRefresh={() => void mutateCockpit()}
          />
        )}

        {space === "favorites" && <FavoritesPanel />}

        {space === "gifts" && (
          <IncomingGiftsPanel
            onClaimed={() => {
              void mutateGifts();
              void mutateCockpit();
              setRefreshSeed((n) => n + 1);
            }}
          />
        )}
      </div>
    </div>
  );
}
