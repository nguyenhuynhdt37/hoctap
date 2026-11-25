"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FolderTree, Layers } from "pulsoicon-react";

interface CatalogAdminNavProps {
  unclassifiedCount?: number;
}

export default function CatalogAdminNav({
  unclassifiedCount,
}: CatalogAdminNavProps) {
  const pathname = usePathname();
  const links = [
    {
      href: "/admin/catalog",
      title: "Kiến trúc Học thuật",
      description: "Bản đồ cấp học, ma trận lớp × môn, kỳ thi & định hướng",
      icon: Layers,
      badge: undefined as number | undefined,
    },
    {
      href: "/admin/catalog/courses",
      title: "Gán phân loại Khóa học",
      description: "Cập nhật môn học, khối lớp và mục tiêu cho từng khóa học",
      icon: BookOpen,
      badge:
        typeof unclassifiedCount === "number" && unclassifiedCount > 0
          ? unclassifiedCount
          : undefined,
    },
    {
      href: "/admin/categories",
      title: "Cây điều hướng Legacy",
      description: "Quản lý cấu trúc danh mục điều hướng truyền thống",
      icon: FolderTree,
      badge: undefined as number | undefined,
    },
  ];

  return (
    <nav
      aria-label="Quản lý học tập"
      className="grid grid-cols-1 gap-2.5 rounded-3xl border border-border bg-surface/90 p-2 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.12)] sm:grid-cols-3"
    >
      {links.map(({ href, title, description, icon: Icon, badge }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group flex items-start gap-3 rounded-2xl px-4 py-3 text-sm transition-all focus-visible:outline-2 focus-visible:outline-ring ${
              active
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground hover:bg-primary-light/70 hover:text-primary"
            }`}
          >
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                active
                  ? "bg-white/20 text-primary-foreground"
                  : "bg-primary-light text-primary group-hover:bg-surface"
              }`}
            >
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-semibold">
                <span className="truncate">{title}</span>
                {badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      active
                        ? "bg-white/25 text-primary-foreground"
                        : "bg-warning-bg text-warning-foreground"
                    }`}
                  >
                    {badge} cần gán
                  </span>
                )}
              </span>
              <span
                className={`mt-0.5 block text-xs leading-relaxed ${
                  active
                    ? "text-primary-foreground/85"
                    : "text-muted-foreground"
                }`}
              >
                {description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
