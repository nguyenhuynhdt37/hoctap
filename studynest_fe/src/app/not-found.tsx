"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Compass,
  HelpCircle,
  Home,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";

/**
 * Trang lỗi 404 chuẩn Cloudy Blue Design System (Mây Mây V2)
 * Phong cách: Korean Pastel Minimalism (thanh lịch, thoáng đãng, thân thiện với học sinh THPT)
 */
export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary-pastel/60 selection:text-foreground overflow-hidden">
      {/* Vùng đốm mây Ambient Pastel trang trí nền */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-primary-light/70 via-secondary-light/40 to-transparent blur-3xl rounded-full -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -left-32 w-80 h-80 bg-primary-pastel/30 blur-3xl rounded-full -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-20 -right-24 w-96 h-96 bg-secondary-pastel/25 blur-3xl rounded-full -z-10"
        aria-hidden="true"
      />

      {/* 1. Header nhỏ gọn thanh lịch */}
      <header className="w-full border-b border-border/60 bg-surface/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform hover:scale-[1.01]"
            aria-label="Về trang chủ Mây Mây"
          >
            <div className="w-9 h-9 rounded-xl bg-primary-light border border-primary-pastel/70 flex items-center justify-center transition-colors group-hover:bg-primary-pastel/70 shadow-2xs">
              <img
                src="/logo/studynest-logo.svg"
                alt="Mây Mây Logo"
                width={22}
                height={22}
                className="w-5 h-5 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center text-base sm:text-lg font-bold tracking-tight">
                <span className="text-foreground">Study</span>
                <span className="text-primary ml-0.5">Nest</span>
              </div>
              <span className="text-[10px] font-medium text-subtle-foreground tracking-widest uppercase -mt-0.5">
                Học viện trên mây
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/help"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary-light/50"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Trung tâm hỗ trợ
            </Link>
            <Link href="/">
              <Button variant="pastel" size="sm">
                Trang chủ
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Nội dung chính (Hero 404) */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 md:py-16 text-center max-w-4xl mx-auto w-full">
        {/* Status Pill Badge */}
        <div className="mb-6 inline-flex items-center">
          <Badge
            variant="info"
            className="px-3.5 py-1 text-xs font-medium tracking-wide shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary animate-pulse" />
            Lỗi 404 • Không tìm thấy khoảng trời này
          </Badge>
        </div>

        {/* Cụm số 404 kết hợp linh vật Mây Mây */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 my-2 select-none">
          <span className="font-display text-7xl sm:text-8xl md:text-9xl font-bold tracking-tighter text-primary/85 leading-none">
            4
          </span>

          {/* Bạn Mây Mây Chibi 404 SVG Illustration */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 flex items-center justify-center">
            <svg
              viewBox="0 0 160 160"
              className="w-full h-full drop-shadow-sm transition-transform duration-500 hover:scale-105"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Hình minh họa bạn Mây Mây đang bối rối tìm trang"
              role="img"
            >
              {/* Vầng sáng sau lưng */}
              <circle
                cx="80"
                cy="80"
                r="64"
                fill="url(#cloudGlow)"
                opacity="0.6"
              />

              {/* Đám mây thân chính */}
              <g filter="url(#cloudShadow)">
                {/* 3 khối mây phồng mềm mại */}
                <circle cx="58" cy="88" r="28" fill="url(#cloudBody)" />
                <circle cx="102" cy="88" r="26" fill="url(#cloudBody)" />
                <circle cx="80" cy="72" r="34" fill="url(#cloudBody)" />
                <rect
                  x="46"
                  y="86"
                  width="68"
                  height="26"
                  rx="13"
                  fill="url(#cloudBody)"
                />
              </g>

              {/* Viền sáng trên đỉnh mây */}
              <ellipse
                cx="78"
                cy="62"
                rx="20"
                ry="8"
                fill="#FFFFFF"
                opacity="0.45"
              />

              {/* Chiếc mũ cử nhân nhỏ xinh nghiêng trên đầu */}
              <g transform="translate(62, 38) rotate(-8)">
                <polygon
                  points="18,0 36,7 18,14 0,7"
                  fill="#285C90"
                  stroke="#356FA7"
                  strokeWidth="1"
                />
                <rect
                  x="12"
                  y="12"
                  width="12"
                  height="7"
                  rx="3.5"
                  fill="#1F4B77"
                />
                {/* Dây tua rua màu vàng kem pastel */}
                <path
                  d="M18 7 C26 7, 28 14, 29 20"
                  stroke="#F8E9C9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="29" cy="20" r="2" fill="#875415" />
              </g>

              {/* Gương mặt Mây Mây biểu cảm ngơ ngác đáng yêu */}
              {/* Đôi mắt tròn chớp nhẹ */}
              <ellipse cx="68" cy="84" rx="3.5" ry="4.5" fill="#2C3744" />
              <circle cx="69.5" cy="82.5" r="1.3" fill="#FFFFFF" />

              <ellipse cx="92" cy="84" rx="3.5" ry="4.5" fill="#2C3744" />
              <circle cx="93.5" cy="82.5" r="1.3" fill="#FFFFFF" />

              {/* Đôi má phớt hồng pastel */}
              <ellipse
                cx="59"
                cy="90"
                rx="5"
                ry="3"
                fill="#F7C9D9"
                opacity="0.8"
              />
              <ellipse
                cx="101"
                cy="90"
                rx="5"
                ry="3"
                fill="#F7C9D9"
                opacity="0.8"
              />

              {/* Miệng nhỏ tròn ngạc nhiên */}
              <circle cx="80" cy="91" r="3" fill="#8A3B58" opacity="0.8" />
              <circle cx="80" cy="90.5" r="1.8" fill="#FCE8EF" />

              {/* Dấu hỏi chấm nhỏ pastel bên cạnh biểu thị lạc đường */}
              <g transform="translate(118, 54)">
                <text
                  x="0"
                  y="16"
                  fontFamily="Lora, serif"
                  fontSize="22"
                  fontWeight="bold"
                  fill="#B85678"
                  opacity="0.85"
                >
                  ?
                </text>
              </g>

              {/* Các ngôi sao lấp lánh pastel xung quanh */}
              <path
                d="M36 58 L37.5 63 L42.5 64.5 L37.5 66 L36 71 L34.5 66 L29.5 64.5 L34.5 63 Z"
                fill="#F7C9D9"
              />
              <circle cx="44" cy="52" r="1.5" fill="#BFD7ED" />
              <circle cx="128" cy="96" r="2" fill="#BFD7ED" />

              {/* Định nghĩa Gradient & Filters */}
              <defs>
                <linearGradient
                  id="cloudBody"
                  x1="50"
                  y1="50"
                  x2="110"
                  y2="115"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="70%" stopColor="#F6FAFF" />
                  <stop offset="100%" stopColor="#E8F2FA" />
                </linearGradient>

                <radialGradient
                  id="cloudGlow"
                  cx="80"
                  cy="80"
                  r="64"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#BFD7ED" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#E8F2FA" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#F6FAFF" stopOpacity="0" />
                </radialGradient>

                <filter
                  id="cloudShadow"
                  x="20"
                  y="40"
                  width="120"
                  height="85"
                  filterUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="6"
                    floodColor="#356FA7"
                    floodOpacity="0.12"
                  />
                </filter>
              </defs>
            </svg>
          </div>

          <span className="font-display text-7xl sm:text-8xl md:text-9xl font-bold tracking-tighter text-primary/85 leading-none">
            4
          </span>
        </div>

        {/* Tiêu đề & Thông điệp biên tập (Editorial Tone) */}
        <div className="max-w-2xl mx-auto space-y-3.5 mb-8">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Khoảng trời này chưa có bài học nào!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Đường liên kết bạn tìm kiếm có thể đã thay đổi, không còn tồn tại
            hoặc vừa bay theo một cụm mây khác. Đừng lo lắng, hãy cùng Mây Mây
            khám phá các góc học tập quen thuộc nhé!
          </p>
        </div>

        {/* Nhóm nút hành động chính (CTAs) */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <Link href="/">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Về Trang Chủ
            </Button>
          </Link>

          <Link href="/course">
            <Button
              variant="pastel"
              size="lg"
              leftIcon={<Compass className="w-4 h-4" />}
            >
              Khám Phá Khóa Học
            </Button>
          </Link>

          <Button
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Quay Lại
          </Button>
        </div>

        {/* Quick Links Gợi ý điểm đến (Cards) */}
        <div className="w-full">
          <div className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground mb-4">
            Hoặc tiếp tục hành trình tại
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {/* Card 1: Khóa học */}
            <Link
              href="/course"
              className="group p-5 bg-surface rounded-[20px] border border-border hover:border-primary-pastel hover:shadow-ambient-md transition-all duration-200 block"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 border border-primary-pastel/60 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Khóa học THPT</span>
                    <span className="text-xs text-muted-foreground group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    Toán, Văn, Anh, Lý, Hóa... từ lớp 10 đến lớp 12 bám sát đề
                    thi.
                  </p>
                </div>
              </div>
            </Link>

            {/* Card 2: Lộ trình */}
            <Link
              href="/lo-trinh"
              className="group p-5 bg-surface rounded-[20px] border border-border hover:border-secondary-pastel hover:shadow-ambient-md transition-all duration-200 block"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-secondary-light text-secondary-foreground flex items-center justify-center shrink-0 border border-secondary-pastel/60 group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-secondary-foreground transition-colors flex items-center justify-between">
                    <span>Lộ trình học tập</span>
                    <span className="text-xs text-muted-foreground group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    Kế hoạch ôn tập cá nhân hóa, vững vàng tiến bước vào đại học.
                  </p>
                </div>
              </div>
            </Link>

            {/* Card 3: Trợ giúp */}
            <Link
              href="/help"
              className="group p-5 bg-surface rounded-[20px] border border-border hover:border-accent-border hover:shadow-ambient-md transition-all duration-200 block"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0 border border-accent-border/60 group-hover:scale-105 transition-transform">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-accent-foreground transition-colors flex items-center justify-between">
                    <span>Trung tâm hỗ trợ</span>
                    <span className="text-xs text-muted-foreground group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    Giải đáp câu hỏi, hướng dẫn tài khoản và hỗ trợ kỹ thuật
                    24/7.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* 3. Footer mini tinh giản */}
      <footer className="w-full border-t border-border/60 bg-surface/40 py-5 text-center text-xs text-subtle-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>© 2026 Mây Mây • Nền tảng học tập trực tuyến Lớp 1 – 12.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/help"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Báo cáo lỗi đường dẫn
            </Link>
            <span aria-hidden="true">•</span>
            <Link
              href="/"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
