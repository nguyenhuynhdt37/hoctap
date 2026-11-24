"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlignRight,
  Archive,
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Clock,
  Gift,
  Heart,
  Keyboard,
  Maximize2,
  Megaphone,
  Minimize2,
  Share2,
  Star,
} from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { cn } from "@/lib/utils";
import CourseReviewDialog from "./course-review-dialog";
import GiftTransferDialog from "./gift-transfer-dialog";
import ShortcutsDialog from "./shortcuts-dialog";

interface LearningHeaderProps {
  courseTitle: string;
  courseId: string;
  onOpenProgress: () => void;
  chatOpen?: boolean;
  onToggleChat?: () => void;
  completedLessons?: number;
  totalLessons?: number;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

interface PlayerMenuState {
  is_favourite: boolean;
  is_archived: boolean;
  announcement_emails: boolean;
  promotional_emails: boolean;
  requires_payment: boolean;
  price: string;
  gifted_by_name: string | null;
  gifted_by?: {
    id: string;
    fullname: string;
    avatar: string | null;
  } | null;
}

const optedInMenu: PlayerMenuState = {
  is_favourite: false,
  is_archived: false,
  announcement_emails: true,
  promotional_emails: true,
  requires_payment: false,
  price: "0",
  gifted_by_name: null,
};

function readError(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  return fallback;
}

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
        on ? "bg-primary" : "bg-primary-pastel/90",
      )}
    >
      <span
        className={cn(
          "inline-block size-3.5 rounded-full bg-surface shadow-xs transition-transform duration-200",
          on ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </span>
  );
}

