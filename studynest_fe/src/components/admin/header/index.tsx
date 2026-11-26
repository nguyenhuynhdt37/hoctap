"use client";

import { AiPipelineQueueDrawer } from "@/components/shared/ai-pipeline-queue-drawer";
import ContextMenu from "@/components/shared/context-menu";
import { logoutEverywhere } from "@/lib/auth/logout";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  ChevronRight,
  Command,
  Compass,
  CornerDownLeft,
  ExternalLink,
  FileText,
  Folder,
  GraduationCap,
  LogOut,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Tag,
  User,
  Users,
  Wallet,
  X,
} from "pulsoicon-react";
import { NotificationButton } from "./notification";

interface HeaderProps {
  isCollapsed: boolean;
}

interface RouteMeta {
  title: string;
  section: string;
  icon: ComponentType<{ size?: number; className?: string; animated?: boolean }>;
}

const ROUTE_MAP: Array<{ prefix: string; exact?: boolean; meta: RouteMeta }> = [
  {
    prefix: "/admin",
    exact: true,
    meta: { title: "Đài Quan Sát", section: "Tổng quan", icon: Compass },
  },
  {
    prefix: "/admin/courses",
    meta: { title: "Kiểm duyệt Khóa học", section: "Học thuật", icon: BookOpen },
  },
  {
    prefix: "/admin/catalog",
    meta: { title: "Khối lớp & Môn học", section: "Học thuật", icon: Folder },
  },
  {
    prefix: "/admin/users",
    meta: { title: "Thành viên", section: "Con người", icon: Users },
  },
  {
    prefix: "/admin/lecturers",
    meta: { title: "Giảng viên", section: "Con người", icon: GraduationCap },
  },
  {
    prefix: "/admin/contracts",
    meta: { title: "Hợp đồng Điện tử", section: "Pháp lý & PKI", icon: FileText },
  },
  {
    prefix: "/admin/roles",
    meta: { title: "Vai trò & Quyền hạn", section: "Bảo mật", icon: ShieldCheck },
  },
  {
    prefix: "/admin/wallets",
    meta: { title: "Ví Nền tảng", section: "Tài chính", icon: Wallet },
  },
  {
    prefix: "/admin/transactions",
    meta: { title: "Giao dịch hệ thống", section: "Tài chính", icon: ArrowLeftRight },
  },
  {
    prefix: "/admin/discounts",
    meta: { title: "Mã giảm giá", section: "Khuyến mãi", icon: Tag },
  },
  {
    prefix: "/admin/refunds",
    meta: { title: "Hoàn tiền", section: "Tài chính", icon: RotateCcw },
  },
  {
    prefix: "/admin/withdraws",
    meta: { title: "Rút tiền", section: "Tài chính", icon: Banknote },
  },
  {
    prefix: "/admin/settings",
    meta: { title: "Cài đặt hệ thống", section: "Cấu hình", icon: Settings },
  },
];

interface CommandEntry {
  id: string;
  title: string;
  hint: string;
  group: string;
  href: string;
  keywords: string;
  icon: ComponentType<{ size?: number; className?: string; animated?: boolean }>;
}

