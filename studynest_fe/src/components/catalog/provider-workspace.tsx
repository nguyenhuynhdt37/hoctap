"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { Building2, Plus, Search, ClipboardList } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
} from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { useRealtimeNotiStore } from "@/stores/notifications";
import type { Provider } from "@/types/catalog";
import {
  providerTypeLabels,
  requestStatusLabels,
  type ProviderPage,
  type ProviderRequest,
} from "@/types/provider";
import ProviderJoins from "./provider-joins";
import ProviderEditor from "./provider-editor";
import ProviderRequestForm from "./provider-request-form";
import ProviderRequestDetail from "./provider-request-detail";
import { providerDate } from "./provider-utils";
import CatalogAdminNav from "@/components/admin/catalog/catalog-nav";

export default function ProviderWorkspace({
  admin = false,
}: {
  admin?: boolean;
}) {
  const [joinProvider, setJoinProvider] = useState<Provider | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const params = useSearchParams();
  const router = useRouter();
  const requestId = params.get("request_id");
  const [tab, setTab] = useState(
    params.get("view") === "joins"
      ? "joins"
      : requestId || params.get("view") === "requests"
        ? "requests"
        : "directory",
  );
  const [page, setPage] = useState(1);
  const [directoryFilters, setDirectoryFilters] = useState({
    provider_type: "",
    province: "",
    verification_status: "",
    is_active: "",
    sort: "name_asc",
  });
  function updateDirectoryFilter(
    field: keyof typeof directoryFilters,
    value: string,
  ) {
    setDirectoryFilters((previous) => ({ ...previous, [field]: value }));
    setPage(1);
  }

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(admin ? "pending" : "");
  const [createRequest, setCreateRequest] = useState(false);
  const [editing, setEditing] = useState<Partial<Provider> | null>(null);
  const { mutate: invalidate } = useSWRConfig();
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (requestId) setTab("requests");
    else if (params.get("view") === "joins") setTab("joins");
  }, [requestId, params]);
  const scope = admin ? "/admin" : "/lecturer";
  const size = 12;
  const directoryQuery = new URLSearchParams({
    page: String(page),
    size: String(size),
    search: debouncedSearch,
  });
  for (const [name, value] of Object.entries(directoryFilters)) {
    if (
      value &&
      (admin || !["verification_status", "is_active"].includes(name))
    )
      directoryQuery.set(name, value);
  }
  const directoryKey =
    tab !== "requests" && tab !== "joins"
      ? `${scope}/${tab === "mine" || admin ? "providers" : "provider-directory"}?${directoryQuery}`
      : null;
  const { data: filterOptions } = useSWR<{ provinces: string[] }>(
    directoryKey ? `${scope}/provider-directory-options` : null,
    (url: string) => api.get(url).then((r) => r.data),
  );
  const {
    data: directory,
    error: directoryError,
    isLoading: directoryLoading,
    mutate: reloadDirectory,
  } = useSWR<ProviderPage<Provider & { is_member?: boolean }>>(
    directoryKey,
    (url: string) => api.get(url).then((r) => r.data),
  );
  const {
    data: requests,
    error: requestError,
    isLoading: requestLoading,
    mutate: reloadRequests,
  } = useSWR<ProviderPage<ProviderRequest>>(
    tab === "requests"
      ? `${scope}/provider-requests?page=${page}&size=${size}${status ? `&status=${status}` : ""}${admin ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`
      : null,
    (url: string) => api.get(url).then((r) => r.data),
  );
  const { data: pending } = useSWR<ProviderPage<ProviderRequest>>(
    admin ? "/admin/provider-requests?status=pending&size=1" : null,
    (url: string) => api.get(url).then((r) => r.data),
  );
  const refresh = useCallback(() => {
    void invalidate(
      (key) =>
        typeof key === "string" &&
        /provider-(?:join-)?requests|provider-directory|\/providers/.test(key),
    );
  }, [invalidate]);
  const providerEvent = useRealtimeNotiStore(
    (state) =>
      state.buckets[admin ? "ADMIN" : "LECTURER"]?.top10.find(
        (notification) => notification.type === "provider",
      )?.id,
  );
  useEffect(() => {
    if (providerEvent) refresh();
  }, [providerEvent, refresh]);
  function openRequest(id: string) {
    router.replace(`${scope}/providers?view=requests&request_id=${id}`, {
      scroll: false,
    });
  }
  function changeTab(value: string) {
    setTab(value);
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
    router.replace(
      `${scope}/providers${value === "joins" ? "?view=joins" : value === "requests" ? "?view=requests" : ""}`,
      { scroll: false },
    );
  }
  const error = tab === "requests" ? requestError : directoryError;
  const loading = tab === "requests" ? requestLoading : directoryLoading;
  const total =
    tab === "requests" ? (requests?.total ?? 0) : (directory?.total ?? 0);
  useEffect(() => {
    const loaded = tab === "requests" ? requests : directory;
    if (
      loaded &&
      !loading &&
      !error &&
      page > Math.max(1, Math.ceil(total / size))
    ) {
      setPage(Math.max(1, Math.ceil(total / size)));
    }
  }, [tab, requests, directory, loading, error, page, total]);
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-foreground sm:px-6">
      {admin && <CatalogAdminNav />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Building2 className="h-4 w-4" />
            {admin ? "Quản trị hệ thống" : "Không gian giảng viên"}
          </div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Đơn vị cung cấp
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {admin
              ? "Quản lý thông tin đơn vị, xét duyệt đề nghị của giảng viên và cấp quyền tham gia."
              : "Tra cứu trường, trung tâm đã xác minh và xin gia nhập các đơn vị đang công tác. Nếu chưa có đơn vị, gửi đề nghị để admin tạo mới."}
          </p>
        </div>
        <Button
          disabled={!ready}
          onClick={() =>
            admin
              ? setEditing({ verification_status: "verified", is_active: true })
              : setCreateRequest(true)
          }
          leftIcon={<Plus className="h-4 w-4" />}
        >
          {admin ? "Thêm đơn vị" : "Yêu cầu tạo đơn vị"}
        </Button>
      </div>
      {!admin && (
        <Alert variant="info" title="Admin quản lý đơn vị và quyền tham gia">
          Danh sách chung dùng để tra cứu. Bạn chỉ được chọn đơn vị đã được cấp
          quyền trong khóa học. Chọn đúng trường hoặc đơn vị đang công tác rồi
          gửi yêu cầu gia nhập để admin đối chiếu và duyệt.
        </Alert>
      )}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Danh sách đơn vị và yêu cầu"
      >
        <Button
          variant={tab === "directory" ? "primary" : "outline"}
          disabled={!ready}
          aria-pressed={tab === "directory"}
          onClick={() => changeTab("directory")}
        >
          {admin ? "Quản lý đơn vị" : "Danh sách đơn vị"}
        </Button>
        {!admin && (
          <Button
            variant={tab === "mine" ? "primary" : "outline"}
            disabled={!ready}
            aria-pressed={tab === "mine"}
            onClick={() => changeTab("mine")}
          >
            Đơn vị được cấp quyền
          </Button>
        )}
        <Button
          variant={tab === "requests" ? "primary" : "outline"}
          disabled={!ready}
          aria-pressed={tab === "requests"}
          onClick={() => changeTab("requests")}
          leftIcon={<ClipboardList className="h-4 w-4" />}
        >
          {admin
            ? `Yêu cầu chờ duyệt${pending ? ` (${pending.total})` : ""}`
            : "Yêu cầu của tôi"}
        </Button>
        <Button
          variant={tab === "joins" ? "primary" : "outline"}
          disabled={!ready}
          aria-pressed={tab === "joins"}
          onClick={() => changeTab("joins")}
        >
          Yêu cầu gia nhập
        </Button>
      </div>
      {tab === "joins" ? (
        <ProviderJoins
          admin={admin}
          selected={joinProvider}
          onClose={() => setJoinProvider(null)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(admin || tab !== "requests") && (
              <Input
                disabled={!ready}
                label={
                  tab === "requests"
                    ? "Tìm yêu cầu theo tên đơn vị"
                    : "Tìm theo tên đơn vị"
                }
                value={search}
                placeholder="Tên đơn vị, tỉnh/thành hoặc mã trường"
                maxLength={160}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            )}
            {tab === "requests" && (
              <Select
                label="Trạng thái yêu cầu"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(requestStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </div>
          {tab !== "requests" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Loại đơn vị"
                value={directoryFilters.provider_type}
                onChange={(event) =>
                  updateDirectoryFilter("provider_type", event.target.value)
                }
              >
                <option value="">Tất cả loại đơn vị</option>
                {Object.entries(providerTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                label="Tỉnh / thành phố"
                value={directoryFilters.province}
                onChange={(event) =>
                  updateDirectoryFilter("province", event.target.value)
                }
              >
                <option value="">Tất cả tỉnh / thành phố</option>
                {filterOptions?.provinces.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <Select
                label="Sắp xếp đơn vị"
                value={directoryFilters.sort}
                onChange={(event) =>
                  updateDirectoryFilter("sort", event.target.value)
                }
              >
                <option value="name_asc">Tên A → Z</option>
                <option value="name_desc">Tên Z → A</option>
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
              </Select>
              {admin && (
                <>
                  <Select
                    label="Trạng thái hoạt động đơn vị"
                    value={directoryFilters.is_active}
                    onChange={(event) =>
                      updateDirectoryFilter("is_active", event.target.value)
                    }
                  >
                    <option value="">Tất cả trạng thái hoạt động</option>
                    <option value="true">Đang hoạt động</option>
                    <option value="false">Đã ẩn</option>
                  </Select>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDirectoryFilters({
                    provider_type: "",
                    province: "",
                    verification_status: "",
                    is_active: "",
                    sort: "name_asc",
                  });
                  setSearch("");
                  setDebouncedSearch("");
                  setPage(1);
                }}
              >
                Xóa bộ lọc
              </Button>
            </div>
          )}
          {error ? (
            <Alert variant="destructive" title="Không tải được danh sách">
              <Button
                variant="outline"
                onClick={() =>
                  tab === "requests" ? reloadRequests() : reloadDirectory()
                }
              >
                Thử lại
              </Button>
            </Alert>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="h-44" />
              ))}
            </div>
          ) : total === 0 ? (
            <EmptyState
              title={
                tab === "requests"
                  ? "Chưa có yêu cầu phù hợp"
                  : tab === "mine"
                    ? "Bạn chưa được cấp quyền vào đơn vị nào"
                    : "Chưa có đơn vị phù hợp"
              }
              description={
                tab === "mine"
                  ? "Admin sẽ xác minh và cấp quyền cho bạn. Khóa học cá nhân không cần gắn đơn vị."
                  : tab === "directory" && !admin
                    ? "Thử từ khóa khác hoặc gửi yêu cầu tạo đơn vị mới."
                    : "Thay đổi bộ lọc hoặc quay lại sau."
              }
            />
          ) : tab === "requests" ? (
            <div className="relative overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="bg-primary-light">
                  <tr>
                    <th className="p-4">Đơn vị</th>
                    {admin && <th className="p-4">Người gửi</th>}
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4">Ngày gửi</th>
                    <th className="p-4">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests?.items.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-4">
                        <span className="font-medium">{item.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {providerTypeLabels[item.provider_type]}
                        </span>
                      </td>
                      {admin && (
                        <td className="p-4">{item.requester.fullname}</td>
                      )}
                      <td className="p-4">
                        <Badge
                          variant={
                            item.status === "approved"
                              ? "success"
                              : item.status === "rejected"
                                ? "destructive"
                                : "info"
                          }
                        >
                          {requestStatusLabels[item.status]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap p-4">
                        {providerDate(item.created_at)}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRequest(item.id)}
                        >
                          Xem chi tiết
                          <span className="sr-only"> {item.name}</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {directory?.items.map((item) => (
                <Card key={item.id} className="flex min-w-0 flex-col gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-primary-light text-xl font-semibold text-primary">
                    {item.logo_url ? (
                      <img
                        src={item.logo_url}
                        alt={`Ảnh đại diện ${item.name}`}
                        className="h-full w-full object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      item.name.trim().charAt(0)
                    )}
                  </div>
                  <div>
                    <Badge variant="info">
                      {providerTypeLabels[item.provider_type]}
                    </Badge>
                    <h2 className="mt-3 break-words text-lg font-semibold">
                      {item.name}
                    </h2>
                    {(item.province || item.address) && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {item.address || item.province}
                      </p>
                    )}
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {item.description || "Đơn vị chưa có giới thiệu."}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    {admin && !item.is_active && (
                      <Badge variant="outline">Đã ẩn</Badge>
                    )}
                    {!admin && (tab === "mine" || item.is_member) && (
                      <Badge variant="primary">Đã cấp quyền</Badge>
                    )}
                  </div>
                  {!admin &&
                    tab !== "mine" &&
                    !item.is_member &&
                    item.provider_type !== "individual" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setJoinProvider(item);
                          changeTab("joins");
                        }}
                      >
                        Xin gia nhập
                        <span className="sr-only"> {item.name}</span>
                      </Button>
                    )}
                  {admin ? (
                    <Button variant="outline" onClick={() => setEditing(item)}>
                      Quản lý đơn vị
                      <span className="sr-only"> {item.name}</span>
                    </Button>
                  ) : item.verification_status === "verified" ? (
                    <Link
                      href={`/providers/${item.slug}`}
                      className="relative text-sm font-medium text-primary underline underline-offset-4"
                    >
                      Xem hồ sơ đơn vị
                      <span className="sr-only"> {item.name}</span>
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Admin đang rà soát thông tin đơn vị.
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
          {total > size && (
            <nav
              aria-label="Phân trang đơn vị"
              className="flex items-center justify-between gap-3"
            >
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Trang trước
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {page} / {Math.ceil(total / size)} · {total} mục
              </span>
              <Button
                variant="outline"
                disabled={page * size >= total}
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </Button>
            </nav>
          )}
        </>
      )}
      {createRequest && (
        <ProviderRequestForm
          onClose={() => setCreateRequest(false)}
          onCreated={(request) => {
            setCreateRequest(false);
            refresh();
            setTab("requests");
            setStatus("");
            setPage(1);
            openRequest(request.id);
          }}
        />
      )}
      {editing && admin && (
        <Modal
          open
          size="lg"
          title={editing.id ? "Quản lý đơn vị" : "Thêm đơn vị"}
          onClose={() => setEditing(null)}
        >
          <ProviderEditor
            key={editing.id || "new"}
            admin
            value={editing}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
      {requestId && (
        <ProviderRequestDetail
          key={requestId}
          id={requestId}
          admin={admin}
          onClose={() =>
            router.replace(`${scope}/providers?view=requests`, {
              scroll: false,
            })
          }
          onChanged={refresh}
        />
      )}
    </main>
  );
}
