"use client";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Button, Badge } from "@/components/ui";
import type { LearningPath, Bundle, PageResult } from "@/types/learning-paths";
import { fetchLearning, price, LoadError, Loading } from "./shared";
export default function LearningLibrary({
  kind,
}: {
  kind: "paths" | "bundles";
}) {
  const [page, setPage] = useState(1);
  const endpoint = kind === "paths" ? "learning-paths" : "bundles";
  const { data, error, mutate } = useSWR<PageResult<LearningPath | Bundle>>(
    `/${endpoint}?page=${page}&limit=12`,
    fetchLearning,
  );
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 text-foreground sm:px-6">
      <nav
        aria-label="Điều hướng học tập"
        className="flex flex-wrap gap-3 text-sm"
      >
        <Link className="text-primary underline" href="/courses">
          Khóa học
        </Link>
        <Link className="text-primary underline" href="/lo-trinh">
          Lộ trình
        </Link>
        <Link className="text-primary underline" href="/combo">
          Combo khóa học
        </Link>
        <Link className="text-primary underline" href="/lo-trinh/cua-toi">
          Lộ trình của tôi
        </Link>
        <Link className="text-primary underline" href="/combo/don-hang">
          Đơn combo của tôi
        </Link>
      </nav>
      <header className="max-w-2xl space-y-3">
        <p className="text-sm font-medium text-primary">Học có định hướng</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          {kind === "paths"
            ? "Từng bước đến mục tiêu"
            : "Học trọn gói, rõ từng quyền lợi"}
        </h1>
        <p className="text-muted-foreground">
          {kind === "paths"
            ? "Lộ trình được tuyển chọn và duyệt theo mục tiêu học tập. Mỗi học phần có các khóa để bạn lựa chọn."
            : "Xem chính xác các khóa trong combo, phần đã sở hữu và số tiền cần thanh toán trước khi quyết định."}
        </p>
      </header>
      {error ? (
        <LoadError error={error} retry={() => mutate()} />
      ) : !data ? (
        <Loading />
      ) : !data.items.length ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <h2 className="font-semibold">
            Chưa có {kind === "paths" ? "lộ trình" : "combo"} được công khai
          </h2>
          <p className="mt-2 text-muted-foreground">
            Bạn vẫn có thể khám phá các khóa học theo môn và mục tiêu.
          </p>
          <Link
            className="mt-4 inline-block text-primary underline"
            href="/courses"
          >
            Khám phá khóa học
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <div className="relative flex h-36 items-center justify-between overflow-hidden bg-primary-light p-6">
                  <span className="text-5xl font-semibold text-primary/30">
                    {kind === "paths" ? "01 →" : "＋"}
                  </span>
                  <Badge variant="primary">Được tuyển chọn</Badge>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  {"price" in item && (
                    <p className="font-semibold text-primary">
                      {price(item.price)}
                    </p>
                  )}
                  <Link
                    className="mt-auto rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-primary hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-ring"
                    href={`${kind === "paths" ? "/lo-trinh" : "/combo"}/${item.slug}`}
                  >
                    Xem {kind === "paths" ? "lộ trình" : "chi tiết combo"} →
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {page} / {Math.ceil(data.total / 12)}
            </span>
            <Button
              variant="outline"
              disabled={page * 12 >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
