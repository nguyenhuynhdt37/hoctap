"use client";

import { EquippedMarks, FramedAvatar } from "@/components/learning-hub/shop/item-art";
import { mayPortrait } from "@/components/user/home/study-image";
import { useLearnerEquipment } from "@/lib/learning-hub/shop-hooks";
import { cn } from "@/lib/utils";
import {
  getNavFor,
  isCurrentPage,
  isInSection,
  type NavGroup,
  type NavItem,
  type NavTone,
  type Viewer,
} from "@/lib/navigation/user-nav";
import type { User } from "@/types/user/user";
import { LogOut, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type FormEvent, type RefObject } from "react";
import { LiveTicket } from "./live-stats";

const TONES: Record<NavTone, { bubble: string; tag: string; card: string }> = {
  blue: {
    bubble: "border-primary-pastel bg-primary-light text-primary",
    tag: "border-primary-pastel bg-primary-light text-primary",
    card: "hover:border-primary-pastel hover:bg-primary-light/60",
  },
  pink: {
    bubble: "border-secondary-pastel bg-secondary text-secondary-foreground",
    tag: "border-secondary-pastel bg-secondary text-secondary-foreground",
    card: "hover:border-secondary-pastel hover:bg-secondary/50",
  },
  lavender: {
    bubble: "border-accent-border bg-accent text-accent-foreground",
    tag: "border-accent-border bg-accent text-accent-foreground",
    card: "hover:border-accent-border hover:bg-accent/50",
  },
  vanilla: {
    bubble: "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
    tag: "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
    card: "hover:border-accent-vanilla-border hover:bg-accent-vanilla/50",
  },
};

/** Từng cột của lưới lệch: bảy–năm / năm–bảy. */
const SPANS = ["md:col-span-7", "md:col-span-5 md:mt-6", "md:col-span-5", "md:col-span-7 md:mt-4"];

const chipLink =
  "inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:border-primary aria-[current=page]:bg-primary-light aria-[current=page]:font-semibold md:min-h-9 motion-reduce:transition-none";

