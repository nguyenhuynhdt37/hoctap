"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { HoldEarningsResponse } from "@/types/lecturer/hold";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  HiAcademicCap,
  HiChartBar,
  HiCurrencyDollar,
  HiMenu,
  HiOutlineLogout,
  HiSearch,
  HiTag,
  HiVideoCamera,
  HiX,
} from "react-icons/hi";
import useSWR from "swr";
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
    { href: "/lecturer", label: "Trang chủ", icon: HiAcademicCap },
    { href: "/lecturer/courses", label: "Khóa học", icon: HiVideoCamera },
    { href: "/lecturer/discounts", label: "Mã giảm giá", icon: HiTag },
    { href: "/lecturer/wallets", label: "Ví", icon: HiCurrencyDollar },
    { href: "/lecturer/dashboard", label: "Thống kê", icon: HiChartBar },
  ];

  // Get user initials
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

  // Handle logout
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      clearUser();
      clearNotifications();
      router.push("/login");
    } catch (error) {
      // Suppress console error
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  // Fetch hold earnings count
  const { data: holdData } = useSWR<HoldEarningsResponse>(
    "/lecturer/transactions/earnings/holding?page=1&limit=1",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const holdCount = holdData?.total || 0;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-green-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/lecturer" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
              <HiAcademicCap className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                StudyNest
              </span>
              <p className="text-xs text-gray-500 -mt-1">Giảng viên</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (link.href !== "/lecturer" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-green-50 text-green-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden sm:block flex-1 max-w-md">
              <div className="relative group">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 group-focus-within:text-green-600 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-green-200 rounded-full hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            {/* Notifications */}
            <NotificationButton role="LECTURER" />

            {/* Profile Dropdown */}
            <div className="relative group" ref={userMenuRef}>
              <button
                type="button"
                className="flex items-center gap-2 p-1 rounded-full hover:bg-green-50 focus:outline-none transition-all duration-200 ring-2 ring-transparent hover:ring-green-200"
                aria-label="User menu"
              >
                {user?.avatar ? (
                  <img
                    src={getGoogleDriveImageUrl(user.avatar)}
                    alt={user.fullname || "User"}
                    className="w-9 h-9 rounded-full object-cover border-2 border-green-200"
                  />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white text-sm font-bold flex items-center justify-center shadow-md">
                    {getUserInitials()}
                  </span>
                )}
              </button>

              {/* Invisible bridge to connect button and dropdown */}
              <div className="absolute right-0 top-full w-80 h-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-40"></div>

              {/* Beautiful Dropdown Menu - StudyNest Style */}
              <div className="absolute right-0 top-full w-80 bg-white rounded-xl shadow-2xl border-2 border-green-100 opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
                {/* User Info Section - Green Theme */}
                <div className="px-6 py-4 border-b-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex items-center space-x-3">
                    {user?.avatar ? (
                      <div className="relative">
                        <img
                          src={getGoogleDriveImageUrl(user.avatar)}
                          alt={user.fullname || "User Avatar"}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-green-200"
                        />
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white text-lg font-bold flex items-center justify-center shadow-lg ring-2 ring-green-200">
                          {getUserInitials()}
                        </span>
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-gray-900 truncate">
                        {user?.fullname || "Giảng viên"}
                      </p>
                      <p className="text-sm text-emerald-600 truncate font-medium">
                        {user?.email || "lecturer@studynest.com"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer/profile")}
                    className="flex w-full items-center px-6 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-150 text-left"
                  >
                    <svg
                      className="w-5 h-5 mr-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Hồ sơ
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer/settings")}
                    className="flex w-full items-center px-6 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-150 text-left"
                  >
                    <svg
                      className="w-5 h-5 mr-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Cài đặt
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100"></div>

                {/* Wallet Section */}
                <div className="py-2">
                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer/wallets")}
                    className="flex w-full items-center px-6 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-150 text-left"
                  >
                    <svg
                      className="w-5 h-5 mr-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    Ví của giảng viên
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer/hold")}
                    className="flex w-full items-center justify-between px-6 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-150 text-left"
                  >
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 mr-3 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Giao dịch đang hold
                    </div>
                    {holdCount > 0 && (
                      <span className="bg-green-600 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {holdCount > 99 ? "99+" : holdCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer/refund")}
                    className="flex w-full items-center px-6 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-150 text-left"
                  >
                    <svg
                      className="w-5 h-5 mr-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    Yêu cầu hoàn tiền
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100"></div>

                {/* Logout */}
                <div className="py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-6 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                  >
                    <svg
                      className="w-5 h-5 mr-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-green-50 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <HiX className="h-6 w-6 text-gray-600" />
              ) : (
                <HiMenu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-green-50 text-green-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={() => handleNavigation("/lecturer/wallets")}
                className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 text-gray-600 hover:bg-gray-50"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <span>Ví của giảng viên</span>
              </button>
              <button
                onClick={() => handleNavigation("/lecturer/hold")}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 text-gray-600 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Giao dịch đang hold</span>
                </div>
                {holdCount > 0 && (
                  <span className="bg-green-600 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                    {holdCount > 99 ? "99+" : holdCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleNavigation("/lecturer/refund")}
                className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 text-gray-600 hover:bg-gray-50"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <span>Yêu cầu hoàn tiền</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default LecturerHeader;
