"use client";

import ContextMenu from "@/components/shared/context-menu";
import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HiSearch } from "react-icons/hi";
import { NotificationButton } from "./notification";

interface HeaderProps {
  isCollapsed: boolean;
}

export default function Header({ isCollapsed }: HeaderProps) {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const clearNotifications = useRealtimeNotiStore((s) => s.clearAll);
  const [searchQuery, setSearchQuery] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    return "A";
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
  };
  // Context menus
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [menuType, setMenuType] = useState<"user" | "bell" | null>(null);
  const openMenu = (e: React.MouseEvent, type: "user" | "bell") => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    setMenuType(type);
    setMenuOpen(true);
  };
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  return (
    <header
      className={`
        fixed top-0 right-0 h-16 bg-white border-b border-green-100 shadow-sm
        transition-all duration-300 z-40
        ${isCollapsed ? "left-16" : "left-64"}
      `}
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 group-focus-within:text-green-600 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-2 border-green-200 rounded-full hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div onContextMenu={(e) => openMenu(e, "bell")}>
            <NotificationButton role="ADMIN" />
          </div>

          {/* User Menu */}
          <div className="relative group" ref={userMenuRef}>
            <button
              type="button"
              onContextMenu={(e) => openMenu(e, "user")}
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
                      {user?.fullname || "Quản trị viên"}
                    </p>
                    <p className="text-sm text-emerald-600 truncate font-medium">
                      {user?.email || "admin@studynest.com"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  type="button"
                  onClick={() => handleNavigation("/admin/profile")}
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
                  onClick={() => handleNavigation("/admin/settings")}
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
                  onClick={() => handleNavigation("/admin/wallets")}
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
                  Ví hệ thống
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
                      label: "Ví hệ thống",
                      onClick: () => {
                        handleNavigation("/admin/wallets");
                        setMenuOpen(false);
                      },
                    },
                    {
                      label: "Đăng xuất",
                      onClick: () => {
                        handleLogout();
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
  );
}
