"use client";

import { Badge } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ChevronsDown } from "lucide-react";
import LogoHub from "./LogoHub";
import { usePathname, useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  HiAcademicCap,
  HiBell,
  HiBookOpen,
  HiHeart,
  HiHome,
  HiLightBulb,
  HiLogin,
  HiLogout,
  HiCloud,
  HiUser,
  HiUserAdd,
  HiViewGrid,
  HiX,
} from "react-icons/hi";

export interface LandingDynamicIslandProps {
  onExploreCourses?: () => void;
  onSelectGradeLevel?: (level: "primary" | "secondary" | "highschool") => void;
  onSkipVideo?: () => void;
}

const ISLAND_SIZE = 52;
const EXPANDED_WIDTH = 268;
const ISLAND_BORDER = 1;
const ISLAND_RADIUS = ISLAND_SIZE / 2;
const EXPANDED_INNER = EXPANDED_WIDTH - ISLAND_BORDER * 2;
const TRIGGER_SIZE = ISLAND_SIZE - ISLAND_BORDER * 2;

const getInitials = (fullname?: string | null): string => {
  if (!fullname) return "SN";
  const parts = fullname.trim().split(/\s+/);
  return parts
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const LandingDynamicIsland: React.FC<LandingDynamicIslandProps> = ({
  onExploreCourses,
  onSelectGradeLevel,
  onSkipVideo,
}) => {
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const clearNotifications = useRealtimeNotiStore((s) => s.clearAll);
  const unreadCount = useRealtimeNotiStore(
    (s) => s.buckets["USER"]?.unread ?? 0
  );

  const router = useRouter();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  const [isOpen, setIsOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isVideoInView, setIsVideoInView] = useState(true);

  // Tự động kiểm tra vị trí cuộn: chỉ hiển thị nút bỏ qua video khi đang ở trong vùng video
  useEffect(() => {
    if (!onSkipVideo) return;

    const checkScroll = () => {
      const contentEl = document.getElementById("home-main-content");
      if (contentEl) {
        const rect = contentEl.getBoundingClientRect();
        // Khi đỉnh của phần contentEl cách top của viewport <= 100px nghĩa là đã cuộn qua video
        setIsVideoInView(rect.top > 100);
      }
    };

    window.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();

    return () => window.removeEventListener("scroll", checkScroll);
  }, [onSkipVideo]);

  const islandRef = useRef<HTMLDivElement | null>(null);
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const measure = () => {
      const next = menu.offsetHeight;
      setContentHeight((prev) => (prev === next ? prev : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(menu);
    return () => observer.disconnect();
  }, []);

  const islandWidth = useSpring(ISLAND_SIZE, {
    stiffness: 420,
    damping: 36,
    mass: 0.72,
  });
  const islandHeight = useSpring(ISLAND_SIZE, {
    stiffness: 420,
    damping: 36,
    mass: 0.72,
  });
  const expandedOuter = Math.max(
    contentHeight + ISLAND_BORDER * 2,
    ISLAND_SIZE
  );

  useEffect(() => {
    const nextWidth = isOpen ? EXPANDED_WIDTH : ISLAND_SIZE;
    const nextHeight = isOpen ? expandedOuter : ISLAND_SIZE;
    if (prefersReducedMotion) {
      islandWidth.jump(nextWidth);
      islandHeight.jump(nextHeight);
      return;
    }
    islandWidth.set(nextWidth);
    islandHeight.set(nextHeight);
  }, [isOpen, expandedOuter, prefersReducedMotion, islandWidth, islandHeight]);

  const borderRadius = useTransform([islandWidth, islandHeight], ([w, h]) => {
    const widthValue = Number(w);
    const heightValue = Number(h);
    const pill = Math.min(widthValue, heightValue) / 2;
    const progress = Math.min(
      1,
      Math.max(0, (widthValue - ISLAND_SIZE) / (EXPANDED_WIDTH - ISLAND_SIZE))
    );
    const settled = progress ** 1.7;
    return pill + (ISLAND_RADIUS - pill) * settled;
  });

  // Reset avatar error state when user avatar changes
  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.avatar]);

  const closeIsland = useCallback((returnFocus = false) => {
    setIsOpen(false);
    if (returnFocus) {
      window.requestAnimationFrame(() => {
        triggerBtnRef.current?.focus();
      });
    }
  }, []);

  // Click-away & Escape dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (
        islandRef.current &&
        !islandRef.current.contains(e.target as Node)
      ) {
        closeIsland(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeIsland(true);
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside, {
      passive: true,
    });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeIsland]);

  // Focus first item when menu opens via keyboard
  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        firstMenuItemRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  const handleNavigate = useCallback(
    (path: string) => {
      closeIsland(false);
      router.push(path);
    },
    [closeIsland, router]
  );

  const handleScrollTop = useCallback(() => {
    closeIsland(false);
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/");
    }
  }, [closeIsland, pathname, router]);

  const handleExplore = useCallback(() => {
    closeIsland(false);
    if (onExploreCourses) {
      onExploreCourses();
    } else {
      router.push("/");
    }
  }, [closeIsland, onExploreCourses, router]);

  const handleGradeSelect = useCallback(
    (level: "primary" | "secondary" | "highschool") => {
      closeIsland(false);
      if (onSelectGradeLevel) {
        onSelectGradeLevel(level);
      } else {
        router.push("/");
      }
    },
    [closeIsland, onSelectGradeLevel, router]
  );

  const handleDashboardClick = useCallback(() => {
    if (user?.roles?.includes("LECTURER")) {
      handleNavigate("/lecturer");
    } else if (user?.roles?.includes("ADMIN")) {
      handleNavigate("/admin");
    } else {
      handleNavigate("/my-learning");
    }
  }, [user, handleNavigate]);

  const handleLogout = useCallback(async () => {
    closeIsland(false);
    try {
      await api.post("/auth/logout");
      clearUser();
      clearNotifications();
    } catch {
      // Preserve clean UX even if network logout call fails
      clearUser();
      clearNotifications();
    }
  }, [closeIsland, clearUser, clearNotifications]);

  const renderTriggerIdentity = (sizeClass = "w-9 h-9") => {
    if (user) {
      if (user.avatar && !avatarLoadError) {
        return (
          <div className="relative">
            <img
              src={getImageUrl(user.avatar)}
              alt={user.fullname || "Tài khoản Mây Mây"}
              className={`${sizeClass} rounded-full object-cover ring-2 ring-primary-pastel`}
              onError={() => setAvatarLoadError(true)}
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success-foreground border-2 border-surface"
              aria-hidden="true"
            />
          </div>
        );
      }
      return (
        <div className="relative">
          <span
            className={`${sizeClass} rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center ring-2 ring-primary-pastel`}
          >
            {getInitials(user.fullname)}
          </span>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success-foreground border-2 border-surface"
            aria-hidden="true"
          />
        </div>
      );
    }

    // Khách chưa đăng nhập: biểu tượng người dùng (logo thương hiệu đã nằm ở LogoHub góc trái)
    return (
      <div
        className={`${sizeClass} rounded-full bg-primary-light border border-primary-pastel/80 flex items-center justify-center text-primary`}
      >
        <HiUser className="w-5 h-5" />
      </div>
    );
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: -6,
      scale: 0.98,
      transition: { duration: prefersReducedMotion ? 0.01 : 0.08 },
    },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: prefersReducedMotion
        ? { duration: 0.01 }
        : {
            delay: index * 0.028,
            duration: 0.18,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          },
    }),
  };

  return (
    <>
    <LogoHub />
    <div
      style={{
        position: "fixed",
        top: "max(24px, env(safe-area-inset-top, 24px))",
        right: "max(24px, env(safe-area-inset-right, 24px))",
      }}
      className="z-50 select-none flex items-center gap-2.5"
    >
      {/* Nút Bỏ qua phần lướt video chuẩn Cloudy Blue (nằm ngay cạnh bên avatar ở góc trên bên phải) */}
      <AnimatePresence>
        {onSkipVideo && isVideoInView && !isOpen && (
          <motion.button
            type="button"
            onClick={onSkipVideo}
            initial={{ opacity: 0, scale: 0.88, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.88, x: 10 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.18 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="h-[46px] px-3 sm:px-4 rounded-full bg-surface/92 backdrop-blur-xl border border-primary-pastel/90 shadow-md hover:shadow-lg hover:border-primary ring-2 ring-primary-light/65 flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-all duration-150 cursor-pointer group"
            title="Bỏ qua phần lướt video để xem nội dung chính"
            aria-label="Bỏ qua phần lướt video xuống nội dung chính"
          >
            <ChevronsDown className="w-4 h-4 text-primary animate-bounce group-hover:translate-y-0.5 transition-transform shrink-0" />
            <span className="tracking-tight">Bỏ qua</span>
            <span className="hidden sm:inline tracking-tight">video</span>
          </motion.button>
        )}
      </AnimatePresence>

      <div ref={islandRef}>
        <motion.nav
          data-tour="island"
          aria-label="Điều hướng nhanh Mây Mây"
          style={{ width: islandWidth, height: islandHeight, borderRadius }}
          className={`relative overflow-hidden bg-surface/92 backdrop-blur-xl border box-border transition-colors duration-200 ${
            isOpen
              ? "border-primary-pastel shadow-xl ring-1 ring-white/80"
              : "border-primary-pastel/90 shadow-md hover:shadow-lg hover:border-primary ring-4 ring-primary-light/65"
          }`}
        >
        <motion.button
          ref={triggerBtnRef}
          type="button"
          aria-expanded={isOpen}
          aria-controls="studynest-dynamic-island-menu"
          aria-haspopup="true"
          aria-hidden={isOpen}
          tabIndex={isOpen ? -1 : 0}
          aria-label={
            user
              ? `Mở menu điều hướng của ${user.fullname || "bạn"}`
              : "Mở menu điều hướng Mây Mây"
          }
          onClick={() => setIsOpen(true)}
          initial={false}
          animate={{ opacity: isOpen ? 0 : 1 }}
          transition={{
            duration: prefersReducedMotion ? 0.01 : isOpen ? 0.1 : 0.16,
          }}
          style={{
            width: TRIGGER_SIZE,
            height: TRIGGER_SIZE,
            pointerEvents: isOpen ? "none" : "auto",
          }}
          className="absolute top-0 right-0 z-10 flex items-center justify-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
        >
          <div className="transition-transform duration-200 group-hover:scale-105">
            {renderTriggerIdentity("w-9 h-9")}
          </div>
        </motion.button>

        {/* Grows left and down from the top-right circle. Menu stays pinned to that corner so the clip reveals it instead of stretching the circle. */}
        <motion.div
          ref={menuRef}
          id="studynest-dynamic-island-menu"
          role="menu"
          inert={!isOpen}
          aria-hidden={!isOpen}
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{
            duration: prefersReducedMotion ? 0.01 : 0.16,
            delay: isOpen && !prefersReducedMotion ? 0.12 : 0,
          }}
          style={{ width: EXPANDED_INNER }}
          className={`absolute top-0 right-0 p-3.5 ${
            isOpen ? "" : "pointer-events-none"
          }`}
        >
              {/* Island Top Header: Brand or User Identity + Close Button */}
              <div className="flex items-center justify-between gap-2.5 pb-2.5 mb-2 border-b border-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  {renderTriggerIdentity("w-9 h-9")}
                  {user ? (
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {user.fullname || "Học viên Mây Mây"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {user.email || "Đang hoạt động"}
                      </p>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">
                        Chào bạn mới
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Đăng nhập để lưu tiến độ học
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => closeIsland(true)}
                  aria-label="Đóng menu điều hướng"
                  className="w-8 h-8 rounded-full bg-background hover:bg-primary-light text-muted-foreground hover:text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <HiX className="w-4 h-4" />
                </button>
              </div>

              {/* Section 1: Landing & Grade Worlds */}
              <div className="space-y-0.5">
                <motion.button
                  ref={firstMenuItemRef}
                  custom={0}
                  variants={itemVariants}
                  initial={false}
                  animate={isOpen ? "visible" : "hidden"}
                  type="button"
                  role="menuitem"
                  onClick={handleScrollTop}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-primary-light/80 hover:text-primary transition-colors text-left cursor-pointer"
                >
                  <HiHome className="w-4 h-4 text-primary shrink-0" />
                  <span>Trang chủ</span>
                </motion.button>

                <motion.button
                  custom={1}
                  variants={itemVariants}
                  initial={false}
                  animate={isOpen ? "visible" : "hidden"}
                  type="button"
                  role="menuitem"
                  onClick={handleExplore}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-primary-light/80 hover:text-primary transition-colors text-left cursor-pointer"
                >
                  <HiBookOpen className="w-4 h-4 text-primary shrink-0" />
                  <span>Khám phá khóa học</span>
                </motion.button>

                <div className="pt-1.5 pb-1 px-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-subtle-foreground">
                    Cấp học phổ thông
                  </span>
                </div>

                <motion.button
                  custom={2}
                  variants={itemVariants}
                  initial={false}
                  animate={isOpen ? "visible" : "hidden"}
                  type="button"
                  role="menuitem"
                  onClick={() => handleGradeSelect("primary")}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-accent-vanilla/55 transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HiCloud className="w-4 h-4 text-warning-foreground shrink-0" />
                    <span>Tiểu học</span>
                  </span>
                  <Badge variant="vanilla" size="sm">
                    Lớp 1–5
                  </Badge>
                </motion.button>

                <motion.button
                  custom={3}
                  variants={itemVariants}
                  initial={false}
                  animate={isOpen ? "visible" : "hidden"}
                  type="button"
                  role="menuitem"
                  onClick={() => handleGradeSelect("secondary")}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary-light/65 transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HiLightBulb className="w-4 h-4 text-secondary-foreground shrink-0" />
                    <span>THCS</span>
                  </span>
                  <Badge variant="secondary" size="sm">
                    Lớp 6–9
                  </Badge>
                </motion.button>

                <motion.button
                  custom={4}
                  variants={itemVariants}
                  initial={false}
                  animate={isOpen ? "visible" : "hidden"}
                  type="button"
                  role="menuitem"
                  onClick={() => handleGradeSelect("highschool")}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-primary-light/80 transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HiAcademicCap className="w-4 h-4 text-primary shrink-0" />
                    <span>THPT</span>
                  </span>
                  <Badge variant="default" size="sm">
                    Lớp 10–12
                  </Badge>
                </motion.button>
              </div>

              {/* Divider */}
              <div className="my-2 border-t border-border" />

              {/* Section 2: Authentication-Aware Account Controls */}
              {user ? (
                <div className="space-y-0.5">
                  <motion.button
                    custom={5}
                    variants={itemVariants}
                    initial={false}
                    animate={isOpen ? "visible" : "hidden"}
                    type="button"
                    role="menuitem"
                    onClick={handleDashboardClick}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-primary-light/80 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <HiViewGrid className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      {user.roles?.includes("LECTURER")
                        ? "Bảng điều khiển Giảng viên"
                        : "Học tập của tôi"}
                    </span>
                  </motion.button>

                  {user.roles?.includes("LECTURER") && (
                    <motion.button
                      custom={6}
                      variants={itemVariants}
                      initial={false}
                      animate={isOpen ? "visible" : "hidden"}
                      type="button"
                      role="menuitem"
                      onClick={() => handleNavigate("/my-learning")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-primary-light/80 hover:text-primary transition-colors text-left cursor-pointer"
                    >
                      <HiBookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>Khóa học đang học</span>
                    </motion.button>
                  )}

                  <motion.button
                    custom={7}
                    variants={itemVariants}
                    initial={false}
                    animate={isOpen ? "visible" : "hidden"}
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate("/favorites")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-primary-light/80 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <HiHeart className="w-4 h-4 text-secondary-foreground shrink-0" />
                    <span>Khóa học yêu thích</span>
                  </motion.button>

                  <motion.button
                    custom={8}
                    variants={itemVariants}
                    initial={false}
                    animate={isOpen ? "visible" : "hidden"}
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      handleNavigate(
                        user.roles?.includes("LECTURER") ? "/lecturer" : "/welcome"
                      )
                    }
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-primary-light/80 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <HiAcademicCap className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      {user.roles?.includes("LECTURER")
                        ? "Khu vực giảng viên"
                        : "Trở thành giảng viên"}
                    </span>
                  </motion.button>

                  <motion.button
                    custom={8}
                    variants={itemVariants}
                    initial={false}
                    animate={isOpen ? "visible" : "hidden"}
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate("/notifications")}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-primary-light/80 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <HiBell className="w-4 h-4 text-primary shrink-0" />
                      <span>Thông báo</span>
                    </span>
                    {unreadCount > 0 && (
                      <Badge variant="default" size="sm">
                        {unreadCount}
                      </Badge>
                    )}
                  </motion.button>

                  <motion.button
                    custom={9}
                    variants={itemVariants}
                    initial={false}
                    animate={isOpen ? "visible" : "hidden"}
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate("/profile")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-primary-light/80 hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    <HiUser className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Hồ sơ cá nhân</span>
                  </motion.button>

                  <div className="pt-1 mt-1 border-t border-border/70">
                    <motion.button
                      custom={10}
                      variants={itemVariants}
                      initial={false}
                      animate={isOpen ? "visible" : "hidden"}
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-destructive-foreground hover:bg-destructive-bg/70 transition-colors text-left cursor-pointer"
                    >
                      <HiLogout className="w-4 h-4 shrink-0" />
                      <span>Đăng xuất</span>
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <motion.button
                    custom={5}
                    variants={itemVariants}
                    initial={false}
                    animate={isOpen ? "visible" : "hidden"}
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate("/login")}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-primary-pastel bg-background hover:bg-primary-light text-primary text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                  >
                    <HiLogin className="w-4 h-4 shrink-0" />
                    <span>Đăng nhập</span>
                  </motion.button>

                  <motion.button
                    custom={6}
                    variants={itemVariants}
                    initial={false}
                    animate={isOpen ? "visible" : "hidden"}
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate("/register")}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
                  >
                    <HiUserAdd className="w-4 h-4 shrink-0" />
                    <span>Đăng ký</span>
                  </motion.button>
                </div>
              )}
        </motion.div>
      </motion.nav>
      </div>
    </div>
    </>
  );
};

export default LandingDynamicIsland;
