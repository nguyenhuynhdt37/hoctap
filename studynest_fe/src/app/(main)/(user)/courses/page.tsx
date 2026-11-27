import CatalogBrowser from "@/components/catalog/catalog-browser";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Khám phá khóa học | Mây Mây",
  description:
    "Tìm kiếm và chọn lọc khóa học chất lượng cao theo môn học, khối lớp, mục tiêu ôn thi và giáo viên uy tín trên Mây Mây.",
  alternates: { canonical: "/courses" },
};

export default function CatalogPage() {
  return (
    <main className="user-container space-y-6 bg-background py-8 sm:py-10">
      {/* Breadcrumb điều hướng */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors">
          Trang chủ
        </Link>
        <span aria-hidden="true" className="text-border">
          /
        </span>
        <span className="font-medium text-foreground">Khám phá khóa học</span>
      </nav>

      <Suspense
        fallback={
          <div className="space-y-6 animate-pulse">
            <div className="h-44 w-full rounded-[24px] bg-surface border border-border" />
            <div className="h-10 w-full max-w-md rounded-xl bg-surface border border-border" />
            <div className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
              <div className="hidden lg:block h-96 rounded-[20px] bg-surface border border-border" />
              <div className="user-card-grid">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-72 rounded-[20px] bg-surface border border-border" />
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
