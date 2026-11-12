"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import useSWR from "swr";
import {
  BarChart3,
  BookOpen,
  Building2,
  Clock,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  Tag,
  User,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import { HoldEarningsResponse } from "@/types/lecturer/hold";
import { NotificationButton } from "./notification";

const LecturerHeader = () => {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const clearNotifications = useRealtimeNotiStore((s) => s.clearAll);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: "/lecturer", label: "Trang chủ", icon: Home },
    { href: "/lecturer/courses", label: "Khóa học", icon: BookOpen },
    { href: "/lecturer/providers", label: "Đơn vị", icon: Building2 },
    { href: "/lecturer/discounts", label: "Mã giảm giá", icon: Tag },
    { href: "/lecturer/wallets", label: "Ví", icon: Wallet },
    { href: "/lecturer/dashboard", label: "Thống kê", icon: BarChart3 },
  ];

  // Lấy chữ cái đầu tên giảng viên
  const getUserInitials = () => {
    if (user?.fullname) {
      return user.fullname
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    return "GV";
  };

  // Xử lý đăng xuất an toàn
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Bỏ qua lỗi mạng khi đăng xuất để luôn giữ trải nghiệm sạch
    } finally {
      clearUser();
      clearNotifications();
      router.push("/login");
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/lecturer/courses?search=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/lecturer/courses");
    }
    setIsMobileMenuOpen(false);
  };

  // Lấy số lượng giao dịch đang hold
  const { data: holdData } = useSWR<HoldEarningsResponse>(
    "/lecturer/transactions/earnings/holding?page=1&limit=1",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
    }
  );

  const holdCount = holdData?.total || 0;

  return (
    <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo Thương Hiệu Mây Mây */}
          <Link
            href="/lecturer"
            className="flex items-center gap-2.5 group shrink-0"
            aria-label="Trang chủ Giảng viên Mây Mây"
          >
            <div className="w-10 h-10 bg-primary-light border border-primary-pastel/70 rounded-xl flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-primary-pastel/60 transition-all duration-200">
              <img
                src="/logo/studynest-logo.svg"
                alt="Mây Mây"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-bold text-foreground font-display leading-none tracking-tight">
                Mây <span className="text-primary">Mây</span>
              </span>
              <span className="text-[10px] font-semibold text-subtle-foreground tracking-widest uppercase mt-0.5">
                Giảng viên
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Điều hướng Giảng viên"
            className="hidden lg:flex items-center gap-1"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (link.href !== "/lecturer" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-primary-light text-primary font-semibold shadow-2xs"
                      : "text-muted-foreground hover:bg-primary-light/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Search Input */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden md:block w-52 xl:w-64"
            >
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary w-4 h-4 transition-colors" />
                <input
                  type="text"
                  placeholder="Tìm khóa học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 bg-background border border-input rounded-full hover:border-primary-pastel focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 transition-all text-xs text-foreground placeholder:text-subtle-foreground"
                />
              </div>
            </form>

            {/* Notifications */}
            <NotificationButton role="LECTURER" />

            {/* Profile Dropdown */}
            <div className="relative group" ref={userMenuRef}>
              <button
                type="button"
                className="flex items-center gap-2 p-1 rounded-full hover:bg-primary-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200 cursor-pointer"
                aria-label="Menu tài khoản giảng viên"
              >
                {user?.avatar ? (
                  <img
                    src={getImageUrl(user.avatar)}
                    alt={user.fullname || "Giảng viên"}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-pastel"
                  />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-2xs ring-2 ring-primary-pastel">
                    {getUserInitials()}
                  </span>
                )}
              </button>

              {/* Vùng cầu nối chống mất hover */}
              <div className="absolute right-0 top-full w-72 h-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-40" />

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-1 w-72 sm:w-80 bg-surface rounded-[20px] shadow-ambient-lg border border-border opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-50 overflow-hidden">
                {/* User Info Header */}
                <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary-light/70 to-secondary-light/40">
                  <div className="flex items-center gap-3">
                    {user?.avatar ? (
                      <div className="relative shrink-0">
                        <img
                          src={getImageUrl(user.avatar)}
                          alt={user.fullname || "Avatar giảng viên"}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-pastel"
                        />
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success-foreground rounded-full border-2 border-surface" />
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <span className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-xs ring-2 ring-primary-pastel">
                          {getUserInitials()}
                        </span>
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success-foreground rounded-full border-2 border-surface" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {user?.fullname || "Giảng viên"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {user?.email || "lecturer@maymay.edu.vn"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items: Tài khoản */}
                <div className="py-1.5">
                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer/profile")}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-foreground hover:bg-primary-light/50 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Hồ sơ giảng viên</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer/providers")}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-foreground hover:bg-primary-light/50 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Đơn vị giảng dạy</span>
                  </button>
                </div>

                <div className="border-t border-border/80" />

                {/* Menu Items: Tài chính & Vận hành */}
                <div className="py-1.5">
                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer/wallets")}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-foreground hover:bg-primary-light/50 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Ví của giảng viên</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer/hold")}
                    className="flex w-full items-center justify-between px-5 py-2.5 text-sm text-foreground hover:bg-primary-light/50 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>Giao dịch đang hold</span>
                    </div>
                    {holdCount > 0 && (
                      <Badge variant="primary" size="sm">
                        {holdCount > 99 ? "99+" : holdCount}
                      </Badge>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer/refund")}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-foreground hover:bg-primary-light/50 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Yêu cầu hoàn tiền</span>
                  </button>
                </div>

                <div className="border-t border-border/80" />

                {/* Chuyển chế độ & Đăng xuất */}
                <div className="py-1.5">
                  <button
                    type="button"
                    onClick={() => handleNavigation("/")}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-foreground hover:bg-primary-light/50 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Về giao diện học viên</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-destructive-foreground hover:bg-destructive-bg/50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-primary-light/60 hover:text-primary transition-colors cursor-pointer"
              aria-label="Mở menu điều hướng"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border space-y-3">
            {/* Search trên Mobile */}
            <form onSubmit={handleSearchSubmit} className="md:hidden">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Tìm kiếm khóa học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-background border border-input rounded-xl focus:outline-none focus:border-ring text-sm text-foreground"
                />
              </div>
            </form>

            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/lecturer" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary-light text-primary font-semibold"
                        : "text-muted-foreground hover:bg-primary-light/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              <div className="border-t border-border/70 my-1" />

              <button
                type="button"
                onClick={() => handleNavigation("/lecturer/hold")}
                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary-light/50 hover:text-foreground transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Giao dịch đang hold</span>
                </div>
                {holdCount > 0 && (
                  <Badge variant="primary" size="sm">
                    {holdCount > 99 ? "99+" : holdCount}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleNavigation("/lecturer/refund")}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary-light/50 hover:text-foreground transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span>Yêu cầu hoàn tiền</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigation("/")}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary-light/60 transition-colors cursor-pointer"
              >
                <GraduationCap className="h-4 w-4 shrink-0" />
                <span>Về giao diện học viên</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default LecturerHeader;
