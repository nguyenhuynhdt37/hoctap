"use client";

import { Button, Input } from "@/components/ui";
import { getNavFor, isCurrentPage, isInSection, type NavGroup, type Viewer } from "@/lib/navigation/user-nav";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LogOut, Search } from "pulsoicon-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LiveTicket, WalletChip } from "./live-stats";

interface SkyPanelProps {
  id: string;
  viewer: Viewer;
  pathname: string;
  unread: number;
  focusSearch: boolean;
  keyword: string;
  onKeyword: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onNavigate: () => void;
  onLogout: () => void;
}

function defaultGroup(groups: NavGroup[], pathname: string) {
  const matchesPage = groups.find(({ items }) => items.some((item) => isCurrentPage(pathname, item.href)
    || item.children?.some((child) => isCurrentPage(pathname, child.href))));
  return matchesPage
    ?? groups.find(({ items }) => items.some((item) => isInSection(pathname, item.href)))
    ?? groups[0];
}

export function SkyPanel({
  id, viewer, pathname, unread, focusSearch, keyword, onKeyword, onSearch, onNavigate, onLogout,
}: SkyPanelProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const groups = getNavFor(viewer);
  const [groupId, setGroupId] = useState<NavGroup["id"] | null>(null);
  const group = groups.find((item) => item.id === groupId) ?? defaultGroup(groups, pathname);

  useEffect(() => {
    if (!focusSearch) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusSearch]);

  return (
    <div id={id} className="space-y-4">
      <form role="search" aria-label="Tìm kiếm khóa học" onSubmit={onSearch} className="flex min-w-0 gap-2">
        <Input
          ref={searchRef}
          aria-label="Tìm kiếm khóa học"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Tìm khóa học, môn học…"
          value={keyword}
          onChange={(event) => onKeyword(event.target.value)}
          leftIcon={<Search aria-hidden="true" className="size-4" />}
          containerClassName="min-w-0"
        />
        <Button type="submit" className="shrink-0">Tìm</Button>
      </form>

      <div role="group" aria-label="Nhóm tiện ích" className="grid grid-cols-2 gap-1.5 rounded-2xl bg-background p-1.5 sm:flex sm:flex-wrap">
        {groups.map((item) => (
          <Button
            key={item.id}
            variant={item.id === group.id ? "pastel" : "ghost"}
            aria-pressed={item.id === group.id}
            aria-controls={`${id}-links`}
            className="h-auto min-h-10 justify-start px-2.5 py-2 text-left leading-snug sm:justify-center sm:px-3.5"
            leftIcon={<item.icon aria-hidden="true" animated={false} className="size-4 shrink-0" />}
            onClick={() => setGroupId(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <nav id={`${id}-links`} aria-label={group.label}>
        <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {group.items.map((item) => {
            const current = isCurrentPage(pathname, item.href);
            const active = current || isInSection(pathname, item.href);
            return (
              <li key={item.id} className="min-w-0 border-b border-border/70 pb-1">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-foreground hover:bg-primary-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active && "bg-primary-light text-primary",
                  )}
                >
                  <item.icon aria-hidden="true" animated={false} className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 wrap-anywhere">{item.label}</span>
                  {item.badge === "unread" && unread > 0 && (
                    <span className="ml-auto shrink-0 rounded-full bg-primary px-2 py-1 text-xs leading-none text-primary-foreground">
                      {unread > 99 ? "99+" : unread} mới
                    </span>
                  )}
                </Link>
                {item.children && (
                  <ul aria-label={`Lối tắt trong ${item.label}`} className="flex flex-wrap gap-x-3 pl-9">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={onNavigate}
                          aria-current={isCurrentPage(pathname, child.href) ? "page" : undefined}
                          className="inline-flex min-h-9 items-center rounded-md text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:underline"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {group.id === "account" && viewer.signedIn && (
        <Button variant="destructive" onClick={onLogout} leftIcon={<LogOut aria-hidden="true" className="size-4" />}>
          Đăng xuất
        </Button>
      )}
      {group.id === "wallet" && viewer.signedIn && <WalletChip onNavigate={onNavigate} />}
      {group.id === "learn" && viewer.signedIn && (
        <details className="rounded-xl border border-border bg-background p-3">
          <summary className="cursor-pointer rounded-md text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring">Tiến độ học và số dư</summary>
          <div className="mt-3"><LiveTicket onNavigate={onNavigate} /></div>
        </details>
      )}
    </div>
  );
}
