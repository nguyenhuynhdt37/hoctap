"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import useSWR from "swr";
import {
  ArrowDownToLine,
  BarChart3,
  BookOpen,
  ChevronRight,
  Clock,
  Coins,
  Command,
  Eye,
  EyeOff,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Tag,
  User,
  Wallet,
  X,
  type PulsoIcon,
} from "pulsoicon-react";
import { Badge, Button } from "@/components/ui";
import { logoutEverywhere } from "@/lib/auth/logout";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import { HoldEarningsResponse } from "@/types/lecturer/hold";
import { LecturerRefundRequestsResponse } from "@/types/lecturer/refund";
import { LecturerOverview } from "@/types/lecturer/statistics";
import { LecturerWallet } from "@/types/lecturer/wallet";
import { AiPipelineQueueDrawer } from "@/components/shared/ai-pipeline-queue-drawer";
import { SkyCommandPalette } from "./command-palette";
import { NotificationButton } from "./notification";

const COLLAPSE_KEY = "lecturer-nav-collapsed";
const PINNED_KEY = "lecturer-nav-pinned";
const HIDE_BALANCE_KEY = "lecturer-hide-balance";

type BadgeKey =
  | "courses"
  | "combos"
  | "discounts"
  | "refund"
  | "hold"
  | "withdraw";

type NavItem = {
  href: string;
  label: string;
  icon: PulsoIcon;
  exact?: boolean;
  also?: string[];
  badgeKey?: BadgeKey;
};

const navGroups: { label: string; dotClass: string; items: NavItem[] }[] = [
  {
    label: "Tổng quan",
    dotClass: "bg-primary",
    items: [
      {
        href: "/lecturer",
        label: "Tổng quan",
        icon: LayoutDashboard,
        exact: true,
      },
      { href: "/lecturer/dashboard", label: "Thống kê", icon: BarChart3 },
    ],
  },
  {
    label: "Nội dung",
    dotClass: "bg-secondary-foreground",
    items: [
      {
        href: "/lecturer/courses",
        label: "Khóa học",
        icon: BookOpen,
        badgeKey: "courses",
        also: [
          "/lecturer/chapters",
          "/lecturer/resources",
          "/lecturer/quizzes-lesson",
        ],
      },
      {
        href: "/lecturer/combos",
        label: "Combo lộ trình",
        icon: Library,
        badgeKey: "combos",
      },
    ],
  },
  {
    label: "Vận hành",
    dotClass: "bg-accent-vanilla-foreground",
    items: [
      {
        href: "/lecturer/discounts",
        label: "Mã giảm giá",
        icon: Tag,
        badgeKey: "discounts",
      },
      {
        href: "/lecturer/refund",
        label: "Hoàn tiền",
        icon: RotateCcw,
        also: ["/lecturer/refunds"],
        badgeKey: "refund",
      },
      {
        href: "/lecturer/hold",
        label: "Đang giữ",
        icon: Clock,
        badgeKey: "hold",
      },
    ],
  },
  {
    label: "Tài chính",
    dotClass: "bg-success-foreground",
    items: [
      { href: "/lecturer/wallets", label: "Ví giảng viên", icon: Wallet },
      {
        href: "/lecturer/withdraw",
        label: "Rút tiền",
        icon: ArrowDownToLine,
        badgeKey: "withdraw",
      },
    ],
  },
];

const ALL_NAV_ITEMS: NavItem[] = navGroups.flatMap((g) => g.items);

const QUICK_CREATE_ITEMS = [
  {
    href: "/lecturer/courses/create",
    label: "Khóa học mới",
    desc: "Soạn giáo trình & xuất bản",
    icon: BookOpen,
    accent: "bg-primary-light text-primary border-primary-pastel",
  },
  {
    href: "/lecturer/combos/create",
    label: "Combo lộ trình",
    desc: "Đóng gói khóa học giá ưu đãi",
    icon: Library,
    accent:
      "bg-secondary-light text-secondary-foreground border-secondary-pastel",
  },
  {
    href: "/lecturer/discounts",
    label: "Mã giảm giá",
    desc: "Khuyến mãi khóa học & combo",
    icon: Tag,
    accent:
      "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
  },
  {
    href: "/lecturer/withdraw/create",
    label: "Tạo lệnh rút tiền",
    desc: "Rút Coin về tài khoản ngân hàng",
    icon: ArrowDownToLine,
    accent: "bg-success-bg text-success-foreground border-success-border",
  },
];

function isItemActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  const prefixes = [item.href, ...(item.also ?? [])];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function LecturerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const clearNotifications = useRealtimeNotiStore((s) => s.clearAll);
  const latestLiveNoti = useRealtimeNotiStore((s) => s.latestLiveNotification);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>([]);

  const accountRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);

  const safeGet = async <T,>(url: string): Promise<T | null> => {
    try {
      const response = await api.get(url);
      return response.data as T;
    } catch {
      return null;
    }
  };

  // Bộ đếm Realtime trên toàn bộ Sidebar (WebSocket realtime + poll nhẹ 2 phút)
  const sidebarSwrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    refreshInterval: 120_000,
  };

  const { data: holdData, mutate: mutateHold } = useSWR<HoldEarningsResponse | null>(
    "/lecturer/transactions/earnings/holding?page=1&limit=1",
    (url: string) => safeGet<HoldEarningsResponse>(url),
    sidebarSwrConfig,
  );

  const { data: pendingRefunds, mutate: mutateRefund } =
    useSWR<LecturerRefundRequestsResponse | null>(
      "/lecturer/refunds/requests?page=1&limit=1&refund_status=requested",
      (url: string) => safeGet<LecturerRefundRequestsResponse>(url),
      sidebarSwrConfig,
    );

  const { data: pendingWithdraws, mutate: mutateWithdraw } = useSWR<{
    total?: number;
  } | null>(
    "/lecturer/withdraw?page=1&limit=1&status=pending",
    (url: string) => safeGet<{ total?: number }>(url),
    sidebarSwrConfig,
  );

  const { data: overviewData, mutate: mutateOverview } =
    useSWR<LecturerOverview | null>(
      "/lecturer/statistics/overview",
      (url: string) => safeGet<LecturerOverview>(url),
      sidebarSwrConfig,
    );

  const { data: bundlesData, mutate: mutateBundles } = useSWR<{
    total?: number;
  } | null>(
    "/lecturer/bundles?limit=1",
    (url: string) => safeGet<{ total?: number }>(url),
    sidebarSwrConfig,
  );

  const { data: activeDiscounts, mutate: mutateDiscounts } = useSWR<{
    total?: number;
  } | null>(
    "/lecturer/discounts?page=1&limit=1&is_active=true",
    (url: string) => safeGet<{ total?: number }>(url),
    sidebarSwrConfig,
  );

  const { data: wallet, mutate: mutateWallet } = useSWR<LecturerWallet | null>(
    "/lecturer/wallets/lecturer/wallet",
    (url: string) => safeGet<LecturerWallet>(url),
    sidebarSwrConfig,
  );

  const { data: withdrawCheck, mutate: mutateWithdrawCheck } = useSWR<{
    balance?: number;
    paid_balance?: number;
  } | null>(
    "/lecturer/withdraw/check-can-request",
    (url: string) =>
      safeGet<{ balance?: number; paid_balance?: number }>(url),
    sidebarSwrConfig,
  );

  // Tự động làm mới tức thì mọi con số khi có thông báo Realtime từ WebSocket
  useEffect(() => {
    if (!latestLiveNoti) return;
    void Promise.all([
      mutateHold(),
      mutateRefund(),
      mutateWithdraw(),
      mutateWallet(),
      mutateWithdrawCheck(),
      mutateOverview(),
      mutateBundles(),
      mutateDiscounts(),
    ]);
  }, [
    latestLiveNoti,
    mutateHold,
    mutateRefund,
    mutateWithdraw,
    mutateWallet,
    mutateWithdrawCheck,
    mutateOverview,
    mutateBundles,
    mutateDiscounts,
  ]);

  // Đồng nhất số dư Coin: ưu tiên sổ Coin thật (paid_balance), fallback ví VND cũ
  const displayCoinLabel =
    withdrawCheck?.paid_balance !== undefined
      ? `${withdrawCheck.paid_balance.toLocaleString("vi-VN")} Coin`
      : wallet
        ? formatVndAsCoin(wallet.balance)
        : "—";
  const withdrawableCoin = withdrawCheck?.balance ?? 0;

  const holdCount = holdData?.total ?? 0;
  const pendingRefundCount = pendingRefunds?.total ?? 0;
  const pendingWithdrawCount = pendingWithdraws?.total ?? 0;
  const coursesCount = overviewData?.total_courses ?? 0;
  const combosCount = bundlesData?.total ?? 0;
  const activeDiscountsCount = activeDiscounts?.total ?? 0;

  const badgeCounts: Record<BadgeKey, number> = {
    courses: coursesCount,
    combos: combosCount,
    discounts: activeDiscountsCount,
    refund: pendingRefundCount,
    hold: holdCount,
    withdraw: pendingWithdrawCount,
  };

  const totalTasks = holdCount + pendingRefundCount + pendingWithdrawCount;
  const compact = collapsed && !mobileOpen;

  const activeContext = useMemo(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (isItemActive(pathname, item)) {
          return { groupLabel: group.label, item };
        }
      }
    }
    return { groupLabel: "Giảng viên", item: navGroups[0].items[0] };
  }, [pathname]);

  const pinnedItems = useMemo(
    () =>
      pinnedHrefs
        .map((href) => ALL_NAV_ITEMS.find((i) => i.href === href))
        .filter((item): item is NavItem => Boolean(item)),
    [pinnedHrefs],
  );

  // Khôi phục trạng thái cá nhân hóa từ localStorage
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
      setHideBalance(window.localStorage.getItem(HIDE_BALANCE_KEY) === "1");
      const savedPins = window.localStorage.getItem(PINNED_KEY);
      if (savedPins) {
        const parsed = JSON.parse(savedPins);
        if (Array.isArray(parsed)) {
          setPinnedHrefs(parsed.filter((x) => typeof x === "string"));
        }
      }
    } catch {
      // Bỏ qua khi trình duyệt chặn localStorage
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
    setQuickCreateOpen(false);
  }, [pathname]);

  // Phím tắt toàn cục: Cmd/Ctrl + K mở Sky Command Palette
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
        setAccountOpen(false);
        setQuickCreateOpen(false);
        return;
      }
      if (event.key === "Escape") {
        setMobileOpen(false);
        setAccountOpen(false);
        setQuickCreateOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountOpen && !accountRef.current?.contains(target)) {
        setAccountOpen(false);
      }
      if (quickCreateOpen && !quickCreateRef.current?.contains(target)) {
        setQuickCreateOpen(false);
      }
    };
    if (accountOpen || quickCreateOpen) {
      document.addEventListener("mousedown", onPointer);
    }
    return () => document.removeEventListener("mousedown", onPointer);
  }, [accountOpen, quickCreateOpen]);

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
        // Bỏ qua
      }
      return next;
    });
  };

  const toggleHideBalance = () => {
    setHideBalance((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(HIDE_BALANCE_KEY, next ? "1" : "0");
      } catch {
        // Bỏ qua
      }
      return next;
    });
  };

  const togglePin = (href: string) => {
    setPinnedHrefs((prev) => {
      const exists = prev.includes(href);
      const next = exists ? prev.filter((x) => x !== href) : [...prev, href].slice(0, 4);
      try {
        window.localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      } catch {
        // Bỏ qua
      }
      return next;
    });
  };

  const ActiveIcon = activeContext.item.icon;

  const renderNavItem = (item: NavItem, inPinnedSection = false) => {
    const Icon = item.icon;
    const active = isItemActive(pathname, item);
    const isPinned = pinnedHrefs.includes(item.href);
    const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
    const isUrgent = item.badgeKey === "refund";
    const isAlert =
      item.badgeKey === "hold" || item.badgeKey === "withdraw";
    const badgeVariant = isUrgent
      ? "destructive"
      : isAlert
        ? "warning"
        : item.badgeKey === "discounts"
          ? "secondary"
          : "info";

    return (
      <li key={`${inPinnedSection ? "pin-" : ""}${item.href}`}>
        <div className="group/row relative flex items-center">
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            className={`group relative flex h-11 flex-1 items-center gap-3 rounded-2xl px-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              compact ? "justify-center px-0" : "pr-8"
            } ${
              active
                ? "border border-primary-pastel bg-surface font-semibold text-primary shadow-xs"
                : "border border-transparent text-muted-foreground hover:border-surface hover:bg-surface/75 hover:text-foreground"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-surface/80 text-muted-foreground group-hover:bg-primary-light group-hover:text-primary"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
            </span>

            <span className={compact ? "sr-only" : "min-w-0 flex-1 truncate"}>
              {item.label}
            </span>

            {badgeCount > 0 && !compact && (
              <Badge
                variant={badgeVariant}
                size="sm"
                className="tabular-nums"
                dot={isUrgent}
              >
                {badgeCount > 99 ? "99+" : badgeCount}
              </Badge>
            )}
            {badgeCount > 0 && compact && (isUrgent || isAlert) && (
              <span
                className={`absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-surface ${
                  isUrgent
                    ? "bg-destructive-foreground animate-pulse"
                    : "bg-warning-foreground"
                }`}
                aria-hidden="true"
              />
            )}
          </Link>

          {/* Nút ghim/bỏ ghim nhanh (chỉ hiện khi mở rộng sidebar) */}
          {!compact && (
            <button
              type="button"
              onClick={() => togglePin(item.href)}
              aria-label={isPinned ? `Bỏ ghim ${item.label}` : `Ghim ${item.label}`}
              title={isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
              className={`absolute right-1.5 flex h-6 w-6 items-center justify-center rounded-full transition-all cursor-pointer ${
                isPinned
                  ? "text-primary opacity-100 hover:bg-primary-light"
                  : "text-muted-foreground opacity-0 hover:bg-primary-light hover:text-primary group-hover/row:opacity-100"
              }`}
            >
              <Pin
                animated={false}
                className={`h-3 w-3 ${isPinned ? "fill-current" : ""}`}
              />
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="flex h-dvh max-w-full overflow-hidden bg-gradient-to-br from-background via-primary-light/20 to-secondary-light/15 text-foreground">
      {/* Backdrop di động */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-xs lg:hidden"
          aria-label="Đóng menu điều hướng"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Cloudy Sky Sidebar (ẩn mượt khi bật Zen Mode trên desktop) */}
      <aside
        className={`relative fixed inset-y-0 left-0 z-50 flex w-68 flex-col overflow-hidden border-r border-primary-pastel/75 bg-gradient-to-b from-primary-light/80 via-surface/95 to-secondary-light/45 shadow-sm transition-all duration-200 lg:static lg:z-auto ${
          zenMode
            ? "lg:hidden"
            : compact
              ? "lg:w-[5rem] lg:translate-x-0"
              : "lg:w-68 lg:translate-x-0"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-primary-pastel/50 blur-2xl"
        />

        {/* Brand Header */}
        <div className="relative flex h-16 shrink-0 items-center gap-2 border-b border-primary-pastel/60 px-3.5">
          <Link
            href="/lecturer"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tổng quan giảng viên"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-surface shadow-2xs">
              <img
                src="/logo/studynest-logo.svg"
                alt=""
                width={22}
                height={22}
                className="h-5 w-5 object-contain"
              />
            </span>
            <span className={compact ? "sr-only" : "min-w-0"}>
              <span className="block truncate font-display text-base font-bold leading-none text-foreground">
                Mây Mây
              </span>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary-pastel/60 bg-surface/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Giảng viên
              </span>
            </span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 rounded-full hover:bg-surface/80 lg:inline-flex"
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-primary" />
            ) : (
              <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-surface/80 lg:hidden"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nút mở Command Palette trên di động / tạo nhanh trên desktop */}
        <div className="relative space-y-2 px-3 pt-3.5">
          <Link
            href="/lecturer/courses/create"
            title="Tạo khóa học mới"
            className={`flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-xs transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-sm ${
              compact
                ? "mx-auto h-10 w-10 p-0"
                : "h-10 w-full px-4 text-xs font-semibold"
            }`}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className={compact ? "sr-only" : "truncate"}>
              Tạo khóa học mới
            </span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setCommandOpen(true);
            }}
            className="flex h-9 w-full items-center justify-between rounded-full border border-primary-pastel/80 bg-surface/80 px-3.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary lg:hidden cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Tìm nhanh lệnh / khóa học...
            </span>
            <kbd className="rounded bg-primary-light px-1.5 py-0.5 font-mono text-[10px] text-primary">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Điều hướng chính + Nhóm Đã ghim */}
        <nav
          aria-label="Điều hướng giảng viên"
          className="relative min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4"
        >
          {/* Nhóm Đã ghim (Pinned Shortcuts) */}
          {pinnedItems.length > 0 && !compact && (
            <div>
              <div className="mb-2 flex items-center gap-2 px-2.5">
                <Pin
                  animated={false}
                  className="h-3 w-3 fill-current text-primary"
                  aria-hidden="true"
                />
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Đã ghim
                </p>
              </div>
              <ul className="space-y-1">
                {pinnedItems.map((item) => renderNavItem(item, true))}
              </ul>
            </div>
          )}

          {navGroups.map((group) => (
            <div key={group.label}>
              <div
                className={`mb-2 flex items-center gap-2 px-2.5 ${
                  compact ? "sr-only" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${group.dotClass}`}
                />
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => renderNavItem(item))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Mini Studio Pulse + Chế độ học viên */}
        <div className="relative shrink-0 space-y-2.5 border-t border-primary-pastel/60 p-3">
          {!compact && (
            <Link
              href={pendingRefundCount > 0 ? "/lecturer/refund" : "/lecturer/wallets"}
              className="block rounded-2xl border border-primary-pastel/75 bg-surface/85 p-3 shadow-2xs transition-all hover:border-primary hover:bg-surface"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Trạng thái trực tuyến
                </span>
                <span className="font-semibold text-muted-foreground tabular-nums">
                  {totalTasks > 0 ? `${totalTasks} việc` : "Ổn định"}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">Số dư Coin</span>
                <span className="inline-flex items-center gap-1 font-display text-sm font-bold text-warning-foreground tabular-nums">
                  <Coins animated={false} className="h-3.5 w-3.5 text-[#C98A2C]" aria-hidden="true" />
                  {hideBalance ? "•••••" : displayCoinLabel}
                </span>
              </div>
            </Link>
          )}

          <Link
            href="/"
            title="Về giao diện học viên"
            className={`group flex items-center gap-2.5 rounded-2xl border border-accent-vanilla-border/75 bg-gradient-to-r from-accent-vanilla/80 to-surface p-2.5 text-xs font-semibold text-foreground shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-xs ${
              compact ? "justify-center p-2" : ""
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent-vanilla-border bg-surface text-primary">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className={compact ? "sr-only" : "min-w-0 flex-1"}>
              <span className="block truncate text-foreground transition-colors group-hover:text-primary">
                Chế độ học viên
              </span>
              <span className="block truncate text-[10px] font-normal text-muted-foreground">
                Quay về trang chủ Mây Mây
              </span>
            </span>
          </Link>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cloud Glass Topbar */}
        <header className="z-30 flex h-16 shrink-0 items-center gap-2.5 border-b border-primary-pastel/65 bg-surface/80 px-4 backdrop-blur-xl sm:px-6">
          {/* Nút mở menu di động */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-primary-pastel/70 bg-primary-light/40 lg:hidden"
            aria-label="Mở menu điều hướng"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4 text-primary" />
          </Button>

          {/* Context Breadcrumb Pill */}
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary-pastel/80 bg-primary-light/70 text-primary">
              <ActiveIcon
                animated={false}
                className="h-4 w-4"
                aria-hidden="true"
              />
            </span>
            <div className="flex min-w-0 items-center gap-1.5 text-xs">
              <span className="font-medium text-muted-foreground">
                {activeContext.groupLabel}
              </span>
              <ChevronRight
                animated={false}
                className="h-3.5 w-3.5 text-border"
                aria-hidden="true"
              />
              <span className="truncate font-display text-sm font-semibold text-foreground">
                {activeContext.item.label}
              </span>
            </div>
          </div>

          {/* Nút mở Sky Command Palette (⌘K) trung tâm */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="ml-auto hidden h-10 w-64 items-center justify-between gap-2 rounded-full border border-primary-pastel/80 bg-primary-light/35 px-3.5 text-xs text-muted-foreground transition-all hover:border-primary hover:bg-surface hover:text-foreground md:flex lg:w-72 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 truncate">
              <Search
                animated={false}
                className="h-3.5 w-3.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="truncate">Tìm nhanh lệnh, khóa học...</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-primary-pastel/70 bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
              <Command animated={false} className="h-2.5 w-2.5" />K
            </span>
          </button>

          {/* Cụm tiện ích phải */}
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {/* Live Wallet Pill + Ẩn/Hiện số dư 1 chạm */}
            <div className="hidden items-center rounded-full border border-accent-vanilla-border bg-gradient-to-r from-accent-vanilla/90 to-warning-bg/80 p-0.5 shadow-2xs xl:inline-flex">
              <Link
                href="/lecturer/wallets"
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-warning-foreground tabular-nums transition-colors hover:bg-surface/70"
                title={`Số dư ví: ${displayCoinLabel} · Rút được: ${withdrawableCoin.toLocaleString("vi-VN")} Coin`}
              >
                <Coins animated={false} className="h-3.5 w-3.5 text-[#C98A2C]" aria-hidden="true" />
                <span>{hideBalance ? "•••••" : displayCoinLabel}</span>
              </Link>
              <button
                type="button"
                onClick={toggleHideBalance}
                aria-label={hideBalance ? "Hiện số dư ví" : "Ẩn số dư ví"}
                title={hideBalance ? "Hiện số dư" : "Ẩn số dư khi trình chiếu"}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-surface/85 text-muted-foreground transition-colors hover:text-primary cursor-pointer"
              >
                {hideBalance ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Nút Tạo Nhanh Đa Năng (+ Tạo mới) */}
            <div className="relative" ref={quickCreateRef}>
              <button
                type="button"
                onClick={() => {
                  setQuickCreateOpen((v) => !v);
                  setAccountOpen(false);
                }}
                aria-expanded={quickCreateOpen}
                aria-haspopup="menu"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary-hover cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tạo mới</span>
              </button>

              {quickCreateOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2.5 w-72 overflow-hidden rounded-[24px] border border-primary-pastel bg-surface p-2 shadow-ambient-lg"
                >
                  <p className="px-3 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                    Khởi tạo nhanh
                  </p>
                  <div className="space-y-1">
                    {QUICK_CREATE_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-primary-light/50"
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.accent}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {item.label}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Nút Zen Mode (Chế độ tập trung toàn màn hình) */}
            <button
              type="button"
              onClick={() => setZenMode((v) => !v)}
              aria-label={zenMode ? "Thoát chế độ tập trung" : "Chế độ tập trung"}
              title={zenMode ? "Hiện lại thanh bên" : "Ẩn thanh bên (Tập trung)"}
              className={`hidden h-9 w-9 items-center justify-center rounded-full border transition-colors lg:inline-flex cursor-pointer ${
                zenMode
                  ? "border-primary bg-primary-light text-primary"
                  : "border-primary-pastel/70 bg-surface/90 text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {zenMode ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            <AiPipelineQueueDrawer role="LECTURER" />
            <NotificationButton role="LECTURER" />

            {/* Account Pill */}
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                className="flex h-10 items-center gap-2.5 rounded-full border border-primary-pastel/80 bg-surface/90 pl-1.5 pr-3 shadow-2xs transition-all hover:border-primary hover:bg-primary-light/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                aria-label="Menu tài khoản giảng viên"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setAccountOpen((open) => !open);
                  setQuickCreateOpen(false);
                }}
              >
                {user?.avatar ? (
                  <img
                    src={getImageUrl(user.avatar)}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-primary-pastel"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground ring-2 ring-primary-pastel">
                    {getUserInitials()}
                  </span>
                )}
                <div className="hidden text-left xl:block">
                  <span className="block max-w-28 truncate text-xs font-semibold leading-tight text-foreground">
                    {user?.fullname || "Giảng viên"}
                  </span>
                  <span className="block text-[10px] leading-tight text-primary">
                    Giảng viên
                  </span>
                </div>
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2.5 w-72 overflow-hidden rounded-[24px] border border-primary-pastel bg-surface shadow-ambient-lg"
                >
                  <div className="border-b border-border bg-gradient-to-r from-primary-light/75 via-surface to-accent-vanilla/65 px-4 py-3.5">
                    <p className="truncate font-display text-sm font-semibold text-foreground">
                      {user?.fullname || "Giảng viên"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {user?.email || "Chưa có email"}
                    </p>
                  </div>
                  <div className="space-y-0.5 p-2">
                    <Link
                      href="/lecturer/profile"
                      role="menuitem"
                      className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-foreground transition-colors hover:bg-primary-light/55 hover:text-primary"
                    >
                      <User className="h-4 w-4 text-primary" />
                      Hồ sơ giảng viên
                    </Link>
                    <Link
                      href="/"
                      role="menuitem"
                      className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-foreground transition-colors hover:bg-primary-light/55 hover:text-primary"
                    >
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Về giao diện học viên
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive-bg cursor-pointer"
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

      {/* Sky Command Palette (⌘K) */}
      <SkyCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
      />
    </div>
  );
}
