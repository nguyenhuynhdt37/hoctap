import CatalogBrowser from "@/components/catalog/catalog-browser";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "pulsoicon-react";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Khám phá khóa học | Mây Mây",
  description:
    "Tìm kiếm và chọn lọc khóa học chất lượng cao theo môn học, khối lớp, mục tiêu ôn thi và giáo viên uy tín trên Mây Mây.",
  alternates: { canonical: "/courses" },
};

export default function CatalogPage() {
  return (
    <main className="user-container space-y-5 bg-background py-7 sm:py-9">
      {/* Breadcrumb điều hướng */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-primary">
          Trang chủ
        </Link>
        <ChevronRight animated={false} aria-hidden="true" className="size-3.5 text-border-strong" />
        <span className="font-medium text-foreground">Khám phá khóa học</span>
      </nav>

      <Suspense
        fallback={
          <div className="space-y-6 animate-pulse">
            <div className="h-48 w-full rounded-[28px] border border-border bg-surface" />
            <div className="h-28 w-full rounded-[24px] border border-border bg-surface" />
            <div className="grid items-start gap-6 lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-7">
              <div className="hidden h-96 rounded-[24px] border border-border bg-surface lg:block" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-72 rounded-[24px] border border-border bg-surface" />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <CatalogBrowser />
      </Suspense>
    </main>
  );
}
