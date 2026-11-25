"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Mail,
  RefreshCw,
  Search,
  Trash2,
} from "pulsoicon-react";
import { Button, Pagination } from "@/components/ui";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  DeletedUsersResponse,
  UsersQueryParams,
} from "@/types/admin/user";
import {
  UsersAdminNav,
  formatUserDateTime,
  getRoleBadge,
} from "./user-visuals";

const DELETED_USERS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  size: { type: "number", default: 12, min: 1, max: 100 },
  search: { type: "string", default: "" },
  sort_by: {
    type: "string",
    default: "deleted_at" as
      | "fullname"
      | "email"
      | "created_at"
      | "deleted_at"
      | "total_courses",
    allowed: [
      "fullname",
      "email",
      "created_at",
      "deleted_at",
      "total_courses",
    ] as const,
  },
  order: {
    type: "string",
    default: "desc" as "asc" | "desc",
    allowed: ["asc", "desc"] as const,
  },
  is_verified_email: {
    type: "string",
    default: "" as "" | "true" | "false",
    allowed: ["", "true", "false"] as const,
  },
} as const;

export default function DeletedUsers() {
  const router = useRouter();
  const { values, setParam, setParams, resetParams } = useUrlQueryState(
    DELETED_USERS_QUERY_SCHEMA,
  );
  const {
    page,
    size,
    search,
    sort_by: sortBy,
    order,
    is_verified_email: verifiedParam,
  } = values;

  const { inputValue: searchInput, setInputValue: setSearchInput } =
    useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const queryParams = useMemo<UsersQueryParams>(() => {
    const p: UsersQueryParams = {
      page,
      size,
      sort_by: sortBy,
      order,
    };
    if (search.trim()) p.search = search.trim();
    if (verifiedParam !== "") p.is_verified_email = verifiedParam === "true";
    return p;
  }, [page, size, sortBy, order, search, verifiedParam]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<DeletedUsersResponse>(
      ["/admin/users/deleted", queryParams],
      async ([url, params]: [string, UsersQueryParams]) => {
        const res = await api.get(url, { params });
        return res.data;
      },
      { revalidateOnFocus: false },
    );

  const items = data?.items ?? [];
  const totalItems = data?.total_items ?? 0;
  const totalPages = Math.max(1, data?.total_pages ?? 1);

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      <UsersAdminNav />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-secondary-pastel/80 bg-gradient-to-br from-secondary-light/65 via-surface to-primary-light/50 p-6 shadow-[0_20px_42px_-16px_rgba(53,111,167,0.14)] sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <Trash2 size={13} animated={false} />
              Lưu trữ Tài khoản Đã xóa mềm
            </span>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Tài khoản Đã xóa ({totalItems})
            </h1>
            <p className="text-sm text-muted-foreground">
              Tra cứu lịch sử xóa tài khoản, lý do lưu trữ và số khóa học từng ghi danh.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isValidating}
            onClick={() => void mutate()}
          >
            <RefreshCw
              size={14}
              className={isValidating ? "animate-spin" : ""}
            />
            Làm mới
          </Button>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-surface p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search
            size={15}
            animated={false}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <select
          aria-label="Sắp xếp"
          value={`${sortBy}:${order}`}
          onChange={(e) => {
            const [sb, od] = e.target.value.split(":") as [
              typeof sortBy,
              "asc" | "desc",
            ];
            setParams({ sort_by: sb, order: od, page: 1 });
          }}
          className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
        >
          <option value="deleted_at:desc">Xóa gần đây nhất</option>
          <option value="deleted_at:asc">Xóa cũ nhất</option>
          <option value="fullname:asc">Tên A → Z</option>
        </select>

        {(search || verifiedParam) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              resetParams();
            }}
          >
            Đặt lại
          </Button>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive-border bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          Không tải được danh sách tài khoản đã xóa.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-3xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface p-14 text-center text-sm text-muted-foreground">
          Không có tài khoản nào trong mục Đã xóa.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((u) => (
            <article
              key={u.id}
              onClick={() => router.push(`/admin/users/${u.id}`)}
              className="flex cursor-pointer flex-col justify-between rounded-3xl border border-secondary-pastel/70 bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] transition-all hover:-translate-y-0.5 hover:border-primary-pastel"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-foreground">
                      {u.fullname || "Chưa đặt tên"}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail size={11} animated={false} />
                      {u.email}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-secondary-pastel bg-secondary-light px-2.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    Đã xóa
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  {(u.roles ?? []).map((role) => {
                    const rb = getRoleBadge(role);
                    return (
                      <span
                        key={role}
                        className={`rounded-full border px-2 py-0.5 font-semibold ${rb.cls}`}
                      >
                        {rb.label}
                      </span>
                    );
                  })}
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-muted-foreground">
                    <BookOpen size={11} animated={false} />
                    {u.total_courses ?? 0} khóa
                  </span>
                </div>

                {u.deleted_until && (
                  <p className="mt-3 rounded-xl bg-secondary-light/40 px-3 py-2 text-xs text-secondary-foreground">
                    Lý do: {u.deleted_until}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} animated={false} />
                  {formatUserDateTime(u.deleted_at)}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <Eye size={13} animated={false} />
                  Hồ sơ
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={size}
        itemLabel="tài khoản"
        onPageChange={(nextPage) => setParam("page", nextPage)}
        onPageSizeChange={(nextSize) =>
          setParams({ size: nextSize, page: 1 })
        }
      />
    </main>
  );
}
