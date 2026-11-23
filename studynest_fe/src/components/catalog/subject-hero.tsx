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
      className="relative isolate overflow-hidden rounded-[32px] border border-[#BFD7ED]/35 bg-gradient-to-br from-[#13263A] via-[#1E3F63] to-[#2C5B8B] p-6 text-white shadow-lg sm:p-8 lg:p-10"
    >
      {/* Hào quang nền đồng bộ phong cách Atelier VIP */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-[#F5C542]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/4 -z-10 h-64 w-80 rounded-full bg-[#BFD7ED]/20 blur-3xl"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)] lg:items-center">
        {/* Cột trái: Tiêu đề Editorial + Quyền lợi đồng Coin */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F5C542]/50 bg-[#F5C542]/18 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#FFE89E]">
              {isDiaLy ? (
                <Globe2 aria-hidden="true" animated={false} className="size-3.5 text-[#FFD55A]" />
              ) : (
                <BookOpen aria-hidden="true" animated={false} className="size-3.5 text-[#FFD55A]" />
              )}
              <span>{currentSubject ? `Chuyên đề ${currentSubject.name}` : "Học viện Mây Mây"}</span>
            </span>

            {totalCourses !== null && totalCourses !== undefined && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 tabular-nums">
                {totalCourses} khóa học công khai
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
            {currentSubject ? (
              <>
                Chinh phục môn{" "}
                <span className="text-[#FFE89E]">{currentSubject.name}</span>
              </>
            ) : (
              <>
                Khám phá kho tri thức{" "}
                <span className="text-[#FFE89E]">Mây Mây</span>
              </>
            )}
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            {desc ||
              "Lọc khóa học theo khối lớp, môn học và mục tiêu thi cử. Giá khóa học tự động áp mã ưu đãi tốt nhất và chiết khấu ngay bằng số dư của bạn."}
          </p>

          {/* Dải ưu đãi đồng Coin trực quan */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white/90 backdrop-blur-sm">
              <Percent aria-hidden="true" animated={false} className="size-3.5 text-[#FFE89E]" />
              <span>Chiết khấu 50%:</span>
              <CoinBadge kind="white" amount={10} surface="dark" size="sm" />
              <span>=</span>
              <CoinBadge kind="gold" amount={1} surface="dark" size="sm" />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white/90 backdrop-blur-sm">
              <Gift aria-hidden="true" animated={false} className="size-3.5 text-[#BFD7ED]" />
              <span>Mua xong hoàn</span>
              <CoinBadge kind="white" amount="+20%" surface="dark" size="sm" />
            </span>
          </div>
        </div>

        {/* Cột phải: Bento Card lối tắt Combo & Nạp Coin */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            href="/combo"
            className="group flex items-center justify-between gap-4 rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-md transition-all hover:border-[#F5C542]/60 hover:bg-white/15"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#F5C542]/45 bg-[#F5C542]/20 text-[#FFD55A]">
                <Compass aria-hidden="true" className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Combo lộ trình học</p>
                <p className="mt-0.5 text-xs text-white/75">
                  Học theo chuỗi bài giảng từ giảng viên, tiết kiệm hơn
                </p>
              </div>
            </div>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-[#FFE89E] transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/wallets"
            className="group flex items-center justify-between gap-4 rounded-3xl border border-white/15 bg-white/8 p-4 backdrop-blur-md transition-all hover:border-white/35 hover:bg-white/14"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/12 text-[#BFD7ED]">
                <Wallet aria-hidden="true" className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Nạp thêm số dư</p>
                <p className="mt-0.5 text-xs text-white/75">
                  Quy đổi PayPal realtime, sẵn sàng đăng ký khóa học
                </p>
              </div>
            </div>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-white/80 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
