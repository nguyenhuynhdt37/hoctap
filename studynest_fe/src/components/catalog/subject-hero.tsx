"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Gift, Globe2, Percent, Wallet } from "pulsoicon-react";
import { CoinBadge } from "@/components/ui";
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
    <section
      aria-label="Khám phá khóa học"
      className="relative isolate overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-accent/40 p-6 text-foreground shadow-[0_24px_48px_-14px_rgba(53,111,167,0.16)] sm:p-8 lg:p-10"
    >
      {/* Mây mờ nền chuẩn Cloudy Blue */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-white/80 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/4 -z-10 h-64 w-80 rounded-full bg-secondary-light/65 blur-3xl"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)] lg:items-center">
        {/* Cột trái: Tiêu đề Editorial + Quyền lợi đồng Coin */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary shadow-2xs">
              {isDiaLy ? (
                <Globe2 aria-hidden="true" animated={false} className="size-3.5 text-primary" />
              ) : (
                <BookOpen aria-hidden="true" animated={false} className="size-3.5 text-primary" />
              )}
              <span>{currentSubject ? `Chuyên đề ${currentSubject.name}` : "Học viện Mây Mây"}</span>
            </span>

            {totalCourses !== null && totalCourses !== undefined && (
              <span className="rounded-full border border-border bg-surface/90 px-3 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
                {totalCourses} khóa học công khai
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
            {currentSubject ? (
              <>
                Chinh phục môn{" "}
                <span className="text-primary">{currentSubject.name}</span>
              </>
            ) : (
              <>
                Khám phá kho tri thức{" "}
                <span className="text-primary">Mây Mây</span>
              </>
            )}
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {desc ||
              "Lọc khóa học theo khối lớp, môn học và mục tiêu thi cử. Giá khóa học tự động áp mã ưu đãi tốt nhất và chiết khấu ngay bằng số dư của bạn."}
          </p>

          {/* Dải ưu đãi đồng Coin trực quan */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-foreground shadow-2xs">
              <Percent aria-hidden="true" animated={false} className="size-3.5 text-primary" />
              <span>Chiết khấu 50%:</span>
              <CoinBadge kind="white" amount={10} size="sm" />
              <span>=</span>
              <CoinBadge kind="gold" amount={1} size="sm" />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-foreground shadow-2xs">
              <Gift aria-hidden="true" animated={false} className="size-3.5 text-primary" />
              <span>Mua xong hoàn</span>
              <CoinBadge kind="white" amount="+20%" size="sm" />
            </span>
          </div>
        </div>

        {/* Cột phải: Bento Card lối tắt Combo & Nạp Coin */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            href="/combo"
            className="group flex items-center justify-between gap-4 rounded-3xl border border-primary-pastel bg-surface/90 p-4 shadow-2xs backdrop-blur-sm transition-all hover:border-primary hover:bg-primary-light/50"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light text-primary">
                <Compass aria-hidden="true" className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Combo lộ trình học</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Học theo chuỗi bài giảng từ giảng viên, tiết kiệm hơn
                </p>
              </div>
            </div>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/wallets"
            className="group flex items-center justify-between gap-4 rounded-3xl border border-border bg-surface/90 p-4 shadow-2xs backdrop-blur-sm transition-all hover:border-primary-pastel hover:bg-primary-light/40"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/70 text-accent-vanilla-foreground">
                <Wallet aria-hidden="true" className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Nạp thêm số dư</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Quy đổi PayPal trực tuyến, sẵn sàng đăng ký khóa học
                </p>
              </div>
            </div>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        </div>
      </div>
    </section>
  );
}
