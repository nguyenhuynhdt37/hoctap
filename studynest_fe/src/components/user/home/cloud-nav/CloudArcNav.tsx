"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { logoutEverywhere } from "@/lib/auth/logout";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  CircleHelp,
  Cloud,
  GraduationCap,
  Heart,
  House,
  LayoutGrid,
  Lightbulb,
  LogIn,
  LogOut,
  Map,
  Search,
  UserRound,
  UserRoundPlus,
  UsersRound,
  X,
  type PulsoIcon,
} from "pulsoicon-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type RefObject,
} from "react";
import {
  CloudBlob,
  GlassCard,
  IconBubble,
  Pill,
  Reveal,
  TONE,
  type Tone,
} from "../landing-ui";
import { LEVELS, type LevelId } from "../three-hero/contract";
import { useReducedMotionPreference } from "../three-hero/useHeroQuality";
import {
  ACCOUNT_ARC,
  ARC_VIEWPORT,
  GUEST_ARC,
  HOME_SLOT,
  INNER_ARC,
  MEMBER_ARC,
  SKIP_SLOT,
  TOOLS_SLOT,
  TRIGGER_CENTER,
  arcPath,
  arcPoint,
  arcSlot,
} from "./arc-layout";
import { scrollToCloudLevel, useHeroJourney } from "./use-hero-journey";

const GRADE_CATALOG_PATH = {
  primary: "/courses?level=tieu-hoc",
  secondary: "/courses?level=thcs",
  highschool: "/courses?level=thpt",
} as const;

const GRADE_LINKS = {
  primary: { href: GRADE_CATALOG_PATH.primary, icon: Cloud, tone: "vanilla" },
  middle: { href: GRADE_CATALOG_PATH.secondary, icon: Lightbulb, tone: "pink" },
  high: { href: GRADE_CATALOG_PATH.highschool, icon: GraduationCap, tone: "lavender" },
} satisfies Record<LevelId, { href: string; icon: PulsoIcon; tone: Tone }>;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const LEFT_EDGE = "left-[max(1rem,env(safe-area-inset-left))]";
const TOP_EDGE = "top-[max(1rem,env(safe-area-inset-top))]";
const RING_RADIUS = 24;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const SPRING = { type: "spring", stiffness: 310, damping: 28, mass: 0.75 } as const;
const FADE = { duration: 0.16 };
const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled])";

type NavItem = {
  id: string;
  label: string;
  icon: PulsoIcon;
  tone?: Tone;
  meta?: string;
  unread?: number;
} & ({ href: string; action?: never } | { href?: never; action: () => void });

type CardSlot = typeof HOME_SLOT | ReturnType<typeof arcSlot>;

function subscribeToArcViewport(update: () => void) {
  const query = window.matchMedia(ARC_VIEWPORT);
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
}

function getArcViewport() {
  return window.matchMedia(ARC_VIEWPORT).matches;
}

function ArcTrails({ orbit }: { orbit: typeof ACCOUNT_ARC }) {
  const outerStart = orbit.cards[0][0] - 3;
  const outerEnd = orbit.cards[orbit.cards.length - 1][0] + 4;

  return (
    <Reveal className="pointer-events-none absolute left-0 top-0 h-[465px] w-[520px] motion-reduce:transform-none!" delay={0.08}>
      <CloudBlob className="left-11 top-8 h-52 w-72 bg-primary-light/70!" />
      <svg
        aria-hidden="true"
        viewBox="0 0 520 465"
        className="absolute left-0 top-0 h-[465px] w-[520px] overflow-visible fill-none"
      >
        <path d={arcPath(INNER_ARC.radius, -12, 92)} className="stroke-primary/35" />
        <path d={arcPath(orbit.radius, outerStart, outerEnd)} className="stroke-primary/30" strokeDasharray="3 6" />
        {[2, 28, 55, 78].map((angle, index) => {
          const { x, y } = arcPoint(278, angle);
          return (
            <circle
              key={angle}
              cx={x}
              cy={y}
              r={index % 2 ? 2 : 3}
              className="fill-primary-pastel stroke-surface"
            />
          );
        })}
      </svg>
    </Reveal>
  );
}

