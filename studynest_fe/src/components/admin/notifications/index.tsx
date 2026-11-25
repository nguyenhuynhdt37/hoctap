"use client";

import Pagination from "@/components/shared/pagination";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useRealtimeNotiStore } from "@/stores/notifications";
import {
  NotificationsQueryParams,
  NotificationsResponse,
} from "@/types/user/notification";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, CircleAlert } from "pulsoicon-react";
import { NotificationCard } from "./notification-card";
import { Toolbar } from "./toolbar";

const NOTIFICATIONS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: 20, min: 1, max: 100 },
  search: { type: "string", default: "" },
  type: {
    type: "string",
    default: "" as "" | "wallet" | "course" | "system" | "learning",
    allowed: ["", "wallet", "course", "system", "learning"] as const,
  },
  read: {
    type: "string",
    default: "" as "" | "true" | "false",
    allowed: ["", "true", "false"] as const,
  },
  sort_by: {
    type: "string",
    default: "created_at" as "created_at" | "title" | "type" | "is_read",
    allowed: ["created_at", "title", "type", "is_read"] as const,
  },
  order_dir: {
    type: "string",
    default: "desc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
} as const;

export default function Notifications() {
  const { values, setParam, setParams } = useUrlQueryState(
    NOTIFICATIONS_QUERY_SCHEMA
  );
  const {
    page,
    limit,
    search,
    type,
    read,
    sort_by: sortBy,
    order_dir: orderDir,
  } = values;

  const { inputValue: searchInput, setInputValue: setSearchInput } =
    useDebouncedUrlSearch(search, (val) => setParam("search", val));

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
    queryKey: ["notifications", "admin", params],
    queryFn: () =>
      api.get("/notifications/admin", { params }).then((r) => r.data),
  });

  useEffect(() => {
    if (data && page === 1 && !search && !type && read === "") {
      hydrate("ADMIN", data.items.slice(0, 10), data.unread ?? 0);
    }
  }, [data, page, search, type, read, hydrate]);

  const markAsRead = useMutation({
    mutationFn: (id: string) =>
      api.post(`/notifications/${id}/read`, {}).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "admin"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () =>
      api
        .post("/notifications/read/all", { role: "ADMIN" })
        .then((r) => r.data),
    onSuccess: () => {
      markAllAsRead("ADMIN");
      queryClient.invalidateQueries({ queryKey: ["notifications", "admin"] });
      showToast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Thông báo</h1>
              <p className="text-sm text-gray-600 mt-2">
                Quản lý tất cả thông báo hệ thống
              </p>
            </div>
            {data?.unread && data.unread > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200">
                  <Bell className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">
                    {data.unread} chưa đọc
                  </span>
                </div>
                <button
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          <Toolbar
            search={searchInput}
            onSearchChange={setSearchInput}
            type={type}
            onTypeChange={(val) =>
              setParam(
                "type",
                val as "" | "wallet" | "course" | "system" | "learning"
              )
            }
            read={read}
            onReadChange={(val) =>
              setParam("read", val as "" | "true" | "false")
            }
            sortBy={sortBy}
            onSortByChange={(val) =>
              setParam(
                "sort_by",
                val as "created_at" | "title" | "type" | "is_read"
              )
            }
            orderDir={orderDir}
            onOrderDirChange={(val) => setParam("order_dir", val)}
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
                  <CircleAlert solid className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Không có thông báo nào
                </h3>
                <p className="text-gray-600">
                  Hiện tại chưa có thông báo nào trong hệ thống.
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
                      onPageChange={(newPage) => setParam("page", newPage)}
                      onPageSizeChange={(newLimit) =>
                        setParams({ limit: newLimit, page: 1 })
                      }
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
