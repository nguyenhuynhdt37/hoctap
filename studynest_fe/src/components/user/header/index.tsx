"use client";

/**
 * "Đảo mây" — header của khu vực người dùng.
 *
 * Khi đứng yên: một viên mây nổi tách khỏi mép trên (logo, vài lối chính, chip
 * dữ liệu sống, chuông, avatar). Khi bấm "Bản đồ" hoặc nút tìm kiếm, viên mây
 * nở ra thành "bản đồ bầu trời" chia nhóm (xem `sky-panel.tsx`). Trên điện
 * thoại cùng bảng đó trở thành tấm menu toàn màn hình.
 * Mọi lối đi đọc từ `@/lib/navigation/user-nav`.
 */

import { EmblemIcon, FramedAvatar, TitleBadge } from "@/components/learning-hub/shop/item-art";
import { useLearnerEquipment } from "@/lib/learning-hub/shop-hooks";
import { coinCopy } from "@/lib/learning-hub/shop-logic";
import { cn } from "@/lib/utils";
import { logoutEverywhere } from "@/lib/auth/logout";
import { useHubAuthStatus } from "@/lib/learning-hub/hooks";
import { HOME_HREF, PRIMARY_LINKS, isCurrentPage, isInSection, type Viewer } from "@/lib/navigation/user-nav";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import type { User } from "@/types/user/user";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, LayoutGrid, Search, X } from "pulsoicon-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { CoinChip, StreakChip, WalletChip } from "./live-stats";
import { NotificationButton } from "./notification";
import { SkyPanel } from "./sky-panel";
import { useFocusTrap } from "./use-focus-trap";

type PanelMode = null | "map" | "search";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

function AccountAvatar({ user, pathname }: { user: User; pathname: string }) {
  const equipment = useLearnerEquipment();
  const labels = [equipment?.title?.name, equipment?.emblem?.name].flatMap((name) => name ? [coinCopy(name)] : []);
  return (
    <Link href="/profile" aria-label={[`Hồ sơ của ${user.fullname || "bạn"}`, ...labels].join(", ")}
      aria-current={pathname === "/profile" ? "page" : undefined}
      className={cn("flex min-h-11 shrink-0 items-center gap-1.5 rounded-full", focusRing, "aria-[current=page]:ring-2 aria-[current=page]:ring-primary")}>
      <TitleBadge item={equipment?.title} className="hidden max-w-28 lg:inline-flex [&>span]:truncate [&>span]:whitespace-nowrap" />
      <span className="relative inline-grid place-items-center">
        <FramedAvatar src={user.avatar} name={user.fullname} equipment={equipment} className="text-xs" />
        <EmblemIcon item={equipment?.emblem} decorative className="absolute right-0 bottom-0 size-[1.0625rem] rounded-full ring-1 ring-surface" />
      </span>
    </Link>
  );
}

