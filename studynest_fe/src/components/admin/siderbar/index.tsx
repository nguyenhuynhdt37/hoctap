"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HiAcademicCap,
  HiArrowDown,
  HiArrowUp,
  HiChevronLeft,
  HiChevronRight,
  HiCog,
  HiCurrencyDollar,
  HiDocumentText,
  HiFolder,
  HiHome,
  HiKey,
  HiLogout,
  HiMenu,
  HiTag,
  HiUsers,
  HiX,
} from "react-icons/hi";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge: number | null;
  exact?: boolean;
}

const menuItems: MenuItem[] = [
  {
    title: "Bảng điều khiển",
    href: "/admin",
    icon: HiHome,
    badge: null,
    exact: true,
  },
  {
    title: "Danh mục",
    href: "/admin/categories",
    icon: HiFolder,
    badge: null,
  },
  {
    title: "Chủ đề",
    href: "/admin/topics",
    icon: HiDocumentText,
    badge: null,
  },
  {
    title: "Quyền hạn",
    href: "/admin/roles",
    icon: HiKey,
    badge: null,
  },
  {
    title: "Người dùng",
    href: "/admin/users",
    icon: HiUsers,
    badge: null,
  },
  {
    title: "Giảng viên",
    href: "/admin/lecturers",
    icon: HiAcademicCap,
    badge: null,
  },
  {
    title: "Ví",
    href: "/admin/wallets",
    icon: HiCurrencyDollar,
    badge: null,
  },
  {
    title: "Giao dịch hệ thống",
    href: "/admin/transactions",
    icon: HiCurrencyDollar,
    badge: null,
  },
  {
    title: "Giảm giá",
    href: "/admin/discounts",
    icon: HiTag,
    badge: null,
  },
  {
    title: "Hoàn tiền",
    href: "/admin/refunds",
    icon: HiArrowDown,
    badge: null,
  },
  {
    title: "Rút tiền",
    href: "/admin/withdraws",
    icon: HiArrowUp,
    badge: null,
  },
  {
    title: "Cài đặt",
    href: "/admin/settings",
    icon: HiCog,
    badge: null,
  },
];

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const clearNotifications = useRealtimeNotiStore((s) => s.clearAll);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu when clicking outside
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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="mobile-menu-button lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {isMobileMenuOpen ? <HiX size={20} /> : <HiMenu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          sidebar-container fixed top-0 left-0 h-full bg-white border-r border-gray-200
          transition-all duration-300 z-50 shadow-sm
          ${isCollapsed ? "w-16" : "w-64"}
          ${
            isMobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 h-16">
          {!isCollapsed && (
            <div className="flex items-center relative gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SN</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">StudyNest</h1>
                <p className="text-gray-500 text-xs">Bảng quản trị</p>
              </div>
              {isCollapsed && (
                <div className="w-8 h-8 absolute top-0 left-44 bg-green-600 rounded-lg flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-sm">SN</span>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isCollapsed ? (
              <HiChevronRight className="w-5 h-5 text-gray-500" />
            ) : (
              <HiChevronLeft className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2.5 rounded-lg transition-colors
                    ${
                      isActive
                        ? "bg-green-50 text-green-700 font-medium border-l-4 border-green-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={isCollapsed ? item.title : undefined}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? "text-green-600" : "text-gray-500"
                    }`}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="ml-3">{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div
            className={`
            flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer
            ${isCollapsed ? "justify-center" : ""}
          `}
            onClick={() => {
              if (!isCollapsed) {
                router.push("/admin/settings");
              }
            }}
          >
            {user?.avatar ? (
              <div className="relative flex-shrink-0">
                <img
                  src={getGoogleDriveImageUrl(user.avatar)}
                  alt={user.fullname || "User"}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {getUserInitials()}
                </span>
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-medium text-sm truncate">
                  {user?.fullname || "Quản trị viên"}
                </p>
                <p className="text-gray-500 text-xs truncate">
                  {user?.email || "admin@studynest.com"}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <HiLogout className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
