"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Mail,
  Pencil,
  Receipt,
  ShieldCheck,
  Star,
  Unlock,
  UserMinus,
  Users,
  Wallet,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import {
  DEFAULT_COIN_VND_RATE,
  formatCoin,
  formatVndAsCoin,
} from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type {
  LecturerCoursesResponse,
  LecturerDetailResponse,
} from "@/types/admin/lecturer-detail";
import LecturerDrawer from "./lecturer-drawer";

const formatDateTime = (val?: string | null) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "—";
  }
};

export default function DetailLecturer({ lecturerId }: { lecturerId: string }) {
  const router = useRouter();
  const [coursesPage, setCoursesPage] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<LecturerDetailResponse>(
    `/admin/lecturers/${lecturerId}?page=${txPage}&size=6`,
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const { data: coursesData } = useSWR<LecturerCoursesResponse>(
    `/admin/lecturers/${lecturerId}/courses?page=${coursesPage}&size=6&sort_by=created_at&order=desc`,
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  async function handleUnban() {
    setBusy(true);
    try {
      await api.post(`/admin/lecturers/${lecturerId}/unban`);
      toast.success("Đã mở khóa giảng viên!");
      await mutate();
    } catch {
      toast.error("Không thể mở khóa giảng viên.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveRole() {
    if (
      !window.confirm(
        "Gỡ quyền Giảng viên của tài khoản này? Tài khoản vẫn giữ vai trò Học viên.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/admin/lecturers/${lecturerId}/remove_role_lecturer`);
      toast.success("Đã gỡ quyền giảng viên.");
      router.push("/admin/lecturers");
    } catch {
      toast.error("Không thể gỡ quyền giảng viên.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-[1440px] space-y-6 p-6">
        <div className="h-48 animate-pulse rounded-[2.5rem] border border-border bg-surface" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-[1440px] p-6">
        <div className="rounded-3xl border border-destructive-border bg-destructive-bg p-6 text-sm text-destructive-foreground">
          Không tải được hồ sơ giảng viên.{" "}
          <Link href="/admin/lecturers" className="underline">
            Quay lại danh sách
          </Link>
        </div>
      </main>
    );
  }

  const courses = coursesData?.items ?? [];
  const transactions = data.transactions ?? [];

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/lecturers"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
        >
          <ArrowLeft size={14} />
          Đội ngũ Giảng viên
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDrawerOpen(true)}
          >
            <Pencil size={14} />
            Chỉnh sửa hồ sơ
          </Button>
          {data.is_banned && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void handleUnban()}
            >
              <Unlock size={14} />
              Mở khóa
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => void handleRemoveRole()}
          >
            <UserMinus size={14} />
            Gỡ quyền GV
          </Button>
        </div>
      </div>

      {/* Cloud Identity Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/90 bg-gradient-to-br from-primary-light/95 via-surface/95 to-accent-vanilla/45 p-6 shadow-[0_24px_56px_-18px_rgba(53,111,167,0.18)] sm:p-8">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {data.avatar ? (
              <img
                src={getImageUrl(data.avatar)}
                alt={data.fullname}
                className="h-20 w-20 rounded-3xl border-2 border-surface object-cover shadow-md"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-accent-vanilla-border bg-accent-vanilla text-2xl font-bold text-accent-vanilla-foreground">
                {(data.fullname || data.email).slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {data.fullname}
                </h1>
                {data.is_verified_email && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success-foreground">
                    <ShieldCheck size={12} animated={false} />
                    Email đã xác thực
                  </span>
                )}
                {data.is_banned && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-destructive-border bg-destructive-bg px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
                    <Ban size={12} animated={false} />
                    Đang bị khóa
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(data.email);
                  toast.success("Đã sao chép Email");
                }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
              >
                <Mail size={14} animated={false} />
                <span>{data.email}</span>
                <Copy size={12} animated={false} />
              </button>

              {data.bio && (
                <p className="max-w-2xl text-xs leading-relaxed text-foreground/80">
                  {data.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 4 Wallet & Revenue KPIs */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Wallet size={13} className="text-primary" />
              Số dư Coin thật
            </p>
            <p className="mt-1 text-xl font-bold text-primary">
              {formatCoin(data.wallet?.paid_coins ?? data.wallet?.balance ?? 0)}
            </p>
            {(data.wallet?.bonus_coins ?? 0) > 0 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                +{formatCoin(data.wallet?.bonus_coins)} Coin thưởng
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Coins size={13} className="text-success-foreground" />
              Tổng thu nhập khóa học
            </p>
            <p className="mt-1 text-xl font-bold text-success-foreground">
              +
              {formatVndAsCoin(
                Math.round(
                  (data.wallet?.total_earnings_vnd || 0) > 0
                    ? data.wallet?.total_earnings_vnd || 0
                    : data.wallet?.total_in || 0,
                ),
                data.wallet?.coin_vnd_rate || DEFAULT_COIN_VND_RATE,
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground">
              Tổng đã rút ra
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">
              -
              {formatVndAsCoin(
                Math.round(data.wallet?.total_out || 0),
                data.wallet?.coin_vnd_rate || DEFAULT_COIN_VND_RATE,
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-surface/85 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Clock size={13} animated={false} />
              Giao dịch ví cuối
            </p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {formatDateTime(data.wallet?.last_transaction_at)}
            </p>
          </div>
        </div>
      </section>

      {/* Courses & Transactions 2-Column */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Courses List */}
        <section className="rounded-[2rem] border border-primary-pastel/60 bg-surface/95 p-6 shadow-[0_14px_36px_-16px_rgba(53,111,167,0.14)] lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <BookOpen size={18} className="text-primary" />
              Khóa học Giảng dạy ({coursesData?.total_items ?? courses.length})
            </h2>
          </div>

          {courses.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
              Giảng viên chưa xuất bản khóa học nào.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/50 p-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {c.thumbnail ? (
                      <img
                        src={getImageUrl(c.thumbnail)}
                        alt={c.title}
                        className="h-12 w-16 shrink-0 rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                        <BookOpen size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {c.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5 text-accent-vanilla-foreground">
                          <Star size={11} animated={false} />
                          {(c.rating_avg ?? 0).toFixed(1)}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Users size={11} animated={false} />
                          {c.total_enrolls ?? 0} HV
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            c.is_published
                              ? "bg-success-bg text-success-foreground"
                              : "bg-accent-vanilla text-accent-vanilla-foreground"
                          }`}
                        >
                          {c.is_published ? "Đã xuất bản" : "Nháp"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-primary">
                    {formatVndAsCoin(Math.round(c.price || 0))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {coursesData && coursesData.total_pages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
              <span className="text-muted-foreground">
                Trang {coursesPage} / {coursesData.total_pages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={coursesPage <= 1}
                  onClick={() => setCoursesPage((p) => p - 1)}
                >
                  <ChevronLeft size={13} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={coursesPage >= coursesData.total_pages}
                  onClick={() => setCoursesPage((p) => p + 1)}
                >
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Transactions */}
        <section className="rounded-[2rem] border border-primary-pastel/60 bg-surface/95 p-6 shadow-[0_14px_36px_-16px_rgba(53,111,167,0.14)] lg:col-span-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Receipt size={18} className="text-primary" />
            Giao dịch Gần đây ({data.pagination?.total ?? transactions.length})
          </h2>

          {transactions.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
              Chưa có giao dịch nào.
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {transactions.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/transactions/${t.id}`}
                  className="block rounded-2xl border border-border/80 bg-background/50 p-3.5 text-xs transition-colors hover:border-primary-pastel hover:bg-surface"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold uppercase text-primary">
                      {t.type}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatVndAsCoin(Math.round(t.amount || 0))}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-muted-foreground">
                    {t.description || t.transaction_code || "Giao dịch hệ thống"}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{t.status}</span>
                    <span>{formatDateTime(t.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {data.pagination && data.pagination.total_pages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
              <span className="text-muted-foreground">
                Trang {txPage} / {data.pagination.total_pages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={txPage <= 1}
                  onClick={() => setTxPage((p) => p - 1)}
                >
                  <ChevronLeft size={13} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={txPage >= data.pagination.total_pages}
                  onClick={() => setTxPage((p) => p + 1)}
                >
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Edit Drawer */}
      <LecturerDrawer
        open={drawerOpen}
        editing={{
          id: data.id,
          fullname: data.fullname,
          email: data.email,
          bio: data.bio,
          is_verified_email: data.is_verified_email,
        }}
        onClose={() => setDrawerOpen(false)}
        onSaved={async () => {
          await mutate();
        }}
      />
    </main>
  );
}