function SkyIsland({ pathname }: { pathname: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const clearNotifications = useRealtimeNotiStore((state) => state.clearAll);
  const unread = useRealtimeNotiStore((state) => state.buckets.USER?.unread ?? 0);
  const authStatus = useHubAuthStatus();

  const [mode, setMode] = useState<PanelMode>(null);
  const [keyword, setKeyword] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const open = mode !== null;

  const islandRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const panelId = useId();

  const viewer: Viewer = useMemo(
    () => ({
      signedIn: Boolean(user),
      isLecturer: Boolean(user?.roles?.includes("LECTURER")),
      isAdmin: Boolean(user?.roles?.includes("ADMIN")),
    }),
    [user],
  );
  // Chưa biết khách hay thành viên: không hiện nút đăng nhập/ví nhấp nháy sai trạng thái.
  const authPending = !user && authStatus === "pending";

  const close = useCallback((restoreFocus: boolean) => {
    setMode(null);
    if (restoreFocus) {
      const opener = openerRef.current;
      window.requestAnimationFrame(() => opener?.focus());
    }
  }, []);

  const toggle = (next: Exclude<PanelMode, null>, element: HTMLElement) => {
    if (mode === next) {
      close(true);
      return;
    }
    openerRef.current = element;
    setMode(next);
  };

  useEffect(() => setMode(null), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      close(true);
    };
    document.addEventListener("keydown", onKeyDown);

    // Khi bản đồ mở toàn màn hình: khóa cuộn nền trên mọi kích thước màn hình.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  useFocusTrap(panelRef, open);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = keyword.trim();
    close(false);
    router.push(value ? `/courses?keyword=${encodeURIComponent(value)}` : "/courses");
    setKeyword("");
  };

  const handleLogout = async () => {
    close(false);
    try {
      await logoutEverywhere();
    } finally {
      clearUser();
      clearNotifications();
    }
  };

  const links = viewer.signedIn ? PRIMARY_LINKS.filter((link) => link.href !== "/help") : PRIMARY_LINKS;
  const dashboard = viewer.isLecturer
    ? { href: "/lecturer", label: "Giảng viên" }
    : viewer.isAdmin
      ? { href: "/admin", label: "Quản trị" }
      : null;

  const pillLink =
    "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-primary-light hover:text-primary aria-[current=page]:bg-primary-light aria-[current=page]:font-semibold aria-[current=page]:text-primary motion-reduce:transition-none";

  return (
    <>
      {open && (
        <div aria-hidden="true" onClick={() => close(true)} className="pointer-events-auto fixed inset-0 -z-10 bg-foreground/25 backdrop-blur-[2px]" />
      )}
      <div
        ref={islandRef}
        className={cn(
          "pointer-events-auto isolate flex flex-col transition-[box-shadow,background-color] duration-300 ease-out motion-reduce:transition-none",
          open
            ? "fixed inset-0 z-50 h-dvh w-screen max-w-none rounded-none border-0 bg-surface/95 shadow-none"
            : cn(
                "relative mx-auto w-full max-w-none rounded-[28px] border border-primary-pastel/70 bg-surface/85",
                scrolled ? "shadow-lg" : "shadow-md",
              ),
        )}
      >
        <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-[inherit] backdrop-blur-md" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-clip rounded-[inherit]">
          <span className="absolute -top-8 left-10 size-40 rounded-full bg-primary-light/80 blur-3xl" />
          <span className="absolute -right-6 -bottom-10 size-48 rounded-full bg-secondary/70 blur-3xl" />
        </span>

        <div
          className={cn(
            "flex shrink-0 items-center gap-1 md:gap-1.5",
            open ? "h-16 border-b border-border/70 px-3 sm:px-5 lg:px-8" : "h-14 px-2 md:px-3",
          )}
        >
          <Link
            href={HOME_HREF}
            aria-label="Mây Mây, về trang chủ"
            className={cn("group flex min-h-11 shrink-0 items-center gap-1.5 rounded-full pr-2", focusRing)}
          >
            <img
              src="/logo/maymay-mark.svg"
              alt=""
              aria-hidden="true"
              className="size-10 shrink-0 transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:transform-none"
            />
            <span className="whitespace-nowrap text-base font-semibold text-foreground sm:text-lg">Mây Mây</span>
          </Link>

          <nav aria-label="Điều hướng chính" className="ml-2 hidden items-center gap-0.5 xl:flex">
            {links.map((link) => {
              const sections = link.href === "/combo" ? ["/combo", "/learning-paths"] : [link.href];
              const current = isCurrentPage(pathname, link.href);
              const inSection = !current && sections.some((href) => isCurrentPage(pathname, href) || isInSection(pathname, href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(pillLink, focusRing, inSection && "font-semibold text-primary")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="min-w-2 flex-1" />

          {authPending ? (
            <span aria-hidden="true" className="h-10 w-28 animate-pulse rounded-full bg-primary-light motion-reduce:animate-none" />
          ) : viewer.signedIn && user ? (
            <>
              {dashboard && (
                <Link href={dashboard.href} className={cn(pillLink, focusRing, "hidden border border-accent-border bg-accent text-accent-foreground hover:bg-accent-border/70 hover:text-accent-foreground xl:inline-flex")}>
                  <LayoutGrid aria-hidden="true" className="mr-1.5 size-4" />
                  {dashboard.label}
                </Link>
              )}
              <span className="max-[360px]:hidden"><StreakChip /></span>
              <CoinChip />
              <span className="hidden md:contents">
                <WalletChip />
                <NotificationButton role="USER" />
              </span>
              <AccountAvatar user={user} pathname={pathname} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                aria-current={pathname === "/login" ? "page" : undefined}
                className={cn(pillLink, focusRing, "font-semibold text-primary")}
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                aria-current={pathname === "/register" ? "page" : undefined}
                className={cn(
                  "hidden min-h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover sm:inline-flex motion-reduce:transition-none",
                  focusRing,
                )}
              >
                Đăng ký
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={(event) => toggle("search", event.currentTarget)}
            aria-label="Tìm khóa học"
            aria-expanded={mode === "search"}
            aria-controls={mode === "search" ? panelId : undefined}
            className={cn(
              "hidden size-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-light aria-expanded:bg-primary-light md:inline-flex motion-reduce:transition-none",
              focusRing,
            )}
          >
            <Search aria-hidden="true" className="size-5" />
          </button>

          <button
            type="button"
            disabled={authPending}
            onClick={(event) => toggle("map", event.currentTarget)}
            aria-label={open ? "Thu bảng tiện ích" : unread > 0 && viewer.signedIn ? `Mở bảng tiện ích, ${unread} thông báo chưa đọc` : "Mở bảng tiện ích"}
            aria-expanded={mode === "map"}
            aria-controls={mode === "map" ? panelId : undefined}
            aria-haspopup="dialog"
            className={cn(
              "relative inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:bg-disabled disabled:text-disabled-foreground md:h-10 md:px-4 motion-reduce:transition-none",
              focusRing,
            )}
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <LayoutGrid aria-hidden="true" className="size-5" />}
            <span className="hidden md:inline">Tiện ích</span>
            <ChevronDown
              aria-hidden="true"
              className={cn("hidden size-3.5 transition-transform duration-300 md:block motion-reduce:transition-none", mode === "map" && "rotate-180")}
            />
            {!open && viewer.signedIn && unread > 0 && (
              <span aria-hidden="true" className="absolute -top-1 -right-1 min-w-5 rounded-full border-2 border-surface bg-secondary-foreground px-1 py-0.5 text-center text-[10px] leading-none font-semibold tabular-nums text-primary-foreground md:hidden">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && !authPending && (
            <motion.div
              key="sky-panel"
              className="flex min-h-0 flex-1 flex-col"
              initial={reduceMotion ? false : { clipPath: "inset(0px 0px 100% 0px)", opacity: 0.5 }}
              animate={{ clipPath: "inset(0px 0px 0% 0px)", opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <SkyPanel
                id={panelId}
                panelRef={panelRef}
                viewer={viewer}
                user={user}
                pathname={pathname}
                unread={unread}
                focusSearch={mode === "search"}
                keyword={keyword}
                onKeyword={setKeyword}
                onSearch={handleSearch}
                onNavigate={() => close(false)}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

const Header = () => {
  const pathname = usePathname();
  const user = useUserStore((state) => state.user);
  const authStatus = useHubAuthStatus();

  // Trang chủ của khách có thanh điều hướng riêng (CloudArcNav).
  if (pathname === "/" && (authStatus !== "ready" || !user)) return null;

  return (
    <header className="pointer-events-none sticky top-0 z-40 h-[72px] px-3 pt-2 font-sans sm:px-5 lg:px-8">
      <SkyIsland pathname={pathname} />
    </header>
  );
};

export default Header;