function ArcItem({
  item,
  slot,
  index,
  reducedMotion,
  close,
}: {
  item: NavItem;
  slot?: CardSlot;
  index: number;
  reducedMotion: boolean;
  close: () => void;
}) {
  const Icon = item.icon;
  const tone = item.tone ?? "blue";
  const tilt = slot && "z" in slot ? slot : undefined;
  const delay = index * 0.032;
  const content = (
    <>
      <IconBubble tone={tone} shape="circle" className={item.meta ? "size-7!" : "size-8!"}>
        <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
      </IconBubble>
      <span className="min-w-0">
        <span className="block">{item.label}</span>
        {item.meta && (
          <span className={cn("mt-0.5 block text-[10px] whitespace-nowrap", TONE[tone].fg)}>{item.meta}</span>
        )}
      </span>
      {!!item.unread && (
        <Pill className={cn(
          "absolute -right-1 -top-2 px-1.5! py-0! text-[10px]!",
          slot && "motion-safe:rotate-3",
        )}>
          <span className="sr-only">Chưa đọc </span>
          {item.unread}
        </Pill>
      )}
    </>
  );
  const cardClass = cn(
    "relative flex h-full min-h-12 w-full min-w-0 cursor-pointer items-center gap-2 px-2 py-1.5",
    "text-left text-xs font-semibold leading-tight text-foreground hover:border-primary-pastel hover:text-primary-hover",
    slot && "min-h-0",
    !slot && item.id === "skip" && "justify-center",
    FOCUS_RING,
  );

  return (
    <li
      className={cn(
        "min-w-0",
        slot ? "absolute perspective-[1000px]" : item.id === "skip" && "col-span-2",
      )}
      style={slot && { left: slot.left, top: slot.top, width: slot.width, height: slot.height }}
    >
      <motion.div
        className="h-full motion-reduce:transform-none!"
        initial={reducedMotion
          ? { opacity: 0 }
          : slot
            ? {
                opacity: 0,
                x: TRIGGER_CENTER - slot.left - slot.width / 2,
                y: TRIGGER_CENTER - slot.top - slot.height / 2,
                z: -35,
                scale: 0.5,
              }
            : { opacity: 0, y: 16 }}
        animate={{
          opacity: 1,
          x: 0,
          y: 0,
          z: reducedMotion ? 0 : tilt?.z ?? 0,
          scale: 1,
          rotateX: reducedMotion ? 0 : tilt?.rotateX ?? 0,
          rotateY: reducedMotion ? 0 : tilt?.rotateY ?? 0,
        }}
        transition={reducedMotion ? FADE : { ...SPRING, delay, opacity: { duration: 0.17, delay } }}
      >
        {item.href ? (
          <GlassCard as={Link} href={item.href} onClick={close} data-arc-item className={cardClass}>
            {content}
          </GlassCard>
        ) : (
          <GlassCard as="button" type="button" data-arc-item onClick={item.action} className={cardClass}>
            {content}
          </GlassCard>
        )}
      </motion.div>
    </li>
  );
}

