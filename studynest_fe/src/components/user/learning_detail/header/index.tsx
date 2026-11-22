"use client";

import api from "@/lib/utils/fetcher/client/axios";
import GiftTransferDialog from "./gift-transfer-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  HiChat,
  HiChevronDown,
  HiClipboardList,
  HiClock,
  HiDownload,
  HiMenuAlt3,
  HiCloud,
  HiStar,
} from "react-icons/hi";

interface LearningHeaderProps {
  courseTitle: string;
  courseId: string;
  onOpenProgress: () => void;
  chatOpen?: boolean;
  onToggleChat?: () => void;
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
}: LearningHeaderProps) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [menu, setMenu] = useState<PlayerMenuState>(optedInMenu);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [stateReady, setStateReady] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const writeGeneration = useRef(0);
  const router = useRouter();

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
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-border bg-surface/95 shadow-xs backdrop-blur-md">
      <div className="flex h-full items-center justify-between gap-2 px-2 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <div className="flex shrink-0 items-center gap-2.5">
              <div
                onClick={() => router.push("/")}
                className="w-9 cursor-pointer h-9 bg-primary-pastel/60 border border-primary-light/50 rounded-xl flex items-center justify-center transition-colors hover:bg-primary-pastel"
              >
                <img
                  src="/logo/studynest-logo.svg"
                  alt="Mây Mây"
                  width={22}
                  height={22}
                  className="w-5 h-5"
                />
              </div>
              <div className="hidden sm:flex flex-col">
                <div className="flex items-center">
                  <span className="text-lg font-bold text-foreground tracking-tight">
                    Mây
                  </span>
                  <span className="text-lg font-bold text-primary ml-1">
                    Mây
                  </span>
                </div>
                <span className="text-[10px] font-medium text-subtle-foreground tracking-widest uppercase -mt-1">
                  Học viện trên mây
                </span>
              </div>
            </div>

            <div className="hidden h-6 w-px shrink-0 bg-border min-[400px]:block"></div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
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

          <div className="flex shrink-0 items-center gap-1 sm:gap-2.5">
            {onToggleChat && (
              <button
                onClick={onToggleChat}
                aria-label={chatOpen ? "Đóng chat" : "Hỏi trợ giảng"}
                title={chatOpen ? "Đóng chat" : "Hỏi trợ giảng"}
                className={`flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-2 rounded-xl p-2 text-sm font-semibold transition-colors sm:px-3.5 sm:py-2 ${
                  chatOpen
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-primary-pastel/60 hover:bg-primary-pastel text-primary border border-primary-light/40"
                }`}
              >
                <HiChat className="w-4 h-4" />
                <span className="hidden md:inline">
                  {chatOpen ? "Đóng chat" : "Hỏi trợ giảng"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenProgress}
              aria-label="Tiến độ của bạn"
              title="Tiến độ của bạn"
              className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background p-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-pastel/40 sm:px-3.5 sm:py-2"
            >
              <HiClock className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Tiến độ của bạn</span>
              <HiChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </button>

            <button className="hidden lg:flex items-center space-x-2 px-3.5 py-2 bg-surface hover:bg-background border border-border text-foreground rounded-xl transition-colors cursor-pointer text-sm font-medium">
              <HiDownload className="w-4 h-4 text-primary" />
              <span>Chia sẻ</span>
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
                <HiMenuAlt3 className="w-5 h-5" />
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
                    <HiStar className="w-5 h-5 text-primary" />
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
                    <HiClipboardList className="w-5 h-5 text-primary" />
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
                    <HiCloud className="w-5 h-5 text-primary" />
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
