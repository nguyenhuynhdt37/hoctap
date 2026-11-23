"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import useSWR from "swr";
import {
  ArrowDownToLine,
  BarChart3,
  BookOpen,
  CircleHelp,
  Clock,
  FolderOpen,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  Tag,
  User,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { logoutEverywhere } from "@/lib/auth/logout";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import { HoldEarningsResponse } from "@/types/lecturer/hold";
import { NotificationButton } from "./notification";

const COLLAPSE_KEY = "lecturer-nav-collapsed";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  also?: string[];
  holdBadge?: boolean;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Tổng quan",
    items: [
      { href: "/lecturer", label: "Tổng quan", icon: LayoutDashboard, exact: true },
      { href: "/lecturer/dashboard", label: "Thống kê", icon: BarChart3 },
    ],
  },
  {
    label: "Nội dung",
    items: [
      { href: "/lecturer/courses", label: "Khóa học", icon: BookOpen },
      { href: "/lecturer/chapters", label: "Chương và bài học", icon: Layers },
      { href: "/lecturer/resources", label: "Tài nguyên", icon: FolderOpen },
      { href: "/lecturer/quizzes-lesson", label: "Câu hỏi", icon: CircleHelp },
      { href: "/lecturer/combos", label: "Combo lộ trình", icon: Library },
    ],
  },
  {
    label: "Vận hành",
    items: [
      { href: "/lecturer/discounts", label: "Mã giảm giá", icon: Tag },
      {
        href: "/lecturer/refund",
        label: "Hoàn tiền",
        icon: RotateCcw,
        also: ["/lecturer/refunds"],
      },
      { href: "/lecturer/hold", label: "Đang giữ", icon: Clock, holdBadge: true },
    ],
  },
  {
    label: "Tài chính",
    items: [
      { href: "/lecturer/wallets", label: "Ví", icon: Wallet },
      { href: "/lecturer/withdraw", label: "Rút tiền", icon: ArrowDownToLine },
    ],
  },
];

function isItemActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  const prefixes = [item.href, ...(item.also ?? [])];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function LecturerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const clearNotifications = useRealtimeNotiStore((s) => s.clearAll);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);

  const { data: holdData } = useSWR<HoldEarningsResponse>(
    "/lecturer/transactions/earnings/holding?page=1&limit=1",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    { revalidateOnFocus: true, refreshInterval: 30000 }
  );
  const holdCount = holdData?.total || 0;
  const compact = collapsed && !mobileOpen;

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Bỏ qua khi trình duyệt chặn localStorage
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onPointer = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    if (accountOpen) document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [accountOpen]);

  const getUserInitials = () => {
    if (!user?.fullname) return "GV";
    return user.fullname
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logoutEverywhere();
    } catch {
      // Vẫn đăng xuất phía trình duyệt khi mạng lỗi
    } finally {
      clearUser();
      clearNotifications();
      router.push("/login");
    }
  };

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Bỏ qua khi trình duyệt chặn localStorage
      }
      return next;
    });
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    router.push(
      trimmed
        ? `/lecturer/courses?search=${encodeURIComponent(trimmed)}`
        : "/lecturer/courses"
    );
    setMobileOpen(false);
  };

  const searchForm = (
    <form onSubmit={handleSearchSubmit} className="min-w-0">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm khóa học..."
          aria-label="Tìm khóa học"
          className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-subtle-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/15"
        />
      </div>
    </form>
  );

  return (
    <div className="flex h-dvh max-w-full overflow-hidden bg-background text-foreground">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
          aria-label="Đóng menu điều hướng"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          compact ? "lg:w-[4.5rem]" : "lg:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <Link
            href="/lecturer"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tổng quan giảng viên"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-pastel/70 bg-primary-light">
              <img
                src="/logo/studynest-logo.svg"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
              />
            </span>
            <span className={compact ? "sr-only" : "min-w-0"}>
              <span className="block truncate text-sm font-bold leading-none text-foreground">
                Mây Mây
              </span>
              <span className="mt-1 block text-[11px] font-medium text-subtle-foreground">
                Giảng viên
              </span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-3 py-3 lg:hidden">{searchForm}</div>

        <nav
          aria-label="Điều hướng giảng viên"
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-2 py-3"
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              <p
                className={`px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground ${
                  compact ? "sr-only" : ""
                }`}
              >
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(pathname, item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        title={item.label}
                        className={`relative flex h-10 items-center gap-2.5 rounded-xl px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          compact ? "justify-center" : ""
                        } ${
                          active
                            ? "bg-primary-light font-semibold text-primary"
                            : "text-muted-foreground hover:bg-background hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={compact ? "sr-only" : "min-w-0 flex-1 truncate"}>
                          {item.label}
                        </span>
                        {item.holdBadge && holdCount > 0 && !compact && (
                          <Badge variant="warning" size="sm">
                            {holdCount > 99 ? "99+" : holdCount}
                          </Badge>
                        )}
                        {item.holdBadge && holdCount > 0 && compact && (
                          <span
                            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-warning-foreground"
                            aria-hidden="true"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-2 pb-4">
          <Link
            href="/"
            title="Về giao diện học viên"
            className={`flex h-10 items-center gap-2.5 rounded-xl px-2.5 text-sm text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              compact ? "justify-center" : ""
            }`}
          >
            <GraduationCap className="h-4 w-4 shrink-0" />
            <span className={compact ? "sr-only" : "truncate"}>Về trang học viên</span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur-md sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Mở menu điều hướng"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="ml-auto hidden w-full max-w-xs md:block">{searchForm}</div>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <NotificationButton role="LECTURER" />
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-xl px-1.5 hover:bg-primary-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Menu tài khoản giảng viên"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((open) => !open)}
              >
                {user?.avatar ? (
                  <img
                    src={getImageUrl(user.avatar)}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-primary-pastel"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-2 ring-primary-pastel">
                    {getUserInitials()}
                  </span>
                )}
                <span className="hidden max-w-32 truncate text-sm font-medium text-foreground xl:block">
                  {user?.fullname || "Giảng viên"}
                </span>
              </button>
              {accountOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-ambient-lg"
                >
                  <div className="border-b border-border bg-primary-light/40 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user?.fullname || "Giảng viên"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {user?.email || "Chưa có email"}
                    </p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href="/lecturer/profile"
                      role="menuitem"
                      className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm text-foreground hover:bg-primary-light/50"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      Hồ sơ giảng viên
                    </Link>
                    <Link
                      href="/"
                      role="menuitem"
                      className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm text-foreground hover:bg-primary-light/50"
                    >
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      Về giao diện học viên
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-destructive-foreground hover:bg-destructive-bg"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
