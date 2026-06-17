"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import { Category } from "@/types/user/category";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { HiHeart, HiMenuAlt3, HiSearch } from "react-icons/hi";
import useSWR from "swr";
import { NotificationButton } from "./notification";

const Header = () => {
  const user = useUserStore((s) => s.user);
  const clearNotifications = useRealtimeNotiStore((s) => s.clearAll);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = useCallback(
    (path: string) => {
      router.push(path);
      setIsMenuOpen(false);
      setIsSearchOpen(false);
    },
    [router]
  );

  const handleLecturerClick = useCallback(() => {
    if (user?.roles.includes("LECTURER")) {
      handleNavigation("/lecturer");
    } else {
      handleNavigation("/welcome");
    }
  }, [user, handleNavigation]);

  const clearUser = useUserStore((s) => s.clearUser);
  // Các URL cần ẩn category navigation
  const hideCategoryPaths = [
    "/lecturer",
    "/admin",
    "/learning",
    "/email_authentication",
    "/personalize",
    "/course",
    "/categories",
    "/instructors",
  ];

  const shouldShowCategories = !hideCategoryPaths.some((path) =>
    pathname?.startsWith(path)
  );
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      clearUser();
      clearNotifications();
    } catch (error) {
      // Suppress console error để không ảnh hưởng UX
      // console.error("Error logging out:", error);
    }
  };

  const {
    data: categories = [],
    error,
    isLoading,
  } = useSWR<Category[]>(["/categories"], async ([url]) => {
    const response = await api.get(url);
    return response.data;
  });

  return (
    <header className="bg-white sticky top-0 z-50  border-green-100">
      {/* Main Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 lg:px-12 xl:px-16 2xl:px-24">
          <div className="flex items-center justify-between h-16">
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors cursor-pointer"
              >
                <HiMenuAlt3 className="h-6 w-6" />
              </button>
            </div>

            {/* Logo */}
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => handleNavigation("/")}
                className="group flex items-center space-x-3 focus:outline-none"
              >
                {/* Book Icon with animation */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl opacity-20 group-hover:opacity-30 transition-opacity blur-lg" />
                  <img
                    src="/logo/studynest-logo.svg"
                    alt="StudyNest Logo"
                    width={40}
                    height={40}
                    className="w-10 h-10 relative z-10 group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                {/* Brand Text */}
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <span className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent tracking-wide">
                      STUDY
                    </span>
                    <span className="text-2xl font-black text-green-500 ml-0.5">
                      NEST
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 tracking-widest uppercase -mt-1">
                    Spreading Knowledge
                  </span>
                </div>
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex-1 mx-4 hidden md:block">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <HiSearch className="h-5 w-5 text-green-500 group-focus-within:text-green-600" />
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm khóa học, giảng viên, nội dung..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-green-200 rounded-full bg-white hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all duration-300"
                />
              </div>
            </div>

            {/* Mobile Search Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors cursor-pointer"
              >
                <HiSearch className="h-6 w-6" />
              </button>
            </div>

            {/* Right Section */}
            <div className="hidden lg:flex items-center space-x-4">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={handleLecturerClick}
                    className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 focus:outline-none"
                  >
                    Giảng viên
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigation("/my-learning")}
                    className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 focus:outline-none"
                  >
                    Học tập
                  </button>

                  {/* Heart Icon */}
                  <button
                    type="button"
                    onClick={() => handleNavigation("/favorites")}
                    className="p-2 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 cursor-pointer"
                  >
                    <HiHeart className="h-6 w-6" />
                  </button>

                  {/* Notifications */}
                  <NotificationButton role="USER" />

                  {/* User Avatar */}
                  <div className="relative">
                    <div className="relative group">
                      <button
                        className="flex items-center space-x-2 p-1 rounded-full hover:bg-green-50 focus:outline-none transition-all duration-200 ring-2 ring-transparent hover:ring-green-200 cursor-pointer"
                        aria-label="User menu"
                      >
                        {user.avatar ? (
                          <img
                            src={getGoogleDriveImageUrl(user.avatar)}
                            alt={user.fullname || "User Avatar"}
                            className="w-9 h-9 rounded-full object-cover border-2 border-green-200"
                            onError={(e) => {
                              // Fallback nếu ảnh không load được
                              const target = e.target as HTMLImageElement;
                              target.src = user.avatar || "";
                            }}
                          />
                        ) : (
                          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white text-sm font-bold flex items-center justify-center shadow-md">
                            {user.fullname
                              ? user.fullname
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()
                              : "NH"}
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
                            {user.avatar ? (
                              <div className="relative">
                                <img
                                  src={getGoogleDriveImageUrl(user.avatar)}
                                  alt={user.fullname || "User Avatar"}
                                  className="w-14 h-14 rounded-full object-cover ring-2 ring-green-200"
                                  onError={(e) => {
                                    // Fallback nếu ảnh không load được
                                    const target = e.target as HTMLImageElement;
                                    target.src = user.avatar || "";
                                  }}
                                />
                                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                              </div>
                            ) : (
                              <div className="relative">
                                <span className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white text-lg font-bold flex items-center justify-center shadow-lg ring-2 ring-green-200">
                                  {user.fullname
                                    ? user.fullname
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .slice(0, 2)
                                        .join("")
                                        .toUpperCase()
                                    : "NH"}
                                </span>
                                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => handleNavigation("/profile")}
                                type="button"
                                className="text-base font-bold text-gray-900 truncate hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 hover:cursor-pointer hover:underline"
                              >
                                {user.fullname || "Nguyễn Xuân Huỳnh"}
                              </button>
                              <p className="text-sm text-emerald-600 truncate font-medium">
                                {user.email || "nguyenhuynhdt37@gmail.com"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Learning Section */}
                          <button
                            type="button"
                            onClick={() => handleNavigation("/my-learning")}
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
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                            Học tập
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNavigation("/favorites")}
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
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                              />
                            </svg>
                            Yêu thích
                          </button>

                          <button
                            type="button"
                            onClick={handleLecturerClick}
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
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              />
                            </svg>
                            Bảng điều khiển của giảng viên
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100"></div>

                        {/* Notifications & Settings */}
                        <div className="py-2">
                          <button
                            type="button"
                            onClick={() => handleNavigation("/notifications")}
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
                                d="M15 17h5l-5 5v-5zM4 19v-7a8 8 0 1116 0v1.28l4 4V16a12 12 0 00-24 0v3z"
                              />
                            </svg>
                            <span className="flex-1">Thông báo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNavigation("/messages")}
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
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                            <span className="flex-1">Tin nhắn</span>
                            <span className="ml-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs rounded-full px-2 py-1 font-bold shadow-md">
                              1
                            </span>
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100"></div>

                        {/* Account Settings */}
                        <div className="py-2">
                          <button
                            type="button"
                            onClick={() => handleNavigation("/account")}
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
                            Cài đặt tài khoản
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNavigation("/wallets")}
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
                            Ví của tôi
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNavigation("/subscriptions")}
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
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Thuê bao
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleNavigation("/wallets/transactions")
                            }
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
                                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            Lịch sử giao dịch
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleNavigation("/refunds/refundable")
                            }
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

                        {/* Language & Support */}
                        <div className="py-2">
                          <button
                            type="button"
                            onClick={() => handleNavigation("/language")}
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
                                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                              />
                            </svg>
                            <span className="flex-1">Ngôn ngữ</span>
                            <span className="text-xs text-gray-400">
                              Tiếng Việt
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNavigation("/help")}
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
                                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Trợ giúp và Hỗ trợ
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100"></div>

                        {/* Logout */}
                        <div className="py-2">
                          <button
                            onClick={() => {
                              handleLogout();
                            }}
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

                        {/* StudyNest Business Banner */}
                        <div className="border-t-2 border-green-100 p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                          <button
                            type="button"
                            onClick={() => handleNavigation("/business")}
                            className="block w-full p-3 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-green-200 text-left"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                                <svg
                                  className="w-5 h-5 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-green-700">
                                  StudyNest Business
                                </h4>
                                <p className="text-xs text-emerald-600 font-medium">
                                  Khích lệ mọi người trong công ty học tập
                                </p>
                              </div>
                              <svg
                                className="w-4 h-4 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Login Button */}
                  <button
                    onClick={() => handleNavigation("/login")}
                    className="px-6 py-2.5 border-2 border-green-600 text-green-600 rounded-lg text-sm font-bold hover:bg-green-50 transition-all duration-200 whitespace-nowrap cursor-pointer"
                  >
                    Đăng nhập
                  </button>

                  {/* Register Button */}
                  <button
                    onClick={() => handleNavigation("/register")}
                    className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 whitespace-nowrap shadow-md hover:shadow-xl cursor-pointer"
                  >
                    Đăng ký
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categories Navigation with Dynamic Hover Menu - Only show when logged in */}
      {user && shouldShowCategories && (
        <div
          className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-100 hidden lg:block relative"
          onMouseLeave={() => setActiveCategoryId(null)}
        >
          <div className="max-w-full mx-auto px-4 lg:px-12 xl:px-16 2xl:px-24">
            <div className="flex items-center justify-center space-x-1 py-4">
              {isLoading && (
                <span className="text-sm text-gray-400 animate-pulse">
                  Đang tải danh mục...
                </span>
              )}
              {error && (
                <span className="text-sm text-red-500">
                  Lỗi tải danh mục: {error.message}
                </span>
              )}
              {!isLoading && !error && categories.length === 0 && (
                <span className="text-sm text-gray-400">
                  Không có danh mục nào
                </span>
              )}
              {!isLoading &&
                !error &&
                categories.length > 0 &&
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="relative group"
                    onMouseEnter={() => setActiveCategoryId(category.id)}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleNavigation(`/categories/${category.slug}`)
                      }
                      className={`block px-5 py-2 text-sm font-bold transition-all duration-200 rounded-lg ${
                        activeCategoryId === category.id
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105"
                          : "text-gray-700 hover:text-green-600 hover:bg-white"
                      } focus:outline-none`}
                    >
                      {category.name}
                    </button>
                    {/* Active indicator */}
                    {activeCategoryId === category.id && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-green-600" />
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Dynamic Subcategories Panel */}
          {activeCategoryId &&
            (() => {
              const activeCategory = categories.find(
                (c) => c.id === activeCategoryId
              );
              if (
                !activeCategory ||
                !(activeCategory as any).parent_reverse?.length
              )
                return null;

              return (
                <div className="absolute left-0 right-0 top-full bg-white shadow-xl border-t-2 border-green-100 z-50">
                  <div className="max-w-full mx-auto px-4 lg:px-12 xl:px-16 2xl:px-24 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {/* Category Overview */}
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                          <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <span className="w-2 h-8 bg-gradient-to-b from-green-600 to-emerald-600 rounded-full"></span>
                            {activeCategory.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() =>
                              handleNavigation(
                                `/categories/${activeCategory.slug}`
                              )
                            }
                            className="inline-flex items-center text-sm text-green-600 font-bold hover:text-green-700 group focus:outline-none"
                          >
                            Xem tất cả khóa học
                            <svg
                              className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Subcategories */}
                      <div className="md:col-span-1 lg:col-span-2 xl:col-span-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(activeCategory as any).parent_reverse
                            .sort(
                              (a: any, b: any) => a.order_index - b.order_index
                            )
                            .map((subcategory: any) => (
                              <button
                                key={subcategory.id}
                                type="button"
                                onClick={() =>
                                  handleNavigation(
                                    `/categories/${activeCategory.slug}/${subcategory.slug}`
                                  )
                                }
                                className="group block w-full p-3 rounded-lg hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:shadow-md transition-all duration-200 border border-transparent hover:border-green-200 text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-1 bg-green-500 rounded-full group-hover:w-2 group-hover:h-2 transition-all"></div>
                                  <div className="text-sm font-semibold text-gray-900 group-hover:text-green-600">
                                    {subcategory.name}
                                  </div>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      )}

      {/* Mobile Search Bar */}
      {isSearchOpen && (
        <div className="md:hidden py-4 border-t-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="max-w-full mx-auto px-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiSearch className="h-5 w-5 text-green-500" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm khóa học, giảng viên..."
                className="w-full pl-12 pr-4 py-3 border-2 border-green-200 rounded-full bg-white hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="max-w-full mx-auto px-4">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleNavigation("/lecturer")}
                    className="block w-full px-3 py-2 text-left text-base font-semibold text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    Giảng viên
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigation("/my-learning")}
                    className="block w-full px-3 py-2 text-left text-base font-semibold text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    Học tập
                  </button>
                </>
              ) : (
                <>
                  <div className="px-3 py-2 space-y-2">
                    <button
                      onClick={() => handleNavigation("/login")}
                      className="w-full px-4 py-2.5 border-2 border-green-600 text-green-600 rounded-lg text-sm font-bold hover:bg-green-50 transition-all cursor-pointer"
                    >
                      Đăng nhập
                    </button>
                    <button
                      onClick={() => handleNavigation("/register")}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md cursor-pointer"
                    >
                      Đăng ký
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