export default function LearningHeader({
  courseTitle,
  courseId,
  onOpenProgress,
  chatOpen,
  onToggleChat,
  completedLessons = 0,
  totalLessons = 0,
  focusMode = false,
  onToggleFocusMode,
}: LearningHeaderProps) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [menu, setMenu] = useState<PlayerMenuState>(optedInMenu);
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [stateReady, setStateReady] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const writeGeneration = useRef(0);
  const router = useRouter();
  const progressPct =
    totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;

  const handleShare = () => {
    if (typeof window === "undefined") return;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href).catch(() => undefined);
    }
    setCopiedShare(true);
    showToast.success("Đã sao chép đường dẫn bài học.");
    window.setTimeout(() => setCopiedShare(false), 2000);
  };

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    const generationAtStart = writeGeneration.current;
    setStateReady(false);
    api
      .get<PlayerMenuState>(`/learning/player/${courseId}/state`)
      .then((response) => {
        if (cancelled || generationAtStart !== writeGeneration.current) return;
        setMenu(response.data);
        setStateReady(true);
      })
      .catch(() => {
        if (cancelled || generationAtStart !== writeGeneration.current) return;
        setActionError("Không tải được tùy chọn khóa học");
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    if (!showMoreOptions) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setShowMoreOptions(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMoreOptions(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showMoreOptions]);

  async function runToggle(
    key: string,
    request: () => Promise<Partial<PlayerMenuState>>,
    successMessage: (next: Partial<PlayerMenuState>) => string,
  ) {
    if (!courseId || pending || !stateReady) return;
    writeGeneration.current += 1;
    setPending(key);
    setActionError(null);
    try {
      const next = await request();
      setMenu((current) => ({ ...current, ...next }));
      showToast.success(successMessage(next));
    } catch (error) {
      const msg = readError(error, "Không lưu được lựa chọn");
      setActionError(msg);
      showToast.error(msg);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-primary-pastel/70 bg-surface/90 shadow-xs backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
          <button
            type="button"
            onClick={() => router.push("/my-learning")}
            aria-label="Về khóa học của tôi"
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-primary-pastel/70 bg-primary-light/70 py-1.5 pr-3 pl-2 transition-colors hover:bg-primary-light"
          >
            <img
              src="/logo/studynest-logo.svg"
              alt="Mây Mây"
              width={22}
              height={22}
              className="size-5"
            />
            <span className="hidden text-sm font-extrabold tracking-tight text-primary sm:inline">
              Mây Mây
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-sm font-bold text-foreground sm:text-base">
              {courseTitle}
            </h1>
            {(menu.gifted_by || menu.gifted_by_name) && (
              <div className="mt-0.5 flex items-center">
                {menu.gifted_by?.id ? (
                  <Link
                    href={`/members/${menu.gifted_by.id}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-secondary-pastel/80 bg-secondary/45 py-0.5 pr-2.5 pl-0.5 text-[11px] leading-tight transition-colors hover:border-primary-pastel hover:bg-primary-light"
                    title={`Xem hồ sơ của ${menu.gifted_by.fullname}`}
                  >
                    {menu.gifted_by.avatar ? (
                      <img
                        src={getImageUrl(menu.gifted_by.avatar)}
                        alt={menu.gifted_by.fullname}
                        className="size-4 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                        {menu.gifted_by.fullname.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-muted-foreground">
                      Tặng bởi{" "}
                      <span className="font-bold text-primary">{menu.gifted_by.fullname}</span>
                    </span>
                  </Link>
                ) : (
                  <p className="truncate text-[11px] leading-tight text-muted-foreground">
                    Tặng bởi{" "}
                    <span className="font-semibold text-primary">{menu.gifted_by_name}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Pill tiến độ trực tiếp */}
          <button
            type="button"
            onClick={onOpenProgress}
            aria-label="Tiến độ học tập"
            title="Xem chi tiết tiến độ"
            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-primary-pastel/80 bg-primary-light/55 px-3 text-xs font-bold text-foreground transition-colors hover:bg-primary-light"
          >
            <Clock className="size-4 text-primary" animated={false} aria-hidden="true" />
            <span className="hidden tabular-nums sm:inline">
              {totalLessons > 0 ? `${completedLessons}/${totalLessons} · ${progressPct}%` : "Tiến độ"}
            </span>
            {totalLessons > 0 && (
              <span
                aria-hidden="true"
                className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-surface md:inline-block"
              >
                <span
                  className="block h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </span>
            )}
            <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
          </button>

          {/* Nút Chế độ Tập trung (Focus Mode) */}
          {onToggleFocusMode && (
            <button
              type="button"
              onClick={onToggleFocusMode}
              aria-pressed={focusMode}
              aria-label={focusMode ? "Thoát chế độ tập trung" : "Bật chế độ tập trung"}
              title={focusMode ? "Thoát chế độ tập trung" : "Chế độ tập trung"}
              className={cn(
                "hidden min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors md:inline-flex",
                focusMode
                  ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                  : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary",
              )}
            >
              <span className="inline-flex shrink-0">
                {focusMode ? (
                  <Minimize2 className="size-4" animated={false} aria-hidden="true" />
                ) : (
                  <Maximize2 className="size-4" animated={false} aria-hidden="true" />
                )}
              </span>
              <span className="hidden xl:inline">
                {focusMode ? "Thoát tập trung" : "Tập trung"}
              </span>
            </button>
          )}

          {/* Nút Hỏi Mây AI */}
          {onToggleChat && (
            <button
              type="button"
              onClick={onToggleChat}
              aria-label={chatOpen ? "Đóng Mây AI" : "Hỏi Mây AI"}
              title={chatOpen ? "Đóng Mây AI" : "Hỏi Mây AI"}
              className={cn(
                "flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-xs font-extrabold transition-all sm:px-4",
                chatOpen
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-accent-border bg-accent/70 text-accent-foreground hover:bg-accent",
              )}
            >
              <Bot className="size-4" aria-hidden="true" />
              <span className="hidden md:inline">
                {chatOpen ? "Đóng Mây AI" : "Hỏi Mây AI"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="hidden min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-xs font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary lg:inline-flex"
          >
            <span className="inline-flex shrink-0">
              {copiedShare ? (
                <Check className="size-3.5 text-success-foreground" animated={false} aria-hidden="true" />
              ) : (
                <Share2 className="size-3.5 text-primary" animated={false} aria-hidden="true" />
              )}
            </span>
            <span>{copiedShare ? "Đã chép" : "Chia sẻ"}</span>
          </button>

          {/* ── CLOUDY COURSE COMMAND CENTER MENU ── */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMoreOptions((open) => !open)}
              aria-label="Trung tâm tùy chọn khóa học"
              aria-expanded={showMoreOptions}
              aria-haspopup="menu"
              className={cn(
                "grid size-10 cursor-pointer place-items-center rounded-full border transition-colors",
                showMoreOptions
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary",
              )}
            >
              <AlignRight className="size-4.5" animated={false} aria-hidden="true" />
            </button>

            {showMoreOptions && (
              <div
                role="menu"
                aria-busy={!stateReady}
                className="absolute top-full right-0 z-40 mt-2.5 w-[340px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[26px] border border-primary-pastel bg-surface shadow-2xl"
              >
                {/* Header mini của Command Center */}
                <div className="border-b border-primary-pastel/70 bg-gradient-to-r from-primary-light/80 via-surface to-secondary/35 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold tracking-wider text-primary uppercase">
                      Tiện ích khóa học
                    </span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-extrabold text-primary border border-primary-pastel/70 tabular-nums">
                      {progressPct}% hoàn thành
                    </span>
                  </div>
                  <p className="mt-1 truncate font-display text-sm font-bold text-foreground">
                    {courseTitle}
                  </p>
                  {totalLessons > 0 && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 4 BENTO ACTION TILES */}
                <div className="grid grid-cols-2 gap-2 p-3">
                  {/* 1. Yêu thích */}
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={menu.is_favourite}
                    disabled={pending !== null || !stateReady}
                    onClick={() =>
                      void runToggle(
                        "like",
                        async () => {
                          const response = await api.post<{ is_favourite: boolean }>(
                            `/favourites/${courseId}`,
                          );
                          return { is_favourite: response.data.is_favourite };
                        },
                        (next) =>
                          next.is_favourite
                            ? "Đã thêm vào danh sách khóa học yêu thích!"
                            : "Đã bỏ khỏi danh sách yêu thích.",
                      )
                    }
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-all cursor-pointer disabled:opacity-55",
                      menu.is_favourite
                        ? "border-secondary-pastel bg-secondary/75 text-secondary-foreground"
                        : "border-border/80 bg-background/60 text-foreground hover:border-secondary-pastel hover:bg-secondary/35",
                    )}
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-xl bg-surface shadow-2xs">
                      <Heart
                        className={cn(
                          "size-4",
                          menu.is_favourite ? "text-secondary-foreground" : "text-primary",
                        )}
                        solid={menu.is_favourite}
                        animated={false}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-xs font-extrabold">
                      {menu.is_favourite ? "Đã yêu thích" : "Yêu thích"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {menu.is_favourite ? "Đang ghim ở mục thích" : "Lưu vào khóa yêu thích"}
                    </span>
                  </button>

                  {/* 2. Lưu trữ */}
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={menu.is_archived}
                    disabled={pending !== null || !stateReady}
                    onClick={() =>
                      void runToggle(
                        "archive",
                        async () => {
                          const response = await api.post<{ is_archived: boolean }>(
                            `/learning/player/${courseId}/archive`,
                            { archived: !menu.is_archived },
                          );
                          return { is_archived: response.data.is_archived };
                        },
                        (next) =>
                          next.is_archived
                            ? "Đã chuyển khóa học vào kho lưu trữ."
                            : "Đã đưa khóa học trở lại danh sách đang học.",
                      )
                    }
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-all cursor-pointer disabled:opacity-55",
                      menu.is_archived
                        ? "border-accent-border bg-accent/75 text-accent-foreground"
                        : "border-border/80 bg-background/60 text-foreground hover:border-accent-border hover:bg-accent/35",
                    )}
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-xl bg-surface shadow-2xs">
                      <Archive
                        className={cn(
                          "size-4",
                          menu.is_archived ? "text-accent-foreground" : "text-primary",
                        )}
                        animated={false}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-xs font-extrabold">
                      {menu.is_archived ? "Đã lưu trữ" : "Lưu trữ"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {menu.is_archived ? "Bấm để bỏ lưu trữ" : "Ẩn khỏi danh sách chính"}
                    </span>
                  </button>

                  {/* 3. Tặng khóa học */}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending !== null || !stateReady}
                    onClick={() => {
                      setShowMoreOptions(false);
                      setGiftOpen(true);
                      setActionError(null);
                    }}
                    className="flex flex-col items-start gap-1.5 rounded-2xl border border-border/80 bg-background/60 p-3 text-left text-foreground transition-all hover:border-primary-pastel hover:bg-primary-light/55 cursor-pointer disabled:opacity-55"
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-primary shadow-2xs">
                      <Gift className="size-4" animated={false} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-extrabold">Tặng khóa học</span>
                    <span className="text-[10px] text-muted-foreground">
                      Chuyển quyền / Email
                    </span>
                  </button>

                  {/* 4. Đánh giá sao */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowMoreOptions(false);
                      setReviewOpen(true);
                    }}
                    className="flex flex-col items-start gap-1.5 rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/35 p-3 text-left text-foreground transition-all hover:bg-accent-vanilla/65 cursor-pointer"
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-xl bg-surface text-accent-vanilla-foreground shadow-2xs">
                      <Star className="size-4" solid animated={false} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-extrabold">Đánh giá sao</span>
                    <span className="text-[10px] text-muted-foreground">
                      Góp ý cho giảng viên
                    </span>
                  </button>
                </div>

                {/* CỤM TOGGLE SWITCH EMAIL */}
                <div className="space-y-1.5 border-t border-border/70 px-3 py-3">
                  <div className="px-1 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                    Thông báo & Email
                  </div>

                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={menu.announcement_emails}
                    disabled={pending !== null || !stateReady}
                    onClick={() =>
                      void runToggle(
                        "announcement",
                        async () => {
                          const enabled = !menu.announcement_emails;
                          const response = await api.post<{ announcement_emails: boolean }>(
                            `/learning/player/${courseId}/announcement-email`,
                            { enabled },
                          );
                          return { announcement_emails: response.data.announcement_emails };
                        },
                        (next) =>
                          next.announcement_emails
                            ? "Đã bật email thông báo bài giảng mới."
                            : "Đã tắt email thông báo cho khóa học này.",
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-background cursor-pointer disabled:opacity-55"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary-light/75 text-primary">
                        <Bell className="size-4" animated={false} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-foreground">
                          Email bài mới & cập nhật
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          Nhận thông báo khi giảng viên bổ sung bài
                        </span>
                      </span>
                    </span>
                    <ToggleSwitch on={menu.announcement_emails} />
                  </button>

                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={menu.promotional_emails}
                    disabled={pending !== null || !stateReady}
                    onClick={() =>
                      void runToggle(
                        "promotional",
                        async () => {
                          const enabled = !menu.promotional_emails;
                          const response = await api.post<{ promotional_emails: boolean }>(
                            "/learning/player/promotional-email",
                            { enabled },
                          );
                          return { promotional_emails: response.data.promotional_emails };
                        },
                        (next) =>
                          next.promotional_emails
                            ? "Đã bật email ưu đãi & khóa học mới."
                            : "Đã tắt email quảng cáo.",
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-background cursor-pointer disabled:opacity-55"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary/65 text-secondary-foreground">
                        <Megaphone className="size-4" animated={false} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-foreground">
                          Email ưu đãi & khuyến mãi
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          Nhận mã giảm giá và gói combo mới
                        </span>
                      </span>
                    </span>
                    <ToggleSwitch on={menu.promotional_emails} />
                  </button>
                </div>

                {/* FOOTER TIỆN ÍCH NHANH */}
                <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-background/60 px-3 py-2.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowMoreOptions(false);
                      setShortcutsOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:bg-surface hover:text-primary cursor-pointer"
                  >
                    <Keyboard className="size-3.5 text-primary" animated={false} aria-hidden="true" />
                    <span>Phím tắt</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowMoreOptions(false);
                      router.push("/my-learning");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-light px-3 py-1.5 text-[11px] font-extrabold text-primary transition-colors hover:bg-primary-pastel cursor-pointer"
                  >
                    <BookOpen className="size-3.5" animated={false} aria-hidden="true" />
                    <span>Khóa của tôi</span>
                    <ArrowRight className="size-3" animated={false} aria-hidden="true" />
                  </button>
                </div>

                {actionError && (
                  <p
                    className="border-t border-destructive/20 bg-destructive-bg px-4 py-2 text-[11px] font-semibold text-destructive-foreground"
                    role="alert"
                  >
                    {actionError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

      <GiftTransferDialog
        open={giftOpen}
        courseId={courseId}
        courseTitle={courseTitle}
        onClose={() => setGiftOpen(false)}
        onTransferred={() => {
          setGiftOpen(false);
          router.push("/my-learning");
        }}
      />

      <CourseReviewDialog
        open={reviewOpen}
        courseId={courseId}
        courseTitle={courseTitle}
        onClose={() => setReviewOpen(false)}
      />

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}
