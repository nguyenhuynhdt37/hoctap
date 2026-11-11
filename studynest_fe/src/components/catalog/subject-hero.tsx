"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Globe2, Layers, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui";
import type { BrowseSubjectOption } from "@/types/catalog";

interface SubjectHeroProps {
  currentSubject?: BrowseSubjectOption | null;
  totalCourses?: number | null;
}

const NEUTRAL_DESCRIPTIONS: Record<string, string> = {
  "dia-ly":
    "Môn Địa lí bao gồm kiến thức về địa lí tự nhiên, dân cư và các vùng kinh tế - xã hội. Sử dụng bộ lọc bên dưới để chọn khóa học theo khối lớp hoặc mục tiêu học tập.",
  toan:
    "Môn Toán học bao gồm các chuyên đề đại số, giải tích và hình học. Sử dụng bộ lọc để tìm khóa học theo khối lớp và mục tiêu học tập phù hợp.",
  "ngu-van":
    "Môn Ngữ văn bao gồm các bài giảng về đọc hiểu văn bản và phương pháp làm văn nghị luận. Sử dụng bộ lọc để chọn khóa học theo chương trình học.",
  "tieng-anh":
    "Môn Tiếng Anh bao gồm ngữ pháp, từ vựng và kỹ năng đọc hiểu. Lọc theo lớp hoặc mục tiêu để tìm kiếm khóa học phù hợp.",
  "vat-ly":
    "Môn Vật lí bao gồm các chủ đề cơ học, sóng, điện từ và vật lý hiện đại. Sử dụng bộ lọc để tìm khóa học theo từng khối lớp.",
  "hoa-hoc":
    "Môn Hóa học bao gồm hóa học đại cương, vô cơ và hữu cơ. Sử dụng bộ lọc để tìm kiếm bài giảng theo khối lớp.",
  "sinh-hoc":
    "Môn Sinh học bao gồm sinh học tế bào, di truyền học và sinh thái học. Lọc theo lớp để chọn khóa học phù hợp.",
  "lich-su":
    "Môn Lịch sử bao gồm các giai đoạn lịch sử Việt Nam và thế giới. Sử dụng bộ lọc để tìm kiếm khóa học theo từng giai đoạn.",
};

export function SubjectHero({ currentSubject, totalCourses }: SubjectHeroProps) {
  const isDiaLy = currentSubject?.slug === "dia-ly" || currentSubject?.code === "dia-ly";
  const desc = currentSubject?.slug ? NEUTRAL_DESCRIPTIONS[currentSubject.slug] : null;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-surface/90 p-6 sm:p-8 md:p-10 shadow-xs backdrop-blur-xl">
      {/* Vùng đốm mây Ambient Gradient trang trí */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-light/60 blur-3xl -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-secondary-light/40 blur-3xl -z-10"
        aria-hidden="true"
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Cột trái: Tiêu đề & Thông điệp trung tính */}
        <div className="max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary" className="text-xs px-3 py-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" />
              {currentSubject ? `Danh mục ${currentSubject.name}` : "Tất cả khóa học"}
            </Badge>

            {totalCourses !== null && totalCourses !== undefined && (
              <span className="text-xs font-medium text-muted-foreground">
                • {totalCourses} khóa học công khai
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {currentSubject ? (
              <>
                Khóa học môn <span className="text-primary">{currentSubject.name}</span>
              </>
            ) : (
              <>
                Khám phá kho khóa học <span className="text-primary">Mây Mây</span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {desc ||
              "Lọc khóa học theo khối lớp, môn học, mục tiêu học tập và đơn vị đào tạo trên hệ thống Mây Mây."}
          </p>

          {/* Lối tắt Lộ trình & Combo điều hướng chuẩn (Link styled như nút, không nested button) */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/lo-trinh"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-light px-3.5 py-2 text-xs font-semibold text-primary border border-primary-pastel/80 hover:bg-primary-pastel/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Compass className="w-4 h-4 text-primary" />
              <span>Khám phá lộ trình</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/combo"
              className="inline-flex items-center gap-2 rounded-xl bg-surface px-3.5 py-2 text-xs font-semibold text-foreground border border-border hover:bg-surface-hover hover:border-border-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span>Combo khóa học</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Cột phải: Visual Card biểu trưng môn học */}
        <div className="hidden lg:flex items-center justify-center shrink-0">
          <div className="relative flex h-36 w-36 items-center justify-center rounded-[24px] border border-primary-pastel/80 bg-primary-light/50 p-6 shadow-sm">
            <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-primary-light via-surface to-secondary-light/30 opacity-70" />
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              {isDiaLy ? (
                <Globe2 className="h-14 w-14 text-primary" />
              ) : (
                <BookOpen className="h-14 w-14 text-primary" />
              )}
              <span className="mt-2 text-xs font-semibold text-foreground">
                {currentSubject?.name || "Mây Mây"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
