"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import useSWR from "swr";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Layers,
  Search,
  Ticket,
  UserRound,
} from "pulsoicon-react";
import { Badge, Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Bundle, PageResult } from "@/types/learning-paths";
import { fetchLearning, LoadError, Loading, price } from "./shared";

const PAGE_SIZE = 12;
const PRICE_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "free", label: "Miễn phí" },
  { value: "paid", label: "Có phí" },
] as const;

type PriceFilter = (typeof PRICE_FILTERS)[number]["value"];

function ComboCard({ item, wide }: { item: Bundle; wide: boolean }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const thumbnail = item.thumbnail_url;
  const href = `/combo/${encodeURIComponent(item.slug)}`;
  const summary = item.subtitle || item.description;

  return (
    <Card
      density="none"
      className={cn(
        "group grid overflow-hidden hover:border-primary-pastel",
        wide ? "md:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]" : "grid-rows-[auto_1fr]",
      )}
    >
      <div className={cn("relative aspect-video overflow-hidden bg-primary-light", wide && "md:aspect-auto")}>
        {thumbnail && thumbnail !== failedImage ? (
          <img
            src={thumbnail}
            alt=""
            loading={wide ? "eager" : "lazy"}
            className="absolute inset-0 size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025]"
            onError={() => setFailedImage(thumbnail)}
          />
        ) : (
          <div className={cn("grid h-full place-items-center text-primary", wide && "md:min-h-56")}>
            <Layers className="size-12 stroke-[1.35]" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className={cn("flex min-w-0 flex-col p-5", wide && "md:justify-center md:p-8 lg:p-10")}>
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {typeof item.course_count === "number" && (
            <Badge variant="primary" className="gap-1.5">
              <BookOpen className="size-3.5" aria-hidden="true" />
              {item.course_count} khóa học
            </Badge>
          )}
          {item.instructor && (
            <span className="inline-flex min-w-0 items-center gap-1.5 break-words">
              <UserRound className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{item.instructor.name}</span>
            </span>
          )}
        </div>
        <h3 className={cn("break-words text-lg font-semibold leading-snug", wide && "md:text-2xl lg:text-[1.75rem]")}>
          <Link href={href} className="rounded-sm decoration-1 underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            {item.title}
          </Link>
        </h3>
        {summary && (
          <p className={cn("mt-2 line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground", wide && "md:mt-3 md:line-clamp-3")}>
            {summary}
          </p>
        )}
        <div className={cn("mt-auto pt-5", wide && "md:mt-6 md:pt-0")}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-border pt-3.5">
            <span className="text-lg font-semibold text-primary">
              {Number(item.price) === 0 ? "Miễn phí" : price(item.price, item.currency)}
            </span>
            <Link
              href={href}
              aria-label={`Xem lộ trình ${item.title}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-light px-3.5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-pastel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Xem lộ trình <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function LearningLibrary() {
  const results = useRef<HTMLElement>(null);
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sort, setSort] = useState("recent");
  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    keyword,
    price_filter: priceFilter,
    sort,
  });
  const { data, error, mutate } = useSWR<PageResult<Bundle>>(
    `/bundles?${query}`,
    fetchLearning,
  );
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(keyword) || priceFilter !== "all";

  function clearFilters() {
    setInput("");
    setKeyword("");
    setPriceFilter("all");
    setPage(1);
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    results.current?.scrollIntoView({ block: "start" });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 text-foreground sm:px-6 sm:pt-28">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 sm:mb-5">
        <nav aria-label="Điều hướng danh mục" className="flex items-center gap-2 text-sm">
          <Link href="/courses" className="text-muted-foreground hover:text-primary hover:underline">Khóa học</Link>
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span aria-current="page" className="font-semibold">Combo</span>
        </nav>
        <Link href="/combo/don-hang" className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-medium text-primary hover:border-primary-pastel hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Ticket className="size-4" aria-hidden="true" /> Combo đã mua
        </Link>
      </div>

      <header className="grid overflow-hidden rounded-[28px] border border-primary-pastel/60 bg-primary-light md:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <div className="min-w-0 self-center p-5 sm:p-8 lg:px-10 lg:py-9">
          <h1 className="max-w-lg text-balance font-display text-[2.2rem] leading-[1.14] sm:text-5xl lg:text-[3.5rem]">
            Khám phá combo học tập
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Chọn các khóa học đã được giảng viên sắp xếp thành lộ trình theo mục tiêu của bạn.
          </p>
          <form
            role="search"
            className="mt-5 flex max-w-lg items-center gap-2 sm:mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setKeyword(input.trim());
              results.current?.scrollIntoView({ block: "start" });
            }}
          >
            <Input
              type="search"
              aria-label="Tên combo"
              placeholder="Tìm theo tên combo"
              leftIcon={<Search className="size-4" />}
              maxLength={160}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              containerClassName="min-w-0"
              className="h-12 placeholder:text-muted-foreground"
            />
            <Button type="submit" className="h-12 shrink-0 px-4 sm:px-5">Tìm kiếm</Button>
          </form>
        </div>
        <div className="relative h-32 overflow-hidden md:h-full md:min-h-64">
          <Image
            src="/videos/studynest/scene-academy.jpg"
            alt=""
            fill
            preload
            sizes="(max-width: 767px) 100vw, (max-width: 1280px) 48vw, 590px"
            className="object-cover object-[center_58%]"
          />
        </div>
      </header>

      <section ref={results} aria-labelledby="combo-results" className="mt-7 scroll-mt-24 space-y-4 sm:mt-9 sm:space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
          <div className="min-w-0">
            <h2 id="combo-results" className="text-2xl font-semibold tracking-tight sm:text-3xl">Lộ trình đang mở</h2>
            <p aria-live="polite" className="mt-1 break-words text-sm text-muted-foreground">
              {data && !error
                ? `${data.total} combo${keyword ? ` cho “${keyword}”` : ""}`
                : "Tìm theo tên hoặc lọc theo giá"}
            </p>
          </div>
          {hasFilters && Boolean(data?.items.length) && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>Xóa bộ lọc</Button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
          <div role="group" aria-label="Lọc theo giá" className="flex flex-wrap items-center gap-1.5">
            {PRICE_FILTERS.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={priceFilter === value ? "pastel" : "ghost"}
                aria-pressed={priceFilter === value}
                onClick={() => {
                  setPriceFilter(value);
                  setPage(1);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <Select
            aria-label="Sắp xếp combo"
            containerClassName="w-auto max-w-full"
            className="h-9 py-1.5"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
          >
            <option value="recent">Mới cập nhật</option>
            <option value="price_asc">Giá thấp đến cao</option>
            <option value="price_desc">Giá cao đến thấp</option>
            <option value="title">Tên A–Z</option>
          </Select>
        </div>

        {error ? (
          <LoadError error={error} retry={() => mutate()} />
        ) : !data ? (
          <Loading />
        ) : data.items.length ? (
          <ul className={cn("grid gap-5", data.total !== 1 && "sm:grid-cols-2 lg:grid-cols-3")}>
            {data.items.map((item) => (
              <li key={item.id} className="grid min-w-0">
                <ComboCard item={item} wide={data.total === 1} />
              </li>
            ))}
          </ul>
        ) : (
          <Card>
            <EmptyState
              icon={<BookOpen className="size-6" aria-hidden="true" />}
              title={hasFilters ? "Không tìm thấy combo phù hợp" : "Chưa có combo đang mở bán"}
              action={hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>Xem tất cả combo</Button>
              ) : (
                <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  Khám phá khóa học <ArrowDownRight className="size-4" aria-hidden="true" />
                </Link>
              )}
            />
          </Card>
        )}

        {(pageCount > 1 || page > 1) && data && !error && (
          <nav aria-label="Phân trang combo" className="flex items-center justify-between gap-2 pt-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => changePage(page - 1)} leftIcon={<ChevronLeft className="size-4" />}>
              Trang trước
            </Button>
            <span className="text-center text-sm tabular-nums text-muted-foreground">{page} / {pageCount}</span>
            <Button variant="outline" disabled={page >= pageCount} onClick={() => changePage(page + 1)} rightIcon={<ChevronRight className="size-4" />}>
              Trang sau
            </Button>
          </nav>
        )}
      </section>
    </main>
  );
}
