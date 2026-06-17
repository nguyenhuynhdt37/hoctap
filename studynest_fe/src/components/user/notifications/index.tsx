"use client";

import Pagination from "@/components/shared/pagination";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useRealtimeNotiStore } from "@/stores/notifications";
import {
  NotificationsQueryParams,
  NotificationsResponse,
} from "@/types/user/notification";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { HiBell, HiExclamationCircle } from "react-icons/hi";
import { NotificationCard } from "./notification-card";
import { NotificationsToolbar } from "./notifications-toolbar";

export default function Notifications() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [read, setRead] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryClient = useQueryClient();
  const markAllAsRead = useRealtimeNotiStore((s) => s.markAllRead);
  const hydrate = useRealtimeNotiStore((s) => s.hydrate);

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
    mutationFn: (id: string) =>
      api.post(`/notifications/read/${id}`).then((r) => r.data),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old) return old;
          const notification = old.items.find((item) => item.id === id);
          if (!notification || notification.is_read) return old;

          const updatedItems = old.items.map((item) =>
            item.id === id ? { ...item, is_read: true } : item
          );
          return {
            ...old,
            unread: Math.max(0, old.unread - 1),
            items: updatedItems,
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () =>
      api.post("/notifications/read-all/user").then((r) => r.data),
    onSuccess: () => {
      markAllAsRead("USER");
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: ["notifications"] },
        (old) =>
          old
            ? {
                ...old,
                unread: 0,
                items: old.items.map((item) => ({ ...item, is_read: true })),
              }
            : old
      );
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    },
  });

  useEffect(() => setPage(1), [search, type, read, sortBy, orderDir]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Thông báo</h1>
              <p className="text-sm text-gray-600 mt-2">
                Xem và quản lý tất cả thông báo của bạn
              </p>
            </div>
            {data?.unread && data.unread > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200">
                  <HiBell className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">
                    {data.unread} chưa đọc
                  </span>
                </div>
                <button
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="px-4 py-2 bg-[#00bba7] text-white text-sm font-semibold rounded-lg hover:bg-[#00a896] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {markAll.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Đánh dấu đã đọc tất cả</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="mb-6">
          <NotificationsToolbar
            searchQuery={search}
            onSearchChange={setSearch}
            typeFilter={type}
            onTypeFilterChange={setType}
            readFilter={read}
            onReadFilterChange={setRead}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            orderDir={orderDir}
            onOrderDirChange={setOrderDir}
          />
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-gray-200 border border-gray-200"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-6">
            Có lỗi xảy ra khi tải thông báo. Vui lòng thử lại sau.
          </div>
        )}

        {data && (
          <>
            {data.items.length === 0 ? (
              <div className="rounded-xl border border-green-200 bg-white p-12 text-center shadow-sm">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <HiExclamationCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Không có thông báo nào
                </h3>
                <p className="text-gray-600">
                  Hiện tại bạn chưa có thông báo nào.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {data.items.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={(id) => markAsRead.mutate(id)}
                    />
                  ))}
                </div>
                {data.total > 0 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={page}
                      totalPages={Math.ceil(data.total / limit)}
                      totalItems={data.total}
                      pageSize={limit}
                      onPageChange={setPage}
                      onPageSizeChange={setLimit}
                      showPageSizeSelector={true}
                      pageSizeOptions={[10, 20, 50]}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
