"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trash2, Users } from "pulsoicon-react";
import type { User } from "@/types/admin/user";

export const formatUserDateTime = (val?: string | null) => {
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

export function getRoleBadge(role: string) {
  const r = role.toUpperCase();
  if (r === "ADMIN") {
    return {
      label: "Quản trị viên",
      cls: "border-accent-border bg-accent text-accent-foreground",
    };
  }
  if (r === "LECTURER") {
    return {
      label: "Giảng viên",
      cls: "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
    };
  }
  return {
    label: "Học viên",
    cls: "border-primary-pastel bg-primary-light text-primary",
  };
}

export function UsersAdminNav({ totalActive }: { totalActive?: number }) {
  const pathname = usePathname();
  const isDeleted = pathname.startsWith("/admin/users/deleted");
  const isActive = !isDeleted;

  return (
    <nav
      aria-label="Điều hướng Quản lý Người dùng"
      className="grid grid-cols-1 gap-2.5 rounded-3xl border border-border bg-surface/90 p-2 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)] sm:grid-cols-2"
    >
      <Link
        href="/admin/users"
        aria-current={isActive ? "page" : undefined}
        className={`group flex items-start gap-3 rounded-2xl px-4 py-3 text-sm transition-all ${
          isActive
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-foreground hover:bg-primary-light/70 hover:text-primary"
        }`}
      >
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isActive
              ? "bg-white/20 text-primary-foreground"
              : "bg-primary-light text-primary group-hover:bg-surface"
          }`}
        >
          <Users size={18} />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-semibold">
            <span>Danh sách Thành viên</span>
            {typeof totalActive === "number" && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  isActive
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-primary-light text-primary"
                }`}
              >
                {totalActive}
              </span>
            )}
          </span>
          <span
            className={`mt-0.5 block text-xs ${
              isActive ? "text-primary-foreground/85" : "text-muted-foreground"
            }`}
          >
            Quản lý học viên, giảng viên, xác thực email và trạng thái khóa
          </span>
        </span>
      </Link>

      <Link
        href="/admin/users/deleted"
        aria-current={isDeleted ? "page" : undefined}
        className={`group flex items-start gap-3 rounded-2xl px-4 py-3 text-sm transition-all ${
          isDeleted
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-foreground hover:bg-primary-light/70 hover:text-primary"
        }`}
      >
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isDeleted
              ? "bg-white/20 text-primary-foreground"
              : "bg-secondary-light text-secondary-foreground group-hover:bg-surface"
          }`}
        >
          <Trash2 size={18} />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">Tài khoản Đã xóa</span>
          <span
            className={`mt-0.5 block text-xs ${
              isDeleted ? "text-primary-foreground/85" : "text-muted-foreground"
            }`}
          >
            Tra cứu lưu trữ tài khoản đã xóa mềm &amp; lý do xóa
          </span>
        </span>
      </Link>
    </nav>
  );
}

export function exportUsersCsv(items: User[]) {
  const header = [
    "User ID",
    "Họ và tên",
    "Email",
    "Xác thực Email",
    "Trạng thái khóa",
    "Số khóa học",
    "Đăng nhập gần nhất",
    "Ngày tạo",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(","),
    ...items.map((u) =>
      [
        u.id,
        u.fullname || "",
        u.email,
        u.is_verified_email ? "Đã xác thực" : "Chưa xác thực",
        u.is_banned ? "Đang bị khóa" : "Hoạt động",
        String(u.total_courses ?? 0),
        formatUserDateTime(u.last_login_at),
        formatUserDateTime(u.created_at),
      ]
        .map(esc)
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `may-may-users-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
