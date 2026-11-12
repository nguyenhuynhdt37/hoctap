"use client";

import Pagination from "@/components/shared/pagination";
import { Alert, Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { NotificationCard } from "@/components/user/notifications/notification-card";
import { NotificationsToolbar } from "@/components/user/notifications/notifications-toolbar";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import {
  NotificationsQueryParams,
  NotificationsResponse,
} from "@/types/user/notification";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";

export default function Notifications() {
  const user = useUserStore((s) => s.user);
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
    queryKey: ["notifications", "lecturer", params],
    queryFn: () =>
      api.get("/notifications/lecturer", { params }).then((r) => r.data),
  });

  useEffect(() => {
    if (data && page === 1 && !search && !type && read === "") {
      hydrate("LECTURER", data.items.slice(0, 10), data.unread ?? 0);
    }
  }, [data, page, search, type, read, hydrate]);

  const markAsRead = useMutation({
    mutationFn: (id: string) =>
      api.post(`/notifications/read/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", "lecturer"],
      });
    },
  });

  const markAll = useMutation({
    mutationFn: () =>
      api
        .post("/notifications/read/all", {
          user_id: user?.id,
          role: "LECTURER",
        })
        .then((r) => r.data),
    onSuccess: () => {
      markAllAsRead("LECTURER");
      queryClient.invalidateQueries({
        queryKey: ["notifications", "lecturer"],
      });
      showToast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    },
  });

  useEffect(() => setPage(1), [search, type, read, sortBy, orderDir]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                Thông báo
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Xem và quản lý tất cả thông báo của bạn
              </p>
            </div>
            {data?.unread && data.unread > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="default"
                  size="md"
                  icon={<Bell className="h-3.5 w-3.5" />}
                  className="px-3.5 py-2 text-sm font-semibold"
                >
                  {data.unread} chưa đọc
                </Badge>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => markAll.mutate()}
                  isLoading={markAll.isPending}
                  loadingText="Đang xử lý..."
                  leftIcon={<CheckCheck className="h-4 w-4" />}
                >
                  Đánh dấu đã đọc tất cả
                </Button>
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
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-24 w-full rounded-2xl border border-border"
              />
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            Có lỗi xảy ra khi tải thông báo. Vui lòng thử lại sau.
          </Alert>
        )}

        {data && (
          <>
            {data.items.length === 0 ? (
              <Card variant="surface" className="p-8">
                <EmptyState
                  icon={<Bell className="h-7 w-7" />}
                  title="Không có thông báo nào"
                  description="Hiện tại bạn chưa có thông báo nào."
                />
              </Card>
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
