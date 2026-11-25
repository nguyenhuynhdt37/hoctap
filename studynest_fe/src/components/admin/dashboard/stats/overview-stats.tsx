"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  ArrowUpRight,
  BookOpen,
  Coins,
  GraduationCap,
  RotateCcw,
  TrendingUp,
  Users,
} from "pulsoicon-react";
import api from "@/lib/utils/fetcher/client/axios";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import type { OverviewResponse } from "@/types/admin/statistics";

const formatCurrency = (value: number | null | undefined) =>
  formatVndAsCoin(Math.round(value || 0));

export default function OverviewStats() {
  const { data, isLoading } = useSWR<OverviewResponse>(
    "/admin/statistics/overview",
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const cards = [
    {
      href: "/admin/users",
      title: "Tổng thành viên",
      value: (data?.total_users ?? 0).toLocaleString("vi-VN"),
      sub: "Học viên & tài khoản hệ thống",
      icon: Users,
      iconCls: "border-primary-pastel bg-primary-light text-primary",
      valueCls: "text-foreground",
    },
    {
      href: "/admin/catalog",
      title: "Tổng khóa học",
      value: (data?.total_courses ?? 0).toLocaleString("vi-VN"),
      sub: "Chương trình & học liệu",
      icon: BookOpen,
      iconCls: "border-info-border bg-info-bg text-info-foreground",
      valueCls: "text-foreground",
    },
    {
      href: "/admin/instructors",
      title: "Giảng viên",
      value: (data?.total_instructors ?? 0).toLocaleString("vi-VN"),
      sub: "Đội ngũ đối tác giảng dạy",
      icon: GraduationCap,
      iconCls: "border-accent-border bg-accent text-accent-foreground",
      valueCls: "text-foreground",
    },
    {
      href: "/admin/wallets",
      title: "Tổng doanh thu",
      value: formatCurrency(data?.total_revenue),
      sub: "Tích lũy toàn nền tảng",
      icon: Coins,
      iconCls: "border-success-border bg-success-bg text-success-foreground",
      valueCls: "text-primary",
    },
    {
      href: "/admin/transactions",
      title: "Doanh thu hôm nay",
      value: formatCurrency(data?.today_revenue),
      sub: "Phát sinh trong ngày",
      icon: TrendingUp,
      iconCls:
        "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
      valueCls: "text-success-foreground",
    },
    {
      href: "/admin/withdraws",
      title: "Chờ rút tiền",
      value: `${data?.pending_withdrawals ?? 0} lệnh`,
      sub: "Cần Admin xét duyệt",
      icon: ArrowUpRight,
      iconCls: "border-warning-border bg-warning-bg text-warning-foreground",
      valueCls:
        (data?.pending_withdrawals ?? 0) > 0
          ? "text-warning-foreground"
          : "text-foreground",
    },
    {
      href: "/admin/refunds",
      title: "Chờ hoàn tiền",
      value: `${data?.pending_refunds ?? 0} hồ sơ`,
      sub: "Yêu cầu đang mở",
      icon: RotateCcw,
      iconCls:
        "border-secondary-pastel bg-secondary-light text-secondary-foreground",
      valueCls:
        (data?.pending_refunds ?? 0) > 0
          ? "text-secondary-foreground"
          : "text-foreground",
    },
  ];

  return (
    <section
      aria-label="Chỉ số tổng quan hệ thống"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
    >
      {cards.map(({ href, title, value, sub, icon: Icon, iconCls, valueCls }) => (
        <Link
          key={title}
          href={href}
          className="group flex flex-col justify-between rounded-3xl border border-border bg-surface p-4 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)] transition-all hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-[0_18px_36px_-14px_rgba(53,111,167,0.18)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-muted-foreground">
              {title}
            </span>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${iconCls}`}
            >
              <Icon size={16} />
            </span>
          </div>

          <div className="mt-3">
            {isLoading ? (
              <div className="h-7 w-24 animate-pulse rounded-lg bg-background" />
            ) : (
              <p
                className={`truncate text-lg font-bold transition-colors group-hover:text-primary ${valueCls}`}
              >
                {value}
              </p>
            )}
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {sub}
            </p>
          </div>
        </Link>
      ))}
    </section>
  );
}
