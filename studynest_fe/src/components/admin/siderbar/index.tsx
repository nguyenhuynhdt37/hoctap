"use client";

import { logoutEverywhere } from "@/lib/auth/logout";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import useSWR from "swr";
import {
  ArrowLeftRight,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Command,
  Compass,
  ExternalLink,
  Folder,
  GraduationCap,
  LogOut,
  Menu,
  RotateCcw,
  Settings,
  ShieldCheck,
  Tag,
  Users,
  Wallet,
  X,
} from "pulsoicon-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  title: string;
  subtitle?: string;
  href: string;
  icon: ComponentType<{ className?: string; size?: number; animated?: boolean }>;
  exact?: boolean;
  badgeKey?: "refunds" | "withdraws";
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "Tổng quan & Học thuật",
    items: [
      {
        title: "Đài Quan Sát",
        subtitle: "Tổng quan hệ thống",
        href: "/admin",
        icon: Compass,
        exact: true,
      },
      {
        title: "Khối lớp & Môn học",
        subtitle: "Curriculum Studio",
        href: "/admin/catalog",
        icon: Folder,
      },
    ],
  },
  {
    label: "Con người & Phân quyền",
    items: [
      {
        title: "Thành viên",
        href: "/admin/users",
        icon: Users,
      },
      {
        title: "Giảng viên",
        href: "/admin/lecturers",
        icon: GraduationCap,
      },
      {
        title: "Vai trò & Quyền hạn",
        href: "/admin/roles",
        icon: ShieldCheck,
      },
    ],
  },
  {
    label: "Tài chính & Ưu đãi",
    items: [
      {
        title: "Ví Nền tảng",
        href: "/admin/wallets",
        icon: Wallet,
      },
      {
        title: "Giao dịch hệ thống",
        href: "/admin/transactions",
        icon: ArrowLeftRight,
      },
      {
        title: "Mã giảm giá",
        href: "/admin/discounts",
        icon: Tag,
      },
      {
        title: "Hoàn tiền",
        href: "/admin/refunds",
        icon: RotateCcw,
        badgeKey: "refunds",
      },
      {
        title: "Rút tiền",
        href: "/admin/withdraws",
        icon: Banknote,
        badgeKey: "withdraws",
      },
    ],
  },
  {
    label: "Cấu hình",
    items: [
      {
        title: "Cài đặt hệ thống",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const clearNotifications = useRealtimeNotiStore((s) => s.clearAll);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Live pending badges cho Hoàn tiền & Rút tiền (nhẹ, không làm ồn nếu lỗi)
  const { data: refundStats } = useSWR<{ requested?: number; pending?: number }>(
    "/admin/refunds/stats",
    (url: string) => api.get(url).then((r) => r.data).catch(() => null),
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  const { data: withdrawStats } = useSWR<{ pending?: number }>(
    "/admin/withdraw/stats",
    (url: string) => api.get(url).then((r) => r.data).catch(() => null),
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  const badgeCounts: Record<"refunds" | "withdraws", number> = {
    refunds: Number(refundStats?.requested ?? refundStats?.pending ?? 0),
    withdraws: Number(withdrawStats?.pending ?? 0),
  };

  const getUserInitials = () => {
    if (user?.fullname) {
      return user.fullname
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    return "A";
  };

  const handleLogout = async () => {
    try {
      await logoutEverywhere();
      clearUser();
      clearNotifications();
      router.push("/login");
    } catch {
      // Suppress error
    }
  };

  const openCommandPalette = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("maymay:open-command-palette"));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        isMobileMenuOpen &&
        !target.closest(".sidebar-container") &&
        !target.closest(".mobile-menu-button")
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Menu Trigger */}
      <button
        aria-label={isMobileMenuOpen ? "Đóng menu quản trị" : "Mở menu quản trị"}
        type="button"
        onClick={() => setIsMobileMenuOpen((v) => !v)}
        className="mobile-menu-button fixed left-3.5 top-3.5 z-50 flex h-10 w-10 items-center justify-center rounded-2xl border border-primary-pastel/80 bg-surface/95 text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-primary-light hover:text-primary lg:hidden"
      >
        {isMobileMenuOpen ? (
          <X size={19} animated={false} />
        ) : (
          <Menu size={19} animated={false} />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Floating Cloud Rail Sidebar */}
      <aside
        aria-label="Điều hướng quản trị"
        className={`
          sidebar-container fixed left-0 top-0 z-50 flex h-full flex-col
          border-r border-primary-pastel/60 bg-surface/95 backdrop-blur-xl
          shadow-[12px_0_40px_-24px_rgba(53,111,167,0.22)] transition-all duration-300
          ${isCollapsed ? "w-20" : "w-72"}
          ${
            isMobileMenuOpen
              ? "visible translate-x-0"
              : "invisible -translate-x-full lg:visible lg:translate-x-0"
          }
        `}
      >
        {/* Ambient Cloud Mist at Top */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-primary-light/70 via-accent-vanilla/20 to-transparent"
        />

        {/* Brand Header */}
        <div className="relative z-10 flex h-[72px] items-center justify-between border-b border-primary-pastel/50 px-4">
          <Link
            href="/admin"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`group flex min-w-0 items-center gap-3 ${
              isCollapsed ? "mx-auto" : ""
            }`}
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-hover text-primary-foreground shadow-[0_10px_24px_-8px_rgba(53,111,167,0.55)] transition-transform group-hover:scale-105">
              <Cloud size={20} animated={false} />
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent-vanilla-foreground"
              />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-lg font-bold leading-none tracking-tight text-foreground">
                    Mây Mây
                  </span>
                  <span className="rounded-full border border-primary-pastel bg-primary-light px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    Cloud
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                  Không gian điều hành Admin
                </p>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Button — Floating Pill */}
          <button
            aria-label={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            type="button"
            onClick={onToggle}
            className="hidden h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-primary-pastel/80 bg-surface text-muted-foreground shadow-sm transition-all hover:border-primary hover:bg-primary-light hover:text-primary lg:absolute lg:-right-3.5 lg:top-1/2 lg:flex lg:-translate-y-1/2"
          >
            {isCollapsed ? (
              <ChevronRight size={14} animated={false} />
            ) : (
              <ChevronLeft size={14} animated={false} />
            )}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="relative z-10 flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {MENU_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed ? (
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-subtle-foreground">
                  {group.label}
                </p>
              ) : (
                <div
                  aria-hidden="true"
                  className="mx-auto my-2 h-px w-8 bg-border/80"
                />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                const liveBadge = item.badgeKey
                  ? badgeCounts[item.badgeKey]
                  : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    title={isCollapsed ? item.title : undefined}
                    className={`
                      group relative flex items-center rounded-2xl transition-all duration-200
                      ${isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"}
                      ${
                        isActive
                          ? "border border-primary-pastel/90 bg-gradient-to-r from-primary-light/95 via-primary-light/75 to-accent-vanilla/35 text-primary shadow-[0_8px_20px_-12px_rgba(53,111,167,0.45)]"
                          : "border border-transparent text-muted-foreground hover:border-border/70 hover:bg-background/85 hover:text-foreground"
                      }
                    `}
                  >
                    {/* Active Left Indicator Bar */}
                    {isActive && !isCollapsed && (
                      <span
                        aria-hidden="true"
                        className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary"
                      />
                    )}

                    <span
                      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-surface text-primary shadow-2xs"
                          : "bg-background/80 text-muted-foreground group-hover:bg-surface group-hover:text-primary"
                      }`}
                    >
                      <Icon size={17} animated={false} />
                      {isCollapsed && liveBadge > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                          {liveBadge > 9 ? "9+" : liveBadge}
                        </span>
                      )}
                    </span>

                    {!isCollapsed && (
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span
                            className={`block truncate text-[13px] leading-tight ${
                              isActive ? "font-bold text-primary" : "font-medium"
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                              {item.subtitle}
                            </span>
                          )}
                        </div>

                        {liveBadge > 0 && (
                          <span className="shrink-0 rounded-full border border-warning-border bg-warning-bg px-2 py-0.5 text-[10px] font-bold tabular-nums text-warning-foreground">
                            {liveBadge > 99 ? "99+" : liveBadge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Cloud Command Shortcut & Public Site Link */}
        {!isCollapsed && (
          <div className="relative z-10 mx-3 mb-2 space-y-2 rounded-2xl border border-primary-pastel/70 bg-gradient-to-br from-primary-light/70 via-surface to-accent-vanilla/40 p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                <span className="h-2 w-2 rounded-full bg-success-foreground" />
                Cloud Studio Trực tuyến
              </span>
              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-primary"
                title="Mở trang học viên"
              >
                Trang chủ
                <ExternalLink size={10} animated={false} />
              </Link>
            </div>
            <button
              type="button"
              onClick={openCommandPalette}
              className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-surface/90 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary-pastel hover:text-primary"
            >
              <span className="inline-flex items-center gap-1.5">
                <Command size={12} animated={false} />
                Đi nhanh tới trang...
              </span>
              <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Admin Identity Dock */}
        <div className="relative z-10 border-t border-primary-pastel/50 p-3">
          <div
            className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border border-transparent p-2 transition-colors hover:border-border/80 hover:bg-background/80 ${
              isCollapsed ? "justify-center" : ""
            }`}
            onClick={() => {
              if (!isCollapsed) {
                router.push("/admin/settings");
              }
            }}
          >
            {user?.avatar ? (
              <div className="relative shrink-0">
                <img
                  src={getImageUrl(user.avatar)}
                  alt={user.fullname || "Quản trị viên"}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-primary-pastel"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success-foreground" />
              </div>
            ) : (
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary-pastel bg-primary-light text-xs font-bold text-primary">
                {getUserInitials()}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success-foreground" />
              </div>
            )}

            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">
                    {user?.fullname || "Quản trị viên"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {user?.email || "admin@maymay.edu.vn"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleLogout();
                  }}
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive-bg hover:text-destructive-foreground"
                >
                  <LogOut size={15} animated={false} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