const COMMAND_ENTRIES: CommandEntry[] = [
  {
    id: "dash",
    title: "Đài Quan Sát (Dashboard)",
    hint: "Tổng quan KPI & biểu đồ bầu trời",
    group: "Điều hướng nhanh",
    href: "/admin",
    keywords: "dashboard tong quan home bang dieu khien",
    icon: Compass,
  },
  {
    id: "courses",
    title: "Kiểm duyệt & Xem trước Khóa học",
    hint: "Thẩm định video, bài tập tương tác & phê duyệt lên sàn",
    group: "Điều hướng nhanh",
    href: "/admin/courses",
    keywords: "courses khoa hoc phe duyet review preview video quiz",
    icon: BookOpen,
  },
  {
    id: "catalog",
    title: "Khối lớp & Môn học",
    hint: "Curriculum Studio · Ma trận môn học",
    group: "Điều hướng nhanh",
    href: "/admin/catalog",
    keywords: "catalog khoi lop mon hoc danh muc",
    icon: Folder,
  },
  {
    id: "users",
    title: "Quản lý Thành viên",
    hint: "Danh sách học viên & hồ sơ tài khoản",
    group: "Con người",
    href: "/admin/users",
    keywords: "user thanh vien hoc vien tai khoan",
    icon: Users,
  },
  {
    id: "users-deleted",
    title: "Tài khoản đã xóa mềm",
    hint: "Khôi phục hoặc đối soát tài khoản đã xóa",
    group: "Con người",
    href: "/admin/users/deleted",
    keywords: "deleted xoa mem khoi phuc user",
    icon: Users,
  },
  {
    id: "lecturers",
    title: "Đội ngũ Giảng viên",
    hint: "Thêm mới, thăng cấp & kiểm soát Coin GV",
    group: "Con người",
    href: "/admin/lecturers",
    keywords: "lecturer giang vien doi tac",
    icon: GraduationCap,
  },
  {
    id: "contracts",
    title: "Hợp đồng Điện tử & PKI",
    hint: "Quản lý hợp đồng số, đồng ký CA & kiểm toán SHA-256",
    group: "Con người",
    href: "/admin/contracts",
    keywords: "contract hop dong chu ky dien tu pki x509 pades",
    icon: FileText,
  },
  {
    id: "roles",
    title: "Vai trò & Quyền hạn",
    hint: "Kiến trúc phân quyền RBAC",
    group: "Con người",
    href: "/admin/roles",
    keywords: "role quyen han phan quyen rbac",
    icon: ShieldCheck,
  },
  {
    id: "wallets",
    title: "Ví Nền tảng & Sổ cái",
    hint: "Treasury Studio · Đối soát dòng tiền",
    group: "Tài chính",
    href: "/admin/wallets",
    keywords: "wallet vi nen tang so cai coin",
    icon: Wallet,
  },
  {
    id: "transactions",
    title: "Giao dịch hệ thống",
    hint: "Tra cứu toàn bộ lệnh nạp, mua, rút, hoàn",
    group: "Tài chính",
    href: "/admin/transactions",
    keywords: "transaction giao dich hoa don",
    icon: ArrowLeftRight,
  },
  {
    id: "discounts",
    title: "Mã giảm giá (Nền tảng & GV)",
    hint: "Kiểm soát toàn bộ voucher toàn sàn",
    group: "Tài chính",
    href: "/admin/discounts",
    keywords: "discount voucher ma giam gia khuyen mai",
    icon: Tag,
  },
  {
    id: "refunds",
    title: "Phân xử Hoàn tiền",
    hint: "Duyệt / từ chối yêu cầu hoàn học phí",
    group: "Tài chính",
    href: "/admin/refunds",
    keywords: "refund hoan tien khieu nai",
    icon: RotateCcw,
  },
  {
    id: "withdraws",
    title: "Lệnh Rút tiền Giảng viên",
    hint: "Đối soát ví Coin & phê duyệt giải ngân",
    group: "Tài chính",
    href: "/admin/withdraws",
    keywords: "withdraw rut tien chi tra payout",
    icon: Banknote,
  },
  {
    id: "create-discount",
    title: "Tạo mã giảm giá nền tảng mới",
    hint: "Mở trình thiết kế vé khuyến mãi",
    group: "Thao tác nhanh",
    href: "/admin/discounts/create",
    keywords: "tao ma giam gia create discount voucher",
    icon: Plus,
  },
  {
    id: "create-role",
    title: "Tạo vai trò phân quyền mới",
    hint: "Thiết lập role mới cho đội ngũ",
    group: "Thao tác nhanh",
    href: "/admin/roles/create",
    keywords: "tao vai tro create role",
    icon: Plus,
  },
  {
    id: "settings",
    title: "Cài đặt hệ thống & Kinh tế Coin",
    hint: "Tỷ giá Coin, chia sẻ doanh thu, AI & bảo mật",
    group: "Cấu hình",
    href: "/admin/settings",
    keywords: "settings cai dat ty gia coin ai",
    icon: Settings,
  },
];

const QUICK_CREATE_ITEMS = [
  {
    label: "Tạo mã giảm giá",
    desc: "Chiến dịch khuyến mãi mới",
    href: "/admin/discounts/create",
    icon: Tag,
  },
  {
    label: "Tạo vai trò mới",
    desc: "Phân quyền RBAC",
    href: "/admin/roles/create",
    icon: ShieldCheck,
  },
  {
    label: "Quản lý Giảng viên",
    desc: "Thêm mới / thăng cấp 1 chạm",
    href: "/admin/lecturers",
    icon: GraduationCap,
  },
  {
    label: "Khối lớp & Môn học",
    desc: "Mở Curriculum Studio",
    href: "/admin/catalog",
    icon: Folder,
  },
];

