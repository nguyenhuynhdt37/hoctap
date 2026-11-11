"use client";

import { useUserStore } from "@/stores/user";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiAcademicCap,
  HiBookOpen,
  HiChat,
  HiHome,
  HiQuestionMarkCircle,
  HiSearch,
  HiUserGroup,
} from "react-icons/hi";

const RING_RADIUS = 24;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

interface HubShortcut {
  label: string;
  href: string;
  icon: React.ReactNode;
}

/**
 * Logo Mây Mây góc trái: một "hub" đa năng.
 * - Vòng tròn quanh logo thể hiện tiến độ cuộn trang.
 * - Bấm logo để mở bảng tìm kiếm nhanh + lối tắt; bấm "Trang chủ" để về đầu trang.
 */
const LogoHub = () => {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [progress, setProgress] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [isOpen]);

  const goTo = useCallback(
    (href: string) => {
      setIsOpen(false);
      if (href === "/" && pathname === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(href);
    },
    [pathname, router]
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const value = keyword.trim();
      goTo(value ? `/courses?keyword=${encodeURIComponent(value)}` : "/courses");
      setKeyword("");
    },
    [keyword, goTo]
  );

  const shortcuts: HubShortcut[] = [
    { label: "Trang chủ", href: "/", icon: <HiHome className="h-4 w-4" /> },
    { label: "Khóa học", href: "/courses", icon: <HiBookOpen className="h-4 w-4" /> },
    { label: "Lộ trình", href: "/lo-trinh", icon: <HiAcademicCap className="h-4 w-4" /> },
    { label: "Giảng viên", href: "/instructors", icon: <HiUserGroup className="h-4 w-4" /> },
    ...(user
      ? [{ label: "Hỏi Mây Mây AI", href: "/chat-sql", icon: <HiChat className="h-4 w-4" /> }]
      : []),
    { label: "Trợ giúp", href: "/help", icon: <HiQuestionMarkCircle className="h-4 w-4" /> },
  ];

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        top: "max(24px, env(safe-area-inset-top, 24px))",
        left: "max(24px, env(safe-area-inset-left, 24px))",
      }}
      className="z-50 select-none"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Mây Mây - mở tìm kiếm và lối tắt"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex h-[52px] w-[52px] items-center justify-center rounded-full border border-primary-pastel/90 bg-surface/92 shadow-md ring-4 ring-primary-light/65 backdrop-blur-xl transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-primary cursor-pointer"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 52 52"
          aria-hidden="true"
        >
          <circle
            cx="26"
            cy="26"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2"
            className="stroke-primary"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
          />
        </svg>
        <img
          src="/logo/studynest-logo.svg"
          alt=""
          width={26}
          height={26}
          className="h-[26px] w-[26px] object-contain transition-transform duration-200 group-hover:scale-110"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.18 }}
            className="absolute left-0 top-[60px] w-[280px] origin-top-left rounded-[26px] border border-primary-pastel bg-surface/95 p-3.5 shadow-xl ring-1 ring-white/80 backdrop-blur-xl"
          >
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="text-sm font-bold tracking-tight text-foreground">
                Mây <span className="text-primary">Mây</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lớp 1 – Lớp 12
              </span>
            </div>

            <form onSubmit={handleSearch} role="search" className="relative mb-2.5">
              <HiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm khóa học, môn học..."
                aria-label="Tìm kiếm khóa học"
                className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-subtle-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </form>

            <div className="space-y-0.5">
              {shortcuts.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  role="menuitem"
                  onClick={() => goTo(item.href)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-primary-light/80 hover:text-primary cursor-pointer"
                >
                  <span className="text-primary">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="sr-only"
            >
              Về trang chủ Mây Mây
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogoHub;
