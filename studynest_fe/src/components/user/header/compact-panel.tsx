"use client";

import { Badge, Button, Input } from "@/components/ui";
import {
  getNavFor,
  isCurrentPage,
  isInSection,
  type NavGroup,
  type NavItem,
  type NavTone,
  type Viewer,
} from "@/lib/navigation/user-nav";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronDown, LogOut, Pin, Search, X } from "pulsoicon-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { LiveTicket, WalletChip } from "./live-stats";

const PINNED_KEY = "user-nav-pinned";
const COLLAPSED_GROUPS_KEY = "user-nav-collapsed-groups";

const GROUP_DOT_CLASS: Record<NavTone, string> = {
  blue: "bg-primary",
  pink: "bg-secondary-foreground",
  vanilla: "bg-accent-vanilla-foreground",
  lavender: "bg-accent-foreground",
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export interface SkyPanelProps {
  id: string;
  viewer: Viewer;
  pathname: string;
  unread: number;
  focusSearch: boolean;
  keyword: string;
  userName?: string | null;
  onKeyword: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onNavigate: () => void;
  onLogout: () => void;
}

export function SkyPanel({
  id,
  viewer,
  pathname,
  unread,
  focusSearch,
  keyword,
  userName,
  onKeyword,
  onSearch,
  onNavigate,
  onLogout,
}: SkyPanelProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => getNavFor(viewer), [viewer]);
  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Khôi phục mục đã ghim và trạng thái đóng/mở nhóm từ localStorage
  useEffect(() => {
    try {
      const savedPins = window.localStorage.getItem(PINNED_KEY);
      if (savedPins) {
        const parsed = JSON.parse(savedPins);
        if (Array.isArray(parsed)) {
          setPinnedHrefs(parsed.filter((x): x is string => typeof x === "string"));
        }
      }
      const savedCollapsed = window.localStorage.getItem(COLLAPSED_GROUPS_KEY);
      if (savedCollapsed) {
        const parsed = JSON.parse(savedCollapsed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setCollapsedGroups(parsed as Record<string, boolean>);
        }
      }
    } catch {
      // Bỏ qua khi trình duyệt chặn localStorage
    }
  }, []);

  useEffect(() => {
    if (!focusSearch) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusSearch]);

  const togglePin = (href: string) => {
    setPinnedHrefs((prev) => {
      const exists = prev.includes(href);
      const next = exists ? prev.filter((x) => x !== href) : [...prev, href].slice(0, 4);
      try {
        window.localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      } catch {
        // Bỏ qua
      }
      return next;
    });
  };

  const toggleGroup = (groupId: NavGroup["id"]) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(next));
      } catch {
        // Bỏ qua
      }
      return next;
    });
  };

  const normalizedQuery = normalizeText(keyword);

  // Lọc trực tiếp các mục theo từ khóa đang gõ (vẫn cho phép Enter để tìm khóa học)
  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => {
        const groupMatch = normalizeText(group.label).includes(normalizedQuery);
        const items = groupMatch
          ? group.items
          : group.items.filter((item) => {
              const haystack = normalizeText(
                [item.label, item.description, ...(item.children?.map((c) => c.label) ?? [])].join(" "),
              );
              return haystack.includes(normalizedQuery);
            });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [groups, normalizedQuery]);

  const pinnedItems = useMemo(
    () =>
      pinnedHrefs
        .map((href) => allItems.find((item) => item.href === href))
        .filter((item): item is NavItem => Boolean(item)),
    [pinnedHrefs, allItems],
  );

  const renderNavItem = (item: NavItem, inPinnedSection = false) => {
    const Icon = item.icon;
    const current = isCurrentPage(pathname, item.href);
    const active =
      current ||
      isInSection(pathname, item.href) ||
      Boolean(item.children?.some((child) => isCurrentPage(pathname, child.href)));
    const isPinned = pinnedHrefs.includes(item.href);

    return (
      <li key={`${inPinnedSection ? "pin-" : ""}${item.id}`}>
        <div className="group/row relative flex items-center">
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={current ? "page" : undefined}
            title={item.description || item.label}
            className={cn(
              "group relative flex min-h-11 flex-1 items-center gap-2.5 rounded-2xl px-2.5 py-1.5 pr-8 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border border-primary-pastel bg-surface font-semibold text-primary shadow-xs"
                : "border border-transparent text-muted-foreground hover:border-surface hover:bg-surface/75 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-surface/80 text-muted-foreground group-hover:bg-primary-light group-hover:text-primary",
              )}
            >
              <Icon aria-hidden="true" animated={false} className="size-4 shrink-0" />
            </span>

            <span className="min-w-0 flex-1 truncate">{item.label}</span>

            {item.badge === "unread" && unread > 0 && (
              <Badge variant="primary" size="sm" className="tabular-nums">
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
          </Link>

          {/* Nút ghim/bỏ ghim nhanh giống Lecturer sidebar */}
          <button
            type="button"
            onClick={() => togglePin(item.href)}
            aria-label={isPinned ? `Bỏ ghim ${item.label}` : `Ghim ${item.label}`}
            title={isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
            className={cn(
              "absolute right-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isPinned
                ? "text-primary opacity-100 hover:bg-primary-light"
                : "text-muted-foreground opacity-0 hover:bg-primary-light hover:text-primary group-hover/row:opacity-100",
            )}
          >
            <Pin
              animated={false}
              aria-hidden="true"
              className={cn("size-3", isPinned && "fill-current")}
            />
          </button>
        </div>

        {/* Lối tắt con thụt lề mềm mại */}
        {!inPinnedSection && item.children && item.children.length > 0 && (
          <ul
            aria-label={`Lối tắt trong ${item.label}`}
            className="mt-1 ml-6 flex flex-wrap gap-1.5 border-l border-primary-pastel/70 pl-3"
          >
            {item.children.map((child) => {
              const childCurrent = isCurrentPage(pathname, child.href);
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={childCurrent ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-7 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      childCurrent
                        ? "border-primary-pastel bg-primary-light text-primary font-semibold"
                        : "border-border/80 bg-surface/80 text-muted-foreground hover:border-primary-pastel hover:bg-primary-light/70 hover:text-primary",
                    )}
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div id={id} className="relative flex h-full min-h-0 flex-col">
      {/* Header thương hiệu giống Lecturer Sidebar */}
      <div className="relative flex h-16 shrink-0 items-center justify-between gap-2 border-b border-primary-pastel/60 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-surface shadow-2xs">
            <img
              src="/logo/maymay-mark.svg"
              alt=""
              width={22}
              height={22}
              className="size-6 object-contain"
            />
          </span>
          <div className="min-w-0">
            <p className="font-display truncate text-base font-bold leading-none text-foreground">
              Tiện ích
            </p>
            <span className="mt-1 inline-flex max-w-full items-center truncate rounded-full border border-primary-pastel/60 bg-surface/90 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-primary uppercase">
              {userName || (viewer.signedIn ? "Học viên" : "Mây Mây")}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Đóng bảng tiện ích"
          onClick={onNavigate}
          className="h-8 w-8 shrink-0 rounded-full hover:bg-surface/80"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {/* Tìm nhanh tiện ích & khóa học */}
      <div className="relative shrink-0 px-3 pt-3">
        <form
          role="search"
          aria-label="Tìm kiếm khóa học hoặc tiện ích"
          onSubmit={onSearch}
          className="flex min-w-0 items-center gap-1.5"
        >
          <Input
            ref={searchRef}
            aria-label="Tìm kiếm khóa học hoặc tiện ích"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Tìm khóa học, tiện ích…"
            value={keyword}
            onChange={(event) => onKeyword(event.target.value)}
            leftIcon={<Search aria-hidden="true" className="size-4" />}
            containerClassName="min-w-0 flex-1"
            className="h-10 bg-surface/90 text-xs"
          />
          <Button type="submit" size="sm" className="h-10 shrink-0 rounded-xl px-3">
            Tìm
          </Button>
        </form>
      </div>

      {/* Điều hướng động theo nhóm (giống LecturerShell) */}
      <nav
        aria-label="Điều hướng tiện ích"
        className="relative min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4"
      >
        {/* Nhóm Đã ghim (Pinned Shortcuts) */}
        {!normalizedQuery && pinnedItems.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-2 px-2.5">
              <Pin
                animated={false}
                className="size-3 fill-current text-primary"
                aria-hidden="true"
              />
              <p className="text-[11px] font-bold tracking-wider text-primary uppercase">
                Đã ghim
              </p>
            </div>
            <ul className="space-y-1">
              {pinnedItems.map((item) => renderNavItem(item, true))}
            </ul>
          </div>
        )}

        {/* Các nhóm tiện ích có thể đóng/mở động */}
        {filteredGroups.map((group) => {
          const isCollapsed = !normalizedQuery && Boolean(collapsedGroups[group.id]);
          const sectionId = `${id}-group-${group.id}`;

          return (
            <div key={group.id}>
              <button
                type="button"
                aria-expanded={!isCollapsed}
                aria-controls={sectionId}
                onClick={() => toggleGroup(group.id)}
                className="mb-1.5 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-1 text-left transition-colors hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn("h-1.5 w-1.5 shrink-0 rounded-full", GROUP_DOT_CLASS[group.tone])}
                  />
                  <span className="truncate text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    {group.label}
                  </span>
                </span>
                <ChevronDown
                  animated={false}
                  aria-hidden="true"
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                    isCollapsed && "-rotate-90",
                  )}
                />
              </button>

              {!isCollapsed && (
                <ul id={sectionId} className="space-y-1">
                  {group.items.map((item) => renderNavItem(item))}
                </ul>
              )}
            </div>
          );
        })}

        {/* Gợi ý tìm khóa học khi gõ từ khóa không khớp mục điều hướng nào */}
        {normalizedQuery && filteredGroups.length === 0 && (
          <div className="rounded-2xl border border-primary-pastel/70 bg-surface/85 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Không có mục tiện ích nào khớp với{" "}
              <span className="font-semibold text-foreground">&ldquo;{keyword.trim()}&rdquo;</span>.
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Bấm nút <strong>Tìm</strong> hoặc Enter để tìm trong thư viện khóa học.
            </p>
          </div>
        )}
      </nav>

      {/* Chân Sidebar: Tiến độ / số dư & Đăng xuất (khi đã đăng nhập) */}
      {viewer.signedIn && (
        <div className="relative shrink-0 space-y-2 border-t border-primary-pastel/60 p-3">
          <details className="rounded-2xl border border-primary-pastel/75 bg-surface/85 p-2.5 shadow-2xs">
            <summary className="cursor-pointer rounded-lg px-1 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Tiến độ học & số dư Coin
            </summary>
            <div className="mt-2.5 space-y-2">
              <LiveTicket onNavigate={onNavigate} />
              <WalletChip onNavigate={onNavigate} />
            </div>
          </details>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            leftIcon={<LogOut aria-hidden="true" className="size-4" />}
            className="w-full justify-start rounded-2xl px-3 text-destructive-foreground hover:bg-destructive-bg/70 hover:text-destructive-foreground"
          >
            Đăng xuất
          </Button>
        </div>
      )}
    </div>
  );
}