export default function Header({ isCollapsed }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const clearNotifications = useRealtimeNotiStore((s) => s.clearAll);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [quickOpen, setQuickOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [menuType, setMenuType] = useState<"user" | "bell" | null>(null);

  const quickRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  // Nhận diện phân khu hiện tại cho Dynamic Breadcrumb
  const currentRouteMeta = useMemo<RouteMeta>(() => {
    const matched = ROUTE_MAP.find((r) =>
      r.exact
        ? pathname === r.prefix
        : pathname === r.prefix || pathname.startsWith(r.prefix + "/"),
    );
    return (
      matched?.meta ?? {
        title: "Quản trị Mây Mây",
        section: "Hệ thống",
        icon: Compass,
      }
    );
  }, [pathname]);

  const isDetailPage = useMemo(() => {
    const parts = (pathname || "").split("/").filter(Boolean);
    return parts.length >= 3;
  }, [pathname]);

  const skyGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Chào buổi sáng", isNight: false };
    if (hour < 18) return { text: "Chào buổi chiều", isNight: false };
    return { text: "Chào buổi tối", isNight: true };
  }, []);

  const filteredCommands = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return COMMAND_ENTRIES;
    return COMMAND_ENTRIES.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.keywords.includes(q),
    );
  }, [paletteQuery]);

  // Global keyboard shortcut ⌘K / Ctrl+K + custom event từ Sidebar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
        setQuickOpen(false);
        setProfileOpen(false);
        setMenuOpen(false);
      }
    };
    const onCustomOpen = () => setPaletteOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("maymay:open-command-palette", onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("maymay:open-command-palette", onCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (paletteOpen) {
      setActiveIndex(0);
      setTimeout(() => paletteInputRef.current?.focus(), 20);
    } else {
      setPaletteQuery("");
    }
  }, [paletteOpen]);

  // Click outside for Quick Create & Profile popovers
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (quickOpen && quickRef.current && !quickRef.current.contains(target)) {
        setQuickOpen(false);
      }
      if (
        profileOpen &&
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [quickOpen, profileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
    };
  }, [menuOpen]);

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

  const handleNavigation = (path: string) => {
    setPaletteOpen(false);
    setQuickOpen(false);
    setProfileOpen(false);
    router.push(path);
  };

  const openMenu = (e: React.MouseEvent, type: "user" | "bell") => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    setMenuType(type);
    setMenuOpen(true);
  };

  const CurrentIcon = currentRouteMeta.icon;

  return (
    <>
      <header
        className={`
          fixed right-0 top-0 z-40 h-[72px] border-b border-primary-pastel/60
          bg-surface/85 backdrop-blur-xl shadow-[0_12px_32px_-24px_rgba(53,111,167,0.35)]
          transition-all duration-300 left-0
          ${isCollapsed ? "lg:left-20" : "lg:left-72"}
        `}
      >
        <div className="flex h-full items-center justify-between gap-3 pl-16 pr-4 lg:px-6">
          {/* Left: Dynamic Context Breadcrumb Pill */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel/80 bg-primary-light/85 text-primary shadow-2xs sm:flex">
              <CurrentIcon size={17} animated={false} />
            </div>
            <div className="min-w-0">
              <div className="hidden items-center gap-1 text-[11px] font-medium text-muted-foreground sm:flex">
                <Link href="/admin" className="hover:text-primary">
                  Admin
                </Link>
                <ChevronRight size={11} animated={false} />
                <span>{currentRouteMeta.section}</span>
                {isDetailPage && (
                  <>
                    <ChevronRight size={11} animated={false} />
                    <span className="text-primary">Chi tiết</span>
                  </>
                )}
              </div>
              <p className="truncate font-display text-sm font-bold leading-tight text-foreground sm:text-base">
                {currentRouteMeta.title}
              </p>
            </div>
          </div>

          {/* Center: Command Palette Trigger (⌘K) */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group hidden h-10 flex-1 max-w-md items-center justify-between gap-3 rounded-2xl border border-primary-pastel/75 bg-background/85 px-3.5 text-xs text-muted-foreground shadow-2xs transition-all hover:border-primary hover:bg-surface hover:text-foreground md:flex"
          >
            <span className="flex items-center gap-2 truncate">
              <Search
                size={15}
                animated={false}
                className="text-primary transition-transform group-hover:scale-105"
              />
              <span className="truncate">
                Tìm nhanh trang, thao tác hoặc phân khu...
              </span>
            </span>
            <kbd className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-2xs">
              <Command size={10} animated={false} />K
            </kbd>
          </button>

          {/* Right: Sky Greeting + Quick Create + AI Queue + Bell + Profile */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Mobile Command Search Trigger */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Mở tìm kiếm nhanh"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-primary md:hidden"
            >
              <Search size={17} animated={false} />
            </button>

            {/* Sky Greeting Chip (xl+) */}
            <div className="hidden items-center gap-1.5 rounded-full border border-accent-vanilla-border/80 bg-accent-vanilla/50 px-3 py-1.5 text-[11px] font-semibold text-accent-vanilla-foreground xl:inline-flex">
              {skyGreeting.isNight ? (
                <Moon size={13} animated={false} />
              ) : (
                <Sun size={13} animated={false} />
              )}
              <span>{skyGreeting.text}</span>
            </div>

            {/* Quick Create Popover */}
            <div className="relative" ref={quickRef}>
              <button
                type="button"
                onClick={() => setQuickOpen((v) => !v)}
                className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(53,111,167,0.65)] transition-all hover:bg-primary-hover"
              >
                <Plus size={15} animated={false} />
                <span className="hidden sm:inline">Tạo nhanh</span>
              </button>

              {quickOpen && (
                <div className="absolute right-0 top-full z-50 mt-2.5 w-64 overflow-hidden rounded-3xl border border-primary-pastel/80 bg-surface/95 p-2 shadow-[0_24px_60px_-18px_rgba(53,111,167,0.28)] backdrop-blur-xl">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-subtle-foreground">
                    Lối tắt điều hành
                  </p>
                  {QUICK_CREATE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => handleNavigation(item.href)}
                        className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-primary-light/70"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                          <Icon size={15} animated={false} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {item.label}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <AiPipelineQueueDrawer role="ADMIN" />

            {/* Notifications */}
            <div onContextMenu={(e) => openMenu(e, "bell")}>
              <NotificationButton role="ADMIN" />
            </div>

            {/* Admin Profile Popover */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                onContextMenu={(e) => openMenu(e, "user")}
                className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-1 pr-2.5 transition-all hover:border-primary-pastel hover:bg-primary-light/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Menu tài khoản quản trị"
              >
                {user?.avatar ? (
                  <img
                    src={getImageUrl(user.avatar)}
                    alt={user.fullname || "Admin"}
                    className="h-8 w-8 rounded-xl object-cover ring-1 ring-primary-pastel"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-xs font-bold text-primary-foreground shadow-2xs">
                    {getUserInitials()}
                  </span>
                )}
                <div className="hidden text-left lg:block">
                  <p className="max-w-[110px] truncate text-xs font-bold leading-tight text-foreground">
                    {user?.fullname || "Admin"}
                  </p>
                  <p className="text-[10px] font-medium text-primary">
                    Quản trị viên
                  </p>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full z-50 mt-2.5 w-72 overflow-hidden rounded-3xl border border-primary-pastel/80 bg-surface/95 shadow-[0_24px_60px_-18px_rgba(53,111,167,0.28)] backdrop-blur-xl">
                  {/* Profile Header */}
                  <div className="border-b border-primary-pastel/60 bg-gradient-to-br from-primary-light/85 via-surface to-accent-vanilla/45 p-4">
                    <div className="flex items-center gap-3">
                      {user?.avatar ? (
                        <img
                          src={getImageUrl(user.avatar)}
                          alt={user.fullname || "Admin"}
                          className="h-12 w-12 rounded-2xl object-cover ring-2 ring-surface shadow-sm"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-base font-bold text-primary-foreground shadow-sm">
                          {getUserInitials()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {user?.fullname || "Quản trị viên"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user?.email || "admin@maymay.edu.vn"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="space-y-0.5 p-2">
                    <button
                      type="button"
                      onClick={() => handleNavigation("/admin/profile")}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-primary-light/70 hover:text-primary"
                    >
                      <User size={15} animated={false} className="text-primary" />
                      Hồ sơ cá nhân
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigation("/admin/settings")}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-primary-light/70 hover:text-primary"
                    >
                      <Settings size={15} animated={false} className="text-primary" />
                      Cài đặt hệ thống
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigation("/admin/wallets")}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-primary-light/70 hover:text-primary"
                    >
                      <Wallet size={15} animated={false} className="text-primary" />
                      Ví nền tảng &amp; Sổ cái
                    </button>
                    <Link
                      href="/"
                      target="_blank"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-primary-light/70 hover:text-primary"
                    >
                      <ExternalLink
                        size={15}
                        animated={false}
                        className="text-primary"
                      />
                      Mở trang học viên
                    </Link>
                  </div>

                  <div className="border-t border-border/80 p-2">
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive-bg"
                    >
                      <LogOut size={15} animated={false} />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {menuOpen && (
            <ContextMenu
              x={menuPos.x}
              y={menuPos.y}
              onClose={() => setMenuOpen(false)}
              items={
                menuType === "user"
                  ? [
                      {
                        label: "Hồ sơ",
                        onClick: () => {
                          handleNavigation("/admin/profile");
                          setMenuOpen(false);
                        },
                      },
                      {
                        label: "Cài đặt",
                        onClick: () => {
                          handleNavigation("/admin/settings");
                          setMenuOpen(false);
                        },
                      },
                      {
                        label: "Ví nền tảng",
                        onClick: () => {
                          handleNavigation("/admin/wallets");
                          setMenuOpen(false);
                        },
                      },
                      {
                        label: "Đăng xuất",
                        onClick: () => {
                          void handleLogout();
                          setMenuOpen(false);
                        },
                      },
                    ]
                  : [
                      {
                        label: "Xem tất cả thông báo",
                        onClick: () => {
                          handleNavigation("/admin/notifications");
                          setMenuOpen(false);
                        },
                      },
                    ]
              }
            />
          )}
        </div>
      </header>

      {/* Global Command Palette Modal (⌘K) */}
      {paletteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tìm kiếm và điều hướng nhanh"
          className="fixed inset-0 z-[100] flex items-start justify-center bg-foreground/25 px-4 pt-[12vh] backdrop-blur-[3px]"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-primary-pastel bg-surface/98 shadow-[0_32px_80px_-20px_rgba(53,111,167,0.35)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-primary-pastel/60 bg-gradient-to-r from-primary-light/60 via-surface to-accent-vanilla/30 px-5 py-4">
              <Search size={18} animated={false} className="text-primary" />
              <input
                ref={paletteInputRef}
                type="text"
                value={paletteQuery}
                onChange={(e) => {
                  setPaletteQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) =>
                      filteredCommands.length === 0
                        ? 0
                        : (i + 1) % filteredCommands.length,
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) =>
                      filteredCommands.length === 0
                        ? 0
                        : (i - 1 + filteredCommands.length) %
                          filteredCommands.length,
                    );
                  } else if (e.key === "Enter" && filteredCommands[activeIndex]) {
                    e.preventDefault();
                    handleNavigation(filteredCommands[activeIndex].href);
                  }
                }}
                placeholder="Gõ tên phân khu, giảng viên, rút tiền, mã giảm giá..."
                className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                aria-label="Đóng bảng lệnh"
                className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X size={15} animated={false} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[380px] overflow-y-auto p-2.5">
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Không tìm thấy lệnh phù hợp với “{paletteQuery}”
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCommands.map((item, idx) => {
                    const Icon = item.icon;
                    const active = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleNavigation(item.href)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors ${
                          active
                            ? "bg-primary-light text-primary"
                            : "text-foreground hover:bg-background"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                              active
                                ? "bg-surface text-primary shadow-2xs"
                                : "bg-background text-muted-foreground"
                            }`}
                          >
                            <Icon size={15} animated={false} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">
                              {item.title}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.hint}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="hidden rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                            {item.group}
                          </span>
                          {active && (
                            <CornerDownLeft size={13} animated={false} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Hints */}
            <div className="flex items-center justify-between border-t border-border/80 bg-background/60 px-5 py-2.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>↑↓ Di chuyển</span>
                <span>↵ Mở trang</span>
                <span>Esc Đóng</span>
              </div>
              <span className="font-semibold text-primary">
                Mây Mây Cloud Command
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