function ShortcutPanel({
  desktop,
  isSignedIn,
  onSearch,
  close,
}: {
  desktop: boolean;
  isSignedIn: boolean;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  close: () => void;
}) {
  const shortcuts = [
    { href: "/combo", label: "Combo lộ trình", icon: Map },
    ...(isSignedIn ? [{ href: "/chat-sql", label: "Hỏi Mây Mây AI", icon: Bot }] : []),
    { href: "/help", label: "Trợ giúp", icon: CircleHelp },
  ];

  return (
    <GlassCard
      tilt={false}
      className={cn("mt-3 p-2.5", desktop && "absolute mt-0")}
      style={desktop ? TOOLS_SLOT : undefined}
    >
      <form role="search" aria-label="Tìm khóa học" onSubmit={onSearch} className="flex gap-1.5">
        <input
          type="search"
          name="keyword"
          aria-label="Tìm khóa học, môn học"
          placeholder="Khóa học, môn học…"
          className={cn("min-h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/90", FOCUS_RING)}
        />
        <Button size="icon" variant="pastel" className="size-11 rounded-full motion-reduce:transition-none" aria-label="Tìm khóa học" type="submit">
          <Search aria-hidden="true" className="size-4" />
        </Button>
      </form>
      <ul className="mt-1">
        {shortcuts.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              onClick={close}
              data-arc-item
              className={cn("flex min-h-11 items-center gap-2 rounded-full px-2 text-xs font-semibold text-foreground hover:bg-primary-light", FOCUS_RING)}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">{label}</span>
              <ArrowUpRight aria-hidden="true" className="size-3 shrink-0 text-primary" />
            </Link>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

function ArcMenu({
  menuRef,
  desktop,
  reducedMotion,
  home,
  browse,
  account,
  signedIn,
  skip,
  onSearch,
  close,
  dismiss,
}: {
  menuRef: RefObject<HTMLElement | null>;
  desktop: boolean;
  reducedMotion: boolean;
  home: NavItem;
  browse: readonly NavItem[];
  account: readonly NavItem[];
  signedIn: boolean;
  skip?: NavItem;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  close: () => void;
  dismiss: () => void;
}) {
  const isPresent = useIsPresent();
  const orbit = signedIn
    ? (account.length === ACCOUNT_ARC.cards.length ? ACCOUNT_ARC : MEMBER_ARC)
    : GUEST_ARC;

  return (
    <motion.nav
      ref={menuRef}
      aria-label="Điều hướng Mây Mây"
      inert={!isPresent}
      className={cn(
        "fixed z-[45] motion-reduce:transform-none!",
        desktop
          ? cn("pointer-events-none", LEFT_EDGE, TOP_EDGE, "[&_[data-arc-item]]:pointer-events-auto [&_form]:pointer-events-auto")
          : "inset-x-0 bottom-0",
        !isPresent && "pointer-events-none! [&_*]:pointer-events-none!",
      )}
      initial={reducedMotion || desktop ? { opacity: 0 } : { opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion || desktop ? { opacity: 0 } : { opacity: 0, y: 20 }}
      transition={reducedMotion || desktop ? FADE : { ...SPRING, opacity: FADE }}
    >
      {desktop && <ArcTrails orbit={orbit} />}
      <div className={cn(!desktop && "flex max-h-[calc(100dvh-5.5rem)] min-h-0 flex-col rounded-t-3xl border border-border bg-linear-to-b from-surface/95 to-background/95 pb-[max(5.5rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur-xl")}>
        {!desktop && (
          <div className="shrink-0 px-4 pb-2 pt-2.5">
            <div aria-hidden="true" className="mx-auto h-1 w-9 rounded-full bg-border-strong" />
            <div className="mt-1 flex min-h-11 items-center justify-between gap-3">
              <p className="flex items-center gap-2.5 text-base font-semibold text-foreground">
                <IconBubble shape="circle" className="size-8!">
                  <img src="/logo/maymay-mark.svg" alt="" className="size-5" />
                </IconBubble>
                Điều hướng Mây Mây
              </p>
              <Button variant="ghost" size="icon" className="size-11 rounded-full motion-reduce:transition-none" onClick={dismiss} aria-label="Đóng menu điều hướng">
                <X aria-hidden="true" className="size-5" />
              </Button>
            </div>
          </div>
        )}
        <div className={cn(!desktop && "min-h-0 overflow-y-auto overscroll-contain px-4 pb-2 pt-1")}>
          <ul aria-label="Khám phá" className={cn(!desktop && "grid grid-cols-2 gap-2")}>
            <ArcItem item={home} slot={desktop ? HOME_SLOT : undefined} index={0} reducedMotion={reducedMotion} close={close} />
            {browse.map((item, index) => (
              <ArcItem key={item.id} item={item} slot={desktop ? arcSlot(INNER_ARC, index) : undefined} index={index + 1} reducedMotion={reducedMotion} close={close} />
            ))}
            {skip && (
              <ArcItem item={skip} slot={desktop ? SKIP_SLOT : undefined} index={6} reducedMotion={reducedMotion} close={close} />
            )}
          </ul>
          <ul aria-label="Tài khoản" className={cn(!desktop && "mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3")}>
            {account.map((item, index) => (
              <ArcItem key={item.id} item={item} slot={desktop ? arcSlot(orbit, index) : undefined} index={index + 7} reducedMotion={reducedMotion} close={close} />
            ))}
          </ul>
          <ShortcutPanel desktop={desktop} isSignedIn={signedIn} onSearch={onSearch} close={close} />
        </div>
      </div>
    </motion.nav>
  );
}

function ProgressRing({ progress }: { progress: MotionValue<number> }) {
  const offset = useTransform(progress, (value) => RING_LENGTH * (1 - value));
  return (
    <svg aria-hidden="true" viewBox="0 0 56 56" className="pointer-events-none absolute inset-0 size-full -rotate-90 fill-none">
      <circle cx="28" cy="28" r={RING_RADIUS} className="stroke-primary-pastel" strokeWidth="1.5" />
      <motion.circle
        cx="28"
        cy="28"
        r={RING_RADIUS}
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        style={{ strokeDashoffset: offset }}
      />
    </svg>
  );
}

function Avatar({ avatar, fullname }: { avatar?: string | null; fullname?: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = fullname
    ? fullname.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "SN";

  return (
    <>
      {avatar && !failed ? (
        <img src={getImageUrl(avatar)} alt="" className="size-9 rounded-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initials}
        </span>
      )}
      <span aria-hidden="true" className="absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-surface bg-success-foreground" />
    </>
  );
}

export default function CloudArcNav({ onSkipHero }: { onSkipHero?: () => void }) {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const clearNotifications = useRealtimeNotiStore((state) => state.clearAll);
  const unreadCount = useRealtimeNotiStore((state) => state.buckets.USER?.unread ?? 0);
  const router = useRouter();
  const pathname = usePathname();
  const reducedMotion = useReducedMotionPreference();
  const desktop = useSyncExternalStore(subscribeToArcViewport, getArcViewport, () => false);
  const { isVisible, hasLevels, activeIndex, progress } = useHeroJourney();

  const [open, setOpen] = useState(false);
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const dismiss = useCallback(() => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      menu.current?.querySelector<HTMLElement>("[data-arc-item]")?.focus({ preventScroll: true });
    });
    const handleFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && event.target !== trigger.current && !menu.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleMenuKey = (event: KeyboardEvent) => {
      const menuElement = menu.current;
      if (!menuElement || event.defaultPrevented) return;

      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }

      const active = document.activeElement;
      if (event.key === "Tab") {
        const focusable = menuElement.querySelectorAll<HTMLElement>(FOCUSABLE);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const boundary = event.shiftKey ? first : last;
        if (active === boundary || !menuElement.contains(active)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
        return;
      }

      if (event.target instanceof HTMLInputElement) return;
      const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
      if (!backward && event.key !== "ArrowRight" && event.key !== "ArrowDown") return;

      const items = Array.from(menuElement.querySelectorAll<HTMLElement>("[data-arc-item]"));
      if (!items.length) return;
      const current = items.findIndex((item) => item === active);
      const next = current < 0
        ? (backward ? items.length - 1 : 0)
        : (current + (backward ? -1 : 1) + items.length) % items.length;
      event.preventDefault();
      items[next]?.focus();
    };

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("keydown", handleMenuKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("keydown", handleMenuKey);
    };
  }, [dismiss, open]);

  function goHome() {
    dismiss();
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
    } else {
      router.push("/");
    }
  }

  async function handleLogout() {
    dismiss();
    try {
      await logoutEverywhere();
    } catch {
      // Clear the client session even when the logout request fails.
    } finally {
      clearUser();
      clearNotifications();
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = String(new FormData(event.currentTarget).get("keyword") ?? "").trim();
    close();
    router.push(keyword ? `/courses?keyword=${encodeURIComponent(keyword)}` : "/courses");
  }

  const isLecturer = !!user?.roles?.includes("LECTURER");
  const dashboardHref = isLecturer ? "/lecturer" : user?.roles?.includes("ADMIN") ? "/admin" : "/my-learning";
  const home: NavItem = { id: "home", label: "Trang chủ", icon: House, action: goHome };
  const browse: NavItem[] = [
    { id: "courses", label: "Khóa học", href: "/courses", icon: BookOpen },
    { id: "instructors", label: "Giảng viên", href: "/instructors", icon: UsersRound },
    ...LEVELS.map((level) => ({ id: level.id, label: level.label, meta: level.grades, ...GRADE_LINKS[level.id] })),
  ];
  const account: NavItem[] = user
    ? [
        { id: "dashboard", label: isLecturer ? "Bảng điều khiển Giảng viên" : "Học tập của tôi", icon: LayoutGrid, href: dashboardHref },
        ...(isLecturer ? [{ id: "learning", label: "Khóa học đang học", icon: BookOpen, href: "/my-learning" }] : []),
        { id: "favorites", label: "Khóa học yêu thích", icon: Heart, href: "/favorites" },
        { id: "lecturer", label: isLecturer ? "Khu vực giảng viên" : "Trở thành giảng viên", icon: GraduationCap, href: isLecturer ? "/lecturer" : "/welcome" },
        { id: "notifications", label: "Thông báo", icon: Bell, href: "/notifications", unread: unreadCount },
        { id: "profile", label: "Hồ sơ cá nhân", icon: UserRound, href: "/profile", tone: "success" },
        { id: "logout", label: "Đăng xuất", icon: LogOut, action: handleLogout },
      ]
    : [
        { id: "login", label: "Đăng nhập", icon: LogIn, href: "/login" },
        { id: "register", label: "Đăng ký", icon: UserRoundPlus, href: "/register", tone: "success" },
      ];
  const skip: NavItem | undefined = onSkipHero && isVisible ? {
    id: "skip",
    label: "Xuống nội dung chính",
    icon: ArrowDownToLine,
    action: () => {
      dismiss();
      onSkipHero();
    },
  } : undefined;

  return (
    <>
      <div className={cn("pointer-events-none fixed z-[46] flex flex-col items-start", LEFT_EDGE, TOP_EDGE)}>
        <button
          ref={trigger}
          type="button"
          data-tour="island"
          aria-label={open ? "Đóng menu điều hướng Mây Mây" : "Mở menu điều hướng Mây Mây"}
          aria-expanded={open}
          aria-controls={menuId}
          tabIndex={open ? -1 : 0}
          onClick={open ? dismiss : () => setOpen(true)}
          onKeyDown={(event) => {
            if (!open && event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className={cn("pointer-events-auto relative grid size-14 cursor-pointer place-items-center rounded-full border border-border bg-surface/80 text-primary shadow-lg ring-4 ring-primary-light/55 backdrop-blur-xl hover:bg-surface", FOCUS_RING)}
        >
          {isVisible && hasLevels && <ProgressRing progress={progress} />}
          {open ? <X aria-hidden="true" className="size-5" /> : (
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={reducedMotion ? { scale: 1 } : { scale: [1, 1.08, 1] }}
              transition={reducedMotion ? { duration: 0 } : { duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
              className="motion-reduce:transform-none!"
            >
              <img src="/logo/maymay-mark.svg" alt="" className="size-9" />
            </motion.span>
          )}
        </button>
        {isVisible && hasLevels && !open && (
          <nav aria-label="Chọn tầng mây" className="mt-1 flex pl-1.5">
            {LEVELS.map((level) => {
              const active = level.index === activeIndex;
              return (
                <button
                  key={level.id}
                  type="button"
                  aria-current={active ? "step" : undefined}
                  aria-label={`Đến tầng ${level.label}`}
                  title={level.label}
                  onClick={() => scrollToCloudLevel(level.stop, reducedMotion)}
                  className={cn("pointer-events-auto group grid size-11 cursor-pointer place-items-center rounded-full", FOCUS_RING)}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "rounded-full border shadow-sm transition-colors motion-reduce:transition-none",
                      active
                        ? "size-3 border-primary bg-primary ring-4 ring-primary-light"
                        : "size-2 border-primary/70 bg-surface/90 group-hover:bg-primary-pastel",
                    )}
                  />
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <div className={cn("fixed right-[max(1rem,env(safe-area-inset-right))] z-[35]", TOP_EDGE)} inert={open}>
        {user ? (
          <Link
            href="/profile"
            aria-label={`Hồ sơ của ${user.fullname || "bạn"}`}
            className={cn("relative grid size-12 place-items-center rounded-full border border-border bg-surface/85 shadow-md backdrop-blur-xl hover:border-primary-pastel", FOCUS_RING)}
          >
            <Avatar key={user.avatar} avatar={user.avatar} fullname={user.fullname} />
          </Link>
        ) : (
          <div className="hidden items-center gap-1 rounded-full border border-border bg-surface/85 p-1 shadow-md backdrop-blur-xl min-[360px]:flex">
            <Link href="/login" className={cn("inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold text-foreground hover:bg-primary-light", FOCUS_RING)}>
              Đăng nhập
            </Link>
            <Link href="/register" className={cn("inline-flex min-h-11 items-center rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover", FOCUS_RING)}>
              Đăng ký
            </Link>
          </div>
        )}
      </div>

      <div id={menuId}>
        <AnimatePresence>
          {open && (
            <motion.div
              key="backdrop"
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, pointerEvents: "none" }}
              transition={FADE}
              onClick={dismiss}
            />
          )}
          {open && (
            <ArcMenu
              key="menu"
              menuRef={menu}
              desktop={desktop}
              reducedMotion={reducedMotion}
              home={home}
              browse={browse}
              account={account}
              signedIn={!!user}
              skip={skip}
              onSearch={handleSearch}
              close={close}
              dismiss={dismiss}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
