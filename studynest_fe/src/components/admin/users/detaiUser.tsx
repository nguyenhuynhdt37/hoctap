"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Mail,
  Pencil,
  ShieldCheck,
  TrendingUp,
  Unlock,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { UserDetailResponse } from "@/types/admin/user-detail";
import { formatUserDateTime, getRoleBadge } from "./user-visuals";

interface UserDetailProps {
  userId: string;
}

export default function DetaiUser({ userId }: UserDetailProps) {
  const [unlocking, setUnlocking] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<UserDetailResponse>(
    `/admin/users/${userId}`,
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  async function handleUnlock() {
    setUnlocking(true);
    try {
      await api.post(`/admin/users/${userId}/unlock_ban`);
      toast.success("Đã mở khóa tài khoản thành công!");
      await mutate();
    } catch {
      toast.error("Không thể mở khóa tài khoản.");
    } finally {
      setUnlocking(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-[1440px] space-y-6 p-6">
        <div className="h-48 animate-pulse rounded-[2rem] border border-border bg-surface" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-3xl border border-border bg-surface"
            />
          ))}
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-[1440px] p-6">
        <div className="rounded-3xl border border-destructive-border bg-destructive-bg p-6 text-sm text-destructive-foreground">
          Không tải được hồ sơ người dùng.{" "}
          <Link href="/admin/users" className="underline">
            Quay lại danh sách
          </Link>
        </div>
      </main>
    );
  }

  const { profile, status, roles, statistics, transactions, recent_activity } =
    data;
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round(statistics?.average_progress ?? 0)),
  );

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
        >
          <ArrowLeft size={14} />
          Danh sách thành viên
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {status.is_banned && (
            <Button
              variant="outline"
              size="sm"
              disabled={unlocking}
              onClick={() => void handleUnlock()}
            >
              <Unlock size={14} />
              {unlocking ? "Đang mở khóa..." : "Mở khóa tài khoản"}
            </Button>
          )}
          <Link href={`/admin/users/${profile.id}/edit`}>
            <Button size="sm">
              <Pencil size={14} />
              Chỉnh sửa hồ sơ
            </Button>
          </Link>
        </div>
      </div>

      {/* Identity Hero Banner */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/90 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/75 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {profile.avatar ? (
              <img
                src={getImageUrl(profile.avatar)}
                alt={profile.fullname}
                className="h-20 w-20 rounded-3xl border-2 border-surface object-cover shadow-md"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-primary-pastel bg-surface text-2xl font-bold text-primary shadow-sm">
                {(profile.fullname || profile.email).slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {profile.fullname || "Chưa đặt tên"}
                </h1>
                {roles.map((role) => {
                  const rb = getRoleBadge(role);
                  return (
                    <span
                      key={role}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${rb.cls}`}
                    >
                      {rb.label}
                    </span>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(profile.email);
                  toast.success("Đã sao chép Email");
                }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
              >
                <Mail size={14} animated={false} />
                <span>{profile.email}</span>
                <Copy size={12} animated={false} />
              </button>

              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold ${
                    status.is_verified_email
                      ? "border-success-border bg-success-bg text-success-foreground"
                      : "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                  }`}
                >
                  <ShieldCheck size={12} animated={false} />
                  {status.is_verified_email
                    ? "Đã xác thực Email"
                    : "Chưa xác thực Email"}
                </span>
                {status.is_banned && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-destructive-border bg-destructive-bg px-2.5 py-0.5 font-semibold text-destructive-foreground">
                    <Ban size={12} animated={false} />
                    Đang bị khóa
                  </span>
                )}
                {status.deleted_at && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-secondary-pastel bg-secondary-light px-2.5 py-0.5 font-semibold text-secondary-foreground">
                    Đã xóa mềm
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ban / Delete Alert */}
      {(status.is_banned || status.deleted_at) && (
        <div className="flex items-start gap-3 rounded-3xl border border-destructive-border bg-destructive-bg/60 p-5 text-sm text-destructive-foreground">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            {status.is_banned && (
              <p>
                <strong>Tài khoản đang bị khóa:</strong>{" "}
                {status.banned_reason || "Không ghi lý do"}{" "}
                {status.banned_until
                  ? `(đến ${formatUserDateTime(status.banned_until)})`
                  : "(vĩnh viễn)"}
              </p>
            )}
            {status.deleted_at && (
              <p>
                <strong>Đã xóa mềm lúc {formatUserDateTime(status.deleted_at)}:</strong>{" "}
                {status.deleted_until || "Không ghi lý do"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 4 Learning & Spend KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BookOpen size={14} className="text-primary" />
            Khóa học đã ghi danh
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {statistics.total_courses_enrolled} khóa
          </p>
        </div>

        <div className="rounded-3xl border border-success-border/70 bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2 size={14} className="text-success-foreground" />
            Đã hoàn thành
          </p>
          <p className="mt-2 text-2xl font-bold text-success-foreground">
            {statistics.total_courses_completed} khóa
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-medium text-muted-foreground">
              <TrendingUp size={14} className="text-primary" />
              Tiến độ trung bình
            </span>
            <span className="font-bold text-primary">{progressPct}%</span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-accent-vanilla-border/90 bg-surface p-5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Coins size={14} className="text-accent-vanilla-foreground" />
            Tổng chi tiêu học tập
          </p>
          <p className="mt-2 text-2xl font-bold text-accent-vanilla-foreground">
            {formatVndAsCoin(Math.round(transactions?.total_spent || 0))}
          </p>
        </div>
      </section>

      {/* 2-Column Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Calendar size={17} className="text-primary" />
            Thông tin Tài khoản &amp; Mốc thời gian
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-background/60 px-4 py-2.5">
              <dt className="text-xs text-muted-foreground">Ngày sinh</dt>
              <dd className="font-medium text-foreground">
                {profile.birthday || "Chưa cập nhật"}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-background/60 px-4 py-2.5">
              <dt className="text-xs text-muted-foreground">Ngày tham gia</dt>
              <dd className="font-medium text-foreground">
                {formatUserDateTime(profile.created_at)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-background/60 px-4 py-2.5">
              <dt className="text-xs text-muted-foreground">Xác thực Email lúc</dt>
              <dd className="font-medium text-foreground">
                {formatUserDateTime(status.email_verified_at)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-background/60 px-4 py-2.5">
              <dt className="text-xs text-muted-foreground">Đăng nhập gần nhất</dt>
              <dd className="font-medium text-foreground">
                {formatUserDateTime(status.last_login_at)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Clock size={17} className="text-primary" />
            Hoạt động Học tập &amp; Thanh toán Gần nhất
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-background/60 px-4 py-3">
              <dt className="text-xs text-muted-foreground">
                Khóa học xem gần nhất
              </dt>
              <dd className="mt-1 font-semibold text-foreground">
                {recent_activity?.last_watched_course || "Chưa có lịch sử học"}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-background/60 px-4 py-2.5">
              <dt className="text-xs text-muted-foreground">Thời điểm học cuối</dt>
              <dd className="font-medium text-foreground">
                {formatUserDateTime(recent_activity?.last_watched_time)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-background/60 px-4 py-2.5">
              <dt className="text-xs text-muted-foreground">Thanh toán gần nhất</dt>
              <dd className="font-medium text-foreground">
                {formatUserDateTime(transactions?.last_payment_at)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
