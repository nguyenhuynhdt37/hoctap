"use client";

import Pagination from "@/components/shared/pagination";
import { Alert, Button } from "@/components/ui";
import { useDebouncedUrlSearch, useUrlQueryState } from "@/hooks/useUrlQueryState";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useRealtimeNotiStore } from "@/stores/notifications";
import type {
  Notification,
  NotificationsQueryParams,
  NotificationsResponse,
} from "@/types/user/notification";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  Inbox,
  RefreshCw,
  Trash2,
} from "pulsoicon-react";
import { DeviceNotificationBanner } from "./device-notification-banner";
import { NotificationCard } from "./notification-card";
import {
  formatNotificationDayHeader,
  getNotificationDayKey,
  NOTIFICATION_CHANNELS,
  type NotificationChannelKey,
} from "./notification-meta";
import { NotificationsToolbar } from "./notifications-toolbar";

const NOTIFICATIONS_QUERY_SCHEMA = {
  search: { type: "string", default: "" as string, trim: true },
  type: {
    type: "string",
    default: "" as NotificationChannelKey,
    allowed: [
      "",
      "learning",
      "course",
      "wallet",
      "refund",
      "security",
      "system",
    ] as const,
  },
  read: {
    type: "string",
    default: "" as "" | "true" | "false",
    allowed: ["", "true", "false"] as const,
  },
  sort_by: { type: "string", default: "created_at" as string },
  order_dir: {
    type: "string",
    default: "desc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: 20, min: 1, max: 100 },
} as const;

export default function Notifications() {
  const { values, setParam, resetParams } = useUrlQueryState(
    NOTIFICATIONS_QUERY_SCHEMA,
  );
  const {
    search,
    type,
    read,
    sort_by: sortBy,
    order_dir: orderDir,
    page,
    limit,
  } = values;

  const { inputValue: searchInput, setInputValue: setSearchInput } =
    useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const [confirmClearRead, setConfirmClearRead] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const markStoreRead = useRealtimeNotiStore((s) => s.markAsRead);
  const markStoreUnread = useRealtimeNotiStore((s) => s.markAsUnread);
  const removeFromStore = useRealtimeNotiStore((s) => s.remove);
  const markAllAsRead = useRealtimeNotiStore((s) => s.markAllRead);
  const hydrate = useRealtimeNotiStore((s) => s.hydrate);
  const latestLive = useRealtimeNotiStore((s) => s.latestLiveNotification);

  useEffect(() => {
    if (latestLive?.notification?.id) {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }, [latestLive, queryClient]);

  const params: NotificationsQueryParams = {
    page,
    limit,
    sort_by: sortBy,
    order_dir: orderDir,
    ...(search.trim() && { search: search.trim() }),
    ...(type && { type }),
    ...(read !== "" && { is_read: read === "true" }),
  };

  const { data, error, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["notifications", params],
    queryFn: () =>
      api.get("/notifications/user", { params }).then((r) => r.data),
  });

  useEffect(() => {
    if (data && page === 1 && !search && !type && read === "") {
      hydrate("USER", data.items.slice(0, 10), data.unread ?? 0);
    }
  }, [data, page, search, type, read, hydrate]);

  const markAsRead = useMutation({
    mutationFn: (id: string) => {
      setBusyId(id);
      return api.post(`/notifications/read/${id}`).then((r) => r.data);
    },
    onSuccess: (_, id) => {
      markStoreRead("USER", id);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      showToast.error("Không thể đánh dấu đã đọc.");
    },
    onSettled: () => setBusyId(null),
  });

  const markAsUnread = useMutation({
    mutationFn: (id: string) => {
      setBusyId(id);
      return api.post(`/notifications/unread/${id}`).then((r) => r.data);
    },
    onSuccess: (_, id) => {
      markStoreUnread("USER", id);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      showToast.error("Không thể đánh dấu chưa đọc.");
    },
    onSettled: () => setBusyId(null),
  });

  const deleteSingle = useMutation({
    mutationFn: (id: string) => {
      setBusyId(id);
      return api.delete(`/notifications/${id}`).then((r) => r.data);
    },
    onSuccess: (_, id) => {
      removeFromStore("USER", id);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast.success("Đã xóa thông báo.");
    },
    onError: () => {
      showToast.error("Không thể xóa thông báo lúc này.");
    },
    onSettled: () => setBusyId(null),
  });

  const markAll = useMutation({
    mutationFn: () =>
      api.post("/notifications/read-all/user").then((r) => r.data),
    onSuccess: () => {
      markAllAsRead("USER");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
    },
    onError: () => {
      showToast.error("Không thể xử lý yêu cầu lúc này.");
    },
  });

  const clearRead = useMutation({
    mutationFn: () =>
      api.delete<{ deleted_count?: number }>("/notifications/read/user").then((r) => r.data),
    onSuccess: (res) => {
      setConfirmClearRead(false);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      const count = res?.deleted_count ?? 0;
      showToast.success(
        count > 0
          ? `Đã dọn sạch ${count} thông báo đã đọc.`
          : "Không có thông báo đã đọc nào để dọn.",
      );
    },
    onError: () => {
      showToast.error("Không thể dọn thông báo đã đọc.");
    },
  });

  const categoryCounts = data?.category_counts ?? {};
  const allTotal = categoryCounts.all?.total ?? data?.total ?? 0;
  const unreadTotal = data?.unread ?? categoryCounts.all?.unread ?? 0;
  const readTotal = Math.max(0, allTotal - unreadTotal);

  const groupedByDay = useMemo(() => {
    const items = data?.items ?? [];
    const groups: Array<{
      key: string;
      label: string;
      items: Notification[];
    }> = [];
    const map = new Map<string, (typeof groups)[number]>();

    for (const item of items) {
      const key = getNotificationDayKey(item.created_at);
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          label: formatNotificationDayHeader(item.created_at),
          items: [],
        };
        map.set(key, g);
        groups.push(g);
      }
      g.items.push(item);
    }
    return groups;
  }, [data?.items]);

  const hasActiveFilters = Boolean(
    search.trim() || searchInput.trim() || type || read !== "",
  );

  const resetFilters = () => {
    setSearchInput("");
    resetParams();
  };

  const activeChannel =
    NOTIFICATION_CHANNELS.find((c) => c.key === type) ??
    NOTIFICATION_CHANNELS[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="user-container space-y-6 py-8">
        <section aria-labelledby="notifications-heading" className="rounded-3xl border border-border bg-primary-light/75 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 id="notifications-heading" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Trung tâm thông báo
              </h1>
              <p className="mt-2 text-sm text-foreground/85">{unreadTotal} chưa đọc · {allTotal} thông báo</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {unreadTotal > 0 && (
                <Button onClick={() => markAll.mutate()} isLoading={markAll.isPending}
                  leftIcon={<CheckCheck aria-hidden="true" className="size-4" />}>
                  Đánh dấu tất cả đã đọc
                </Button>
              )}
              {readTotal > 0 && !confirmClearRead && (
                <Button variant="outline" onClick={() => setConfirmClearRead(true)}
                  leftIcon={<Trash2 aria-hidden="true" className="size-4" />}>
                  Xóa tin đã đọc
                </Button>
              )}
            </div>
          </div>

          {confirmClearRead && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-destructive-border bg-destructive-bg p-3 text-sm text-destructive-foreground">
              <p className="mr-auto">Xóa {readTotal} thông báo đã đọc?</p>
              <Button variant="destructive" size="sm" onClick={() => clearRead.mutate()} isLoading={clearRead.isPending}>Xác nhận</Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmClearRead(false)}>Hủy</Button>
            </div>
          )}
        </section>

        <DeviceNotificationBanner />

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
          {/* Cột Trái: Thanh Kênh Thông Báo */}
          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className="rounded-[26px] border border-border bg-surface p-3 shadow-xs">
              <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Kênh thông báo
              </p>

              {/* Mobile: cuộn ngang | Desktop: dọc */}
              <nav
                aria-label="Kênh thông báo"
                className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
              >
                {NOTIFICATION_CHANNELS.map((ch) => {
                  const active = type === ch.key;
                  const stat =
                    ch.key === ""
                      ? categoryCounts.all
                      : categoryCounts[ch.key];
                  const chUnread = stat?.unread ?? 0;
                  const chTotal = stat?.total ?? 0;
                  const Icon = ch.Icon;

                  return (
                    <button
                      key={ch.key || "all"}
                      type="button"
                      onClick={() => setParam("type", ch.key)}
                      aria-pressed={active}
                      className={cn(
                        "flex shrink-0 items-center justify-between gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all cursor-pointer lg:w-full",
                        active
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-foreground hover:bg-primary-light/60",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-xl border",
                            active
                              ? "border-white/25 bg-white/15 text-white"
                              : ch.iconBoxClass,
                          )}
                        >
                          <Icon
                            aria-hidden="true"
                            animated={false}
                            className="size-4"
                          />
                        </span>
                        <span className="truncate text-xs font-semibold sm:text-[13px]">
                          {ch.shortLabel}
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-1 tabular-nums">
                        {chUnread > 0 ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold",
                              active
                                ? "bg-white text-primary"
                                : "bg-primary text-primary-foreground",
                            )}
                          >
                            {chUnread > 99 ? "99+" : chUnread}
                          </span>
                        ) : chTotal > 0 ? (
                          <span
                            className={cn(
                              "text-[11px] font-medium",
                              active ? "text-white/80" : "text-subtle-foreground",
                            )}
                          >
                            {chTotal}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Cột Phải: Toolbar + Dòng thông báo theo ngày */}
          <div className="min-w-0 space-y-5">
            {/* Tiêu đề kênh đang xem */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {activeChannel.label}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeChannel.description}
                </p>
              </div>
              {data && (
                <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
                  {data.total} kết quả
                </span>
              )}
            </div>

            <NotificationsToolbar
              searchQuery={searchInput}
              onSearchChange={setSearchInput}
              readFilter={read}
              onReadFilterChange={(val) =>
                setParam("read", val as "" | "true" | "false")
              }
              sortBy={sortBy}
              onSortByChange={(val) => setParam("sort_by", val)}
              orderDir={orderDir}
              onOrderDirChange={(val) => setParam("order_dir", val)}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={resetFilters}
            />

            {error && (
              <Alert variant="destructive">
                Có lỗi xảy ra khi tải thông báo. Vui lòng thử lại sau.
              </Alert>
            )}

            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-[24px] border border-border bg-surface/80"
                  />
                ))}
              </div>
            )}

            {data && !isLoading && (
              <>
                {data.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-surface/90 px-6 py-16 text-center shadow-2xs">
                    <span className="flex size-14 items-center justify-center rounded-3xl border border-primary-pastel bg-primary-light text-primary">
                      <Inbox
                        aria-hidden="true"
                        animated={false}
                        className="size-6"
                      />
                    </span>
                    <h3 className="mt-4 text-base font-bold text-foreground">
                      Không có thông báo nào phù hợp
                    </h3>
                    <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
                      {hasActiveFilters
                        ? "Thử đổi kênh thông báo hoặc xóa bộ lọc để xem toàn bộ lịch sử tín hiệu."
                        : "Hộp thư của bạn hiện đang hoàn toàn gọn gàng. Mọi cập nhật mới sẽ tự động hiện tại đây."}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-primary-light px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
                      >
                        <span className="inline-flex items-center">
                          <RefreshCw aria-hidden="true" className="size-3.5" />
                        </span>
                        <span>Xem tất cả thông báo</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedByDay.map((group) => (
                      <section key={group.key} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <span className="size-2 rounded-full bg-primary" />
                          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">
                            {group.label}
                          </h3>
                          <span className="rounded-full bg-primary-light/80 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                            {group.items.length}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {group.items.map((notification) => (
                            <NotificationCard
                              key={notification.id}
                              notification={notification}
                              isBusy={busyId === notification.id}
                              onMarkAsRead={(id) => markAsRead.mutate(id)}
                              onMarkAsUnread={(id) => markAsUnread.mutate(id)}
                              onDelete={(id) => deleteSingle.mutate(id)}
                            />
                          ))}
                        </div>
                      </section>
                    ))}

                    {data.total > 0 && (
                      <div className="pt-2">
                        <Pagination
                          currentPage={page}
                          totalPages={Math.ceil(data.total / limit)}
                          totalItems={data.total}
                          pageSize={limit}
                          onPageChange={(nextPage) => setParam("page", nextPage)}
                          onPageSizeChange={(nextLimit) =>
                            setParam("limit", nextLimit)
                          }
                          showPageSizeSelector={true}
                          pageSizeOptions={[10, 20, 50]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
