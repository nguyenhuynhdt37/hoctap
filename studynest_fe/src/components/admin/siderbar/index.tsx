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
      await api.post("/auth/logout");
      clearUser();
      clearNotifications();
      router.push("/login");
    } catch {
      // Suppress console error
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
        className="mobile-menu-button lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white shadow-xs border border-[#E7EEF7] hover:bg-[#F6FAFF] transition-colors text-[#3D4A5A]"
      >
        {isMobileMenuOpen ? <HiX size={20} /> : <HiMenu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-[#3D4A5A]/30 backdrop-blur-2xs z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          sidebar-container fixed top-0 left-0 h-full bg-white border-r border-[#E7EEF7]
          transition-all duration-200 z-50 shadow-2xs flex flex-col
          ${isCollapsed ? "w-16" : "w-64"}
          ${
            isMobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#E7EEF7] h-16">
          {!isCollapsed && (
            <div className="flex items-center relative gap-3">
              <div className="w-8 h-8 bg-[#356FA7] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xs">SN</span>
              </div>
              <div>
                <h1 className="font-bold text-base text-[#3D4A5A] leading-tight">
                  StudyNest
                </h1>
                <p className="text-[#8190A3] text-xs">Bảng quản trị</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="hidden lg:block p-2 rounded-xl hover:bg-[#F6FAFF] transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <HiChevronRight className="w-5 h-5 text-[#6F7C8C]" />
            ) : (
              <HiChevronLeft className="w-5 h-5 text-[#6F7C8C]" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-2.5 space-y-1">
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
                    flex items-center px-3 py-2.5 rounded-xl text-sm transition-colors
                    ${
                      isActive
                        ? "bg-[#E8F2FA] text-[#356FA7] font-semibold"
                        : "text-[#6F7C8C] hover:text-[#3D4A5A] hover:bg-[#F6FAFF]"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={isCollapsed ? item.title : undefined}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? "text-[#356FA7]" : "text-[#6F7C8C]"
                    }`}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="ml-3">{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto bg-[#356FA7] text-white text-xs px-2 py-0.5 rounded-full">
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
        <div className="p-3 border-t border-[#E7EEF7]">
          <div
            className={`
            flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F6FAFF] transition-colors cursor-pointer
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
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[#E8F2FA]"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#276749] rounded-full border-2 border-white" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-[#E8F2FA] text-[#356FA7] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-semibold text-xs">
                  {getUserInitials()}
                </span>
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[#3D4A5A] font-semibold text-sm truncate">
                  {user?.fullname || "Quản trị viên"}
                </p>
                <p className="text-[#8190A3] text-xs truncate">
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
                className="p-1.5 rounded-lg hover:bg-[#FCE8E8] text-[#6F7C8C] hover:text-[#A23C46] transition-colors cursor-pointer"
                aria-label="Đăng xuất"
              >
                <HiLogout className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
