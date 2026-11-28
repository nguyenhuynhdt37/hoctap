"use client";

import { EmblemIcon, FramedAvatar } from "@/components/learning-hub/shop/item-art";
import { Button } from "@/components/ui";
import { logoutEverywhere } from "@/lib/auth/logout";
import { useHubAuthStatus } from "@/lib/learning-hub/hooks";
import { useLearnerEquipment } from "@/lib/learning-hub/shop-hooks";
import { coinCopy } from "@/lib/learning-hub/shop-logic";
import { HOME_HREF, PRIMARY_LINKS, isCurrentPage, isInSection, type Viewer } from "@/lib/navigation/user-nav";
import { cn } from "@/lib/utils";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import type { User } from "@/types/user/user";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Search } from "pulsoicon-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { SkyPanel } from "./compact-panel";
import { NotificationButton } from "./notification";
import { useFocusTrap } from "./use-focus-trap";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const navLink = "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-xl px-3 text-sm font-medium text-foreground hover:bg-primary-light hover:text-primary aria-[current=page]:bg-primary-light aria-[current=page]:font-semibold aria-[current=page]:text-primary";

function AccountAvatar({ user, pathname }: { user: User; pathname: string }) {
  const equipment = useLearnerEquipment();
  const labels = [equipment?.title?.name, equipment?.emblem?.name].flatMap((name) => name ? [coinCopy(name)] : []);
  return (
    <Link
      href="/profile"
      aria-label={[`Hồ sơ của ${user.fullname || "bạn"}`, ...labels].join(", ")}
      aria-current={pathname === "/profile" ? "page" : undefined}
      className={cn("relative inline-grid min-h-10 shrink-0 place-items-center rounded-full aria-[current=page]:ring-2 aria-[current=page]:ring-primary", focusRing)}
    >
      <FramedAvatar src={user.avatar} name={user.fullname} equipment={equipment} className="text-xs" />
      <EmblemIcon item={equipment?.emblem} decorative className="absolute right-0 bottom-0 size-4 rounded-full ring-1 ring-surface" />
    </Link>
  );
}

function UserHeader({ pathname }: { pathname: string }) {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const clearNotifications = useRealtimeNotiStore((state) => state.clearAll);
  const unread = useRealtimeNotiStore((state) => state.buckets.USER?.unread ?? 0);
  const authStatus = useHubAuthStatus();
  const panelId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"map" | "search" | null>(null);
  const [keyword, setKeyword] = useState("");

  useEffect(() => setMode(null), [pathname]);

  useFocusTrap(drawerRef, Boolean(mode));

  // Đóng sidebar bằng phím Escape & khóa cuộn nền khi đang mở
  useEffect(() => {
    if (!mode) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMode(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mode]);

  const viewer: Viewer = {
    signedIn: Boolean(user),
    isLecturer: Boolean(user?.roles?.includes("LECTURER")),
    isAdmin: Boolean(user?.roles?.includes("ADMIN")),
  };
  const authPending = !user && authStatus === "pending";
  const links = viewer.signedIn ? PRIMARY_LINKS.filter((link) => link.href !== "/help") : PRIMARY_LINKS;
  const close = () => setMode(null);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = keyword.trim();
    close();
    router.push(value ? `/courses?keyword=${encodeURIComponent(value)}` : "/courses");
    setKeyword("");
  };

  const handleLogout = async () => {
    close();
    try {
      await logoutEverywhere();
    } finally {
      clearUser();
      clearNotifications();
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-surface">
      <div className="user-container flex h-full items-center gap-1 sm:gap-2">
        <Link
          href={HOME_HREF}
          aria-label="Mây Mây, về trang chủ"
          className={cn("flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl sm:pr-2", focusRing)}
        >
          <img src="/logo/maymay-mark.svg" alt="" className="size-8 sm:size-9" />
          <span className="whitespace-nowrap font-semibold text-foreground">Mây Mây</span>
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden items-center xl:flex">
          {links.map((link) => {
            const current = isCurrentPage(pathname, link.href);
            const inSection = isInSection(pathname, link.href) ||
              (link.href === "/combo" && pathname.startsWith("/learning-paths")) ||
              (link.href === "/courses" && (pathname.startsWith("/course/") || pathname.startsWith("/categories/")));
            return (
              <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined} className={cn(navLink, focusRing, inSection && "font-semibold text-primary")}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tìm khóa học"
            aria-haspopup="dialog"
            aria-expanded={mode === "search"}
            aria-controls={mode === "search" ? panelId : undefined}
            className={cn(!user && "max-[359px]:hidden")}
            disabled={authPending}
            onClick={() => setMode("search")}
          >
            <Search aria-hidden="true" className="size-5" />
          </Button>
          {user ? (
            <>
              <span className="hidden sm:contents"><NotificationButton role="USER" /></span>
              <AccountAvatar user={user} pathname={pathname} />
            </>
          ) : !authPending && (
            <>
              <Link href="/login" className={cn(navLink, focusRing, "px-1.5 font-semibold text-primary sm:px-3")}>Đăng nhập</Link>
              <Link href="/register" className={cn("hidden min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover sm:inline-flex", focusRing)}>Đăng ký</Link>
            </>
          )}
          <Button
            variant="pastel"
            aria-label={unread > 0 && user ? `Mở bảng tiện ích, ${unread} thông báo chưa đọc` : "Mở bảng tiện ích"}
            aria-haspopup="dialog"
            aria-expanded={mode === "map"}
            aria-controls={mode === "map" ? panelId : undefined}
            disabled={authPending}
            onClick={() => setMode("map")}
            className="relative size-10 shrink-0 px-0 md:w-auto md:px-3"
          >
            <LayoutGrid aria-hidden="true" className="size-5 shrink-0" />
            <span className="hidden md:inline">Tiện ích</span>
            {user && unread > 0 && <span aria-hidden="true" className="absolute top-1 right-1 size-2 rounded-full bg-primary sm:hidden" />}
          </Button>
        </div>
      </div>

      {mode && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop mờ nhẹ giống Lecturer Shell */}
          <button
            type="button"
            aria-label="Đóng bảng tiện ích"
            onClick={close}
            className="fixed inset-0 bg-foreground/25 backdrop-blur-xs transition-opacity"
          />

          {/* Cloudy Sky Dynamic Sidebar Drawer */}
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Tiện ích"
            tabIndex={-1}
            className="relative z-10 flex h-dvh w-full max-w-[21rem] flex-col overflow-hidden border-l border-primary-pastel/75 bg-gradient-to-b from-primary-light/80 via-surface/95 to-secondary-light/45 text-foreground shadow-2xl sm:w-[21.5rem] animate-in slide-in-from-right duration-200 motion-reduce:animate-none"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-primary-pastel/50 blur-2xl"
            />
            <SkyPanel
              id={panelId}
              viewer={viewer}
              pathname={pathname}
              unread={unread}
              focusSearch={mode === "search"}
              keyword={keyword}
              userName={user?.fullname}
              onKeyword={setKeyword}
              onSearch={handleSearch}
              onNavigate={close}
              onLogout={handleLogout}
            />
          </aside>
        </div>,
        document.body,
      )}
    </header>
  );
}

export default function FlatHeader() {
  const pathname = usePathname();
  return <UserHeader pathname={pathname} />;
}
