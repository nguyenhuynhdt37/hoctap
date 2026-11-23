"use client";

import api from "@/lib/utils/fetcher/client/axios";
import GiftTransferDialog from "./gift-transfer-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlignRight,
  Bot,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  Cloud,
  Maximize2,
  Minimize2,
  Share2,
  Star,
} from "pulsoicon-react";

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
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response
    ?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  return fallback;
}

function OptionMark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`w-3.5 h-3.5 rounded-xs border ${
        on ? "bg-primary border-primary" : "bg-surface border-border"
      }`}
    />
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
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
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
        setActionError("Không tải được tùy chọn");
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
  ) {
    if (!courseId || pending || !stateReady) return;
    writeGeneration.current += 1;
    setPending(key);
    setNotice(null);
    setActionError(null);
    try {
      const next = await request();
      setMenu((current) => ({ ...current, ...next }));
    } catch (error) {
      setActionError(readError(error, "Không lưu được lựa chọn"));
    } finally {
      setPending(null);
    }
  }

  const rowClass =
    "w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-background transition-colors cursor-pointer disabled:opacity-60";

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-primary-pastel/70 bg-surface/90 shadow-xs backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
          <button
            type="button"
            onClick={() => router.push("/my-learning")}
            aria-label="Về khóa học của tôi"
            className="flex shrink-0 items-center gap-2 rounded-full border border-primary-pastel/70 bg-primary-light/70 py-1.5 pr-3 pl-2 transition-colors hover:bg-primary-light cursor-pointer"
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
            {menu.gifted_by_name && (
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                Tặng bởi{" "}
                <span className="font-semibold text-primary">
                  {menu.gifted_by_name}
                </span>
              </p>
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
            <span className="hidden sm:inline tabular-nums">
              {totalLessons > 0 ? `${completedLessons}/${totalLessons} · ${progressPct}%` : "Tiến độ"}
            </span>
            {totalLessons > 0 && (
              <span aria-hidden="true" className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-surface md:inline-block">
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
              className={`hidden min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors md:inline-flex ${
                focusMode
                  ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                  : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
              }`}
            >
              {focusMode ? (
                <Minimize2 className="size-4" animated={false} aria-hidden="true" />
              ) : (
                <Maximize2 className="size-4" animated={false} aria-hidden="true" />
              )}
              <span className="hidden xl:inline">{focusMode ? "Thoát tập trung" : "Tập trung"}</span>
            </button>
          )}

          {/* Nút Hỏi Mây AI */}
          {onToggleChat && (
            <button
              type="button"
              onClick={onToggleChat}
              aria-label={chatOpen ? "Đóng Mây AI" : "Hỏi Mây AI"}
              title={chatOpen ? "Đóng Mây AI" : "Hỏi Mây AI"}
              className={`flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-xs font-extrabold transition-all sm:px-4 ${
                chatOpen
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-accent-border bg-accent/70 text-accent-foreground hover:bg-accent"
              }`}
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
            {copiedShare ? (
              <>
                <Check className="size-3.5 text-success-foreground" animated={false} aria-hidden="true" />
                <span>Đã chép</span>
              </>
            ) : (
              <>
                <Share2 className="size-3.5 text-primary" animated={false} aria-hidden="true" />
                <span>Chia sẻ</span>
              </>
            )}
          </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMoreOptions((open) => !open)}
                aria-label="Tùy chọn thêm"
                aria-expanded={showMoreOptions}
                aria-haspopup="menu"
                className="min-h-10 min-w-10 cursor-pointer rounded-xl border border-transparent p-2 text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground"
              >
                <AlignRight className="w-5 h-5" />
              </button>

              {showMoreOptions && (
                <div
                  role="menu"
                  aria-busy={!stateReady}
                  className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-2xl border border-border bg-surface py-2 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={menu.is_favourite}
                    disabled={pending !== null || !stateReady}
                    onClick={() =>
                      runToggle("like", async () => {
                        const response = await api.post<{ is_favourite: boolean }>(
                          `/favourites/${courseId}`,
                        );
                        return { is_favourite: response.data.is_favourite };
                      })
                    }
                    className={rowClass}
                  >
                    <Star solid className="w-5 h-5 text-primary" />
                    <span className="text-foreground text-sm font-medium flex-1">
                      Thích khóa học này
                    </span>
                    <OptionMark on={menu.is_favourite} />
                  </button>

                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={menu.is_archived}
                    disabled={pending !== null || !stateReady}
                    onClick={() =>
                      runToggle("archive", async () => {
                        const response = await api.post<{ is_archived: boolean }>(
                          `/learning/player/${courseId}/archive`,
                          { archived: !menu.is_archived },
                        );
                        return { is_archived: response.data.is_archived };
                      })
                    }
                    className={rowClass}
                  >
                    <ClipboardList className="w-5 h-5 text-primary" />
                    <span className="text-foreground text-sm font-medium flex-1">
                      Lưu trữ khóa học này
                    </span>
                    <OptionMark on={menu.is_archived} />
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending !== null || !stateReady}
                    onClick={() => {
                      setShowMoreOptions(false);
                      setGiftOpen(true);
                      setActionError(null);
                      setNotice(null);
                    }}
                    className={rowClass}
                  >
                    <Cloud className="w-5 h-5 text-primary" />
                    <span className="text-foreground text-sm font-medium">
                      Tặng khóa học này
                    </span>
                  </button>

                  <div className="border-t border-border my-1.5"></div>

                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={menu.announcement_emails}
                    disabled={pending !== null || !stateReady}
                    onClick={() =>
                      runToggle("announcement", async () => {
                        const enabled = !menu.announcement_emails;
                        const response = await api.post<{
                          announcement_emails: boolean;
                        }>(`/learning/player/${courseId}/announcement-email`, {
                          enabled,
                        });
                        return {
                          announcement_emails: response.data.announcement_emails,
                        };
                      })
                    }
                    className={rowClass}
                  >
                    <OptionMark on={menu.announcement_emails} />
                    <span className="text-foreground text-sm font-medium">
                      Email về thông báo mới
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={menu.promotional_emails}
                    disabled={pending !== null || !stateReady}
                    onClick={() =>
                      runToggle("promotional", async () => {
                        const enabled = !menu.promotional_emails;
                        const response = await api.post<{
                          promotional_emails: boolean;
                        }>("/learning/player/promotional-email", { enabled });
                        return {
                          promotional_emails: response.data.promotional_emails,
                        };
                      })
                    }
                    className={rowClass}
                  >
                    <OptionMark on={menu.promotional_emails} />
                    <span className="text-foreground text-sm font-medium">
                      Email quảng cáo
                    </span>
                  </button>

                  {pending && (
                    <p className="px-4 py-1 text-xs text-muted-foreground">Đang lưu</p>
                  )}
                  {actionError && (
                    <p className="px-4 py-1 text-xs text-destructive-foreground" role="alert">
                      {actionError}
                    </p>
                  )}
                  {notice && (
                    <p className="px-4 py-1 text-xs text-success-foreground" role="status">
                      {notice}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
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
    </header>
  );
}
