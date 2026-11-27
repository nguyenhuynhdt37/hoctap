import Link from "next/link";
import type { BrowseSubjectOption } from "@/types/catalog";

export function SubjectHero({ currentSubject }: { currentSubject?: BrowseSubjectOption | null }) {
  return (
    <section aria-labelledby="catalog-heading" className="rounded-3xl border border-border bg-primary-light/75 p-5 sm:p-7">
      <h1 id="catalog-heading" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {currentSubject ? `Khóa học ${currentSubject.name}` : "Khám phá khóa học"}
      </h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-foreground/85">
        Tìm khóa học theo môn, khối lớp hoặc mục tiêu học tập của bạn.
      </p>
      <nav aria-label="Lối tắt mua khóa học" className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-primary">
        <Link href="/combo" className="inline-flex min-h-9 items-center rounded-md underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">Xem combo</Link>
        <Link href="/wallets" className="inline-flex min-h-9 items-center rounded-md underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">Nạp Coin</Link>
      </nav>
    </section>
  );
}