function Tile({
  item, tone, pathname, unread, onNavigate,
}: { item: NavItem; tone: NavTone; pathname: string; unread: number; onNavigate: () => void }) {
  const t = TONES[tone];
  const current = isCurrentPage(pathname, item.href);
  const inSection = !current && isInSection(pathname, item.href);
  const Icon = item.icon;
  const badge = item.badge === "unread" && unread > 0 ? `${unread > 99 ? "99+" : unread} mới` : null;

  return (
    <li
      className={cn(
        "group relative flex flex-col justify-between gap-2 border bg-surface p-3 transition-colors motion-reduce:transition-none",
        item.size === "wide" ? "col-span-2 rounded-[1.5rem_0.75rem_1.5rem_0.75rem] bg-linear-to-br from-surface to-background" : "rounded-2xl",
        current ? "border-primary bg-primary-light/70" : "border-border",
        !current && t.card,
        inSection && "border-primary-pastel",
      )}
    >
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={current ? "page" : undefined}
        className="flex min-h-11 items-start gap-3 rounded-[inherit] focus-visible:outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring"
      >
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 grid size-11 shrink-0 place-items-center border transition-[border-radius,transform] duration-300 ease-out",
            "rounded-[58%_42%_52%_48%/48%_56%_44%_52%] group-hover:-rotate-6 group-hover:rounded-full motion-reduce:transition-none motion-reduce:group-hover:rotate-0",
            t.bubble,
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-foreground">
            {item.label}
            {badge && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold leading-none text-primary-foreground">{badge}</span>}
            {current && <span className="rounded-full border border-primary px-2 py-0.5 text-xs font-medium leading-none text-primary">Đang xem</span>}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-[color:var(--sn-neutral-600)]">{item.description}</span>
        </span>
      </Link>
      {item.children && (
        <ul className="relative z-10 flex flex-wrap gap-1.5 pl-14" aria-label={`Lối nhanh trong ${item.label}`}>
          {item.children.map((child) => (
            <li key={child.href}>
              <Link href={child.href} onClick={onNavigate} aria-current={isCurrentPage(pathname, child.href) ? "page" : undefined} className={chipLink}>
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Group({
  group, className, pathname, unread, onNavigate, onLogout, signedIn,
}: {
  group: NavGroup; className: string; pathname: string; unread: number;
  onNavigate: () => void; onLogout: () => void; signedIn: boolean;
}) {
  const t = TONES[group.tone];
  const GroupIcon = group.icon;
  const headingId = `sky-group-${group.id}`;
  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 id={headingId} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold", t.tag)}>
          <GroupIcon aria-hidden="true" className="size-4" />
          {group.label}
        </h3>
        <p className="text-xs text-[color:var(--sn-neutral-600)]">{group.tagline}</p>
      </div>
      <ul className="grid grid-cols-2 gap-2.5">
        {group.items.map((item) => (
          <Tile key={item.id} item={item} tone={group.tone} pathname={pathname} unread={unread} onNavigate={onNavigate} />
        ))}
        {group.id === "account" && signedIn && (
          <li className="col-span-2">
            <button
              type="button"
              onClick={onLogout}
              className="flex min-h-11 w-full items-center gap-2 rounded-2xl border border-destructive-border bg-destructive-bg px-4 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Đăng xuất
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}

export interface SkyPanelProps {
  id: string;
  panelRef: RefObject<HTMLDivElement | null>;
  viewer: Viewer;
  user: User | null;
  pathname: string;
  unread: number;
  focusSearch: boolean;
  keyword: string;
  onKeyword: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onNavigate: () => void;
  onLogout: () => void;
}

/** "Bản đồ bầu trời": tìm kiếm, vé dữ liệu sống và bốn nhóm lối đi. */
export function SkyPanel({
  id, panelRef, viewer, user, pathname, unread, focusSearch, keyword, onKeyword, onSearch, onNavigate, onLogout,
}: SkyPanelProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const groups = getNavFor(viewer);
  const equipment = useLearnerEquipment();
  const firstName = (user?.fullname ?? "").trim().split(/\s+/).pop();

  useEffect(() => {
    // Mở bằng nút tìm kiếm: vào thẳng ô tìm. Mở bằng nút bản đồ: tiêu điểm lên chính bảng.
    if (focusSearch) searchRef.current?.focus();
    else panelRef.current?.focus();
  }, [focusSearch, panelRef]);

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label="Bản đồ bầu trời Mây Mây"
      tabIndex={-1}
      className="relative min-h-0 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 outline-none max-md:flex-1 md:max-h-[calc(100dvh-5.75rem)] md:px-5 md:pb-5"
    >
      <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center md:gap-5">
        <div className="flex items-center gap-3 md:w-72 md:shrink-0">
          <FramedAvatar src={viewer.signedIn ? user?.avatar : mayPortrait} name={user?.fullname} equipment={viewer.signedIn ? equipment : undefined} className="size-12 text-sm" />
          <div className="min-w-0 text-sm leading-snug text-foreground">
            <p className="font-semibold wrap-anywhere">{viewer.signedIn ? `Chào ${firstName || "bạn"}!` : "Chào bạn nhỏ!"}</p>
            {viewer.signedIn && <EquippedMarks equipment={equipment} className="my-1" />}
            <p className="text-[color:var(--sn-neutral-600)]">Hôm nay Mây dẫn bạn đi đâu?</p>
          </div>
        </div>
        <form role="search" aria-label="Tìm kiếm khóa học" onSubmit={onSearch} className="flex min-w-0 flex-1 gap-2">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Tìm kiếm khóa học</span>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-primary" />
            <input
              ref={searchRef}
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Tìm khóa học, môn học…"
              value={keyword}
              onChange={(event) => onKeyword(event.target.value)}
              className="h-11 w-full rounded-full border border-border bg-surface pr-4 pl-10 text-base text-foreground placeholder:text-[color:var(--sn-neutral-600)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none"
          >
            Tìm
          </button>
        </form>
      </div>

      {viewer.signedIn && (
        <div className="mb-4">
          <LiveTicket onNavigate={onNavigate} />
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-12 md:gap-x-6 md:gap-y-5">
        {groups.map((group, index) => (
          <Group
            key={group.id}
            group={group}
            className={SPANS[index] ?? "md:col-span-6"}
            pathname={pathname}
            unread={unread}
            onNavigate={onNavigate}
            onLogout={onLogout}
            signedIn={viewer.signedIn}
          />
        ))}
      </div>
    </div>
  );
}
