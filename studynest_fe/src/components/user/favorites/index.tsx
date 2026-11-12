"use client";

import Link from "next/link";
import { FavoritesPanel } from "./favorites-panel";

export default function FavoritesSection() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Mục yêu thích & Đã lưu
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Theo dõi những khóa học bạn đã lưu để dễ dàng quay lại và đăng ký khi sẵn sàng
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="inline-flex items-center rounded-xl border border-border bg-surface p-1 shadow-2xs">
            <Link
              href="/favorites"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary-light text-primary shadow-2xs"
            >
              Khóa học yêu thích
            </Link>
            <Link
              href="/favorites/instructors"
              className="px-4 py-2 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Giáo viên đã lưu
            </Link>
          </div>
        </div>

        <FavoritesPanel />
      </div>
    </div>
  );
}
