"use client";

import { EmblemIcon, FramedAvatar } from "@/components/learning-hub/shop/item-art";
import { Button, Modal } from "@/components/ui";
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
import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { NotificationButton } from "./notification";
import { SkyPanel } from "./sky-panel";

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
  const [mode, setMode] = useState<"map" | "search" | null>(null);
  const [keyword, setKeyword] = useState("");

  useEffect(() => setMode(null), [pathname]);

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
    <header className="pointer-events-none sticky top-0 z-40 pt-2">
      <div className="user-container">
        <div className="pointer-events-auto flex min-h-[3.5rem] items-center gap-1 rounded-2xl border border-border bg-surface/95 px-2 shadow-sm backdrop-blur-md sm:gap-2 sm:px-3">
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
      </div>

      {mode && createPortal(
        <Modal open onClose={close} size="xl" title="Tiện ích" className="max-h-[85dvh]" bodyClassName="overscroll-contain p-3.5 sm:p-5">
          <SkyPanel
            id={panelId}
            viewer={viewer}
            pathname={pathname}
            unread={unread}
            focusSearch={mode === "search"}
            keyword={keyword}
            onKeyword={setKeyword}
            onSearch={handleSearch}
            onNavigate={close}
            onLogout={handleLogout}
          />
        </Modal>,
        document.body,
      )}
    </header>
  );
}

export default function Header() {
  const pathname = usePathname();
  return <UserHeader pathname={pathname} />;
}
