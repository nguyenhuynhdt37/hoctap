"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Coins,
  FileText,
  GraduationCap,
  ShieldCheck,
  Tag,
  Users,
  Video,
  Wallet,
} from "pulsoicon-react";
import { useCoinBalances } from "@/lib/learning-hub/shop-hooks";
import {
  DEFAULT_COIN_VND_RATE,
  formatCoin,
  formatVnd,
} from "@/lib/learning-hub/coin-logic";
import { useUserStore } from "@/stores/user";
import {
  BecomeLecturerAction,
  LECTURER_ACTIVATION_COIN_FEE,
} from "./become";

const STUDIO_CAPABILITIES = [
  {
    icon: Video,
    badge: "Course Builder",
    title: "Studio Bài giảng Video & Tài liệu",
    desc: "Xây dựng chương trình học kéo-thả trực quan, nhúng video chất lượng cao, đính kèm tài liệu PDF và xem trước góc nhìn học viên.",
    accent: "bg-primary-light text-primary border-primary-pastel",
  },
  {
    icon: Bot,
    badge: "AI Teaching Suite",
    title: "Bộ công cụ AI Tạo bài tập 1 chạm",
    desc: "Tự động tạo Quiz, Flashcards, bài luyện Nghe (Listening), Luyện nói nhập vai (Speaking Roleplay) và Điền khuyết chuẩn sư phạm.",
    accent: "bg-accent text-accent-foreground border-accent-border",
  },
  {
    icon: ShieldCheck,
    badge: "PKI X.509 · PAdES",
    title: "Ký Hợp đồng Điện tử Chuẩn Pháp lý",
    desc: "Cấp chứng thư số X.509 định danh, ký hợp đồng khung & phụ lục phát hành khóa học, xuất PDF nhúng chữ ký số có mã QR xác thực.",
    accent: "bg-success-bg text-success-foreground border-success-border",
  },
  {
    icon: Wallet,
    badge: "70% Revenue Share",
    title: "Ví Coin Minh bạch & Rút tiền Chủ động",
    desc: "Hưởng trọn 70% doanh thu mỗi khóa học bán ra, theo dõi dòng tiền Coin theo thời gian thực và gửi yêu cầu rút tiền bất cứ lúc nào.",
    accent:
      "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
  },
  {
    icon: Tag,
    badge: "Growth & Promo",
    title: "Tự thiết kế Chiến dịch Mã giảm giá",
    desc: "Phát hành mã khuyến mãi % hoặc giảm Coin trực tiếp cho từng khóa học, theo dõi hiệu quả lượt đổi mã ngay trên bảng điều khiển.",
    accent: "bg-secondary-light text-secondary-foreground border-secondary-pastel",
  },
  {
    icon: BarChart3,
    badge: "Analytics 360°",
    title: "Thống kê Học viên & Đánh giá Chuyên sâu",
    desc: "Nắm bắt biểu đồ ghi danh, tỷ lệ hoàn thành bài học, đánh giá sao và xuất danh sách học viên chỉ trong một cú bấm.",
    accent: "bg-info-bg text-info-foreground border-info-border",
  },
];

const JOURNEY_STEPS = [
  {
    step: "01",
    title: "Ký Hợp đồng Điện tử X.509",
    desc: "Đọc rõ tỷ lệ chia sẻ 70/30, ký số bằng Cloud PKI Mây Mây hoặc chứng thư .p12 cá nhân và nhận PDF có mã QR.",
  },
  {
    step: "02",
    title: "Kích hoạt 100 Coin trọn đời",
    desc: "Thanh toán 1 lần duy nhất 100 Coin vàng từ ví — mở khóa toàn bộ đặc quyền Giảng viên không giới hạn số khóa học.",
  },
  {
    step: "03",
    title: "Xuất bản Khóa học đầu tiên",
    desc: "Tải bài giảng video, nhờ AI sinh bài tập tương tác và mở bán khóa học tới hàng ngàn học viên Mây Mây.",
  },
  {
    step: "04",
    title: "Nhận 70% Doanh thu & Rút Coin",
    desc: "Doanh thu ghi nhận tự động vào ví sau 7 ngày đối soát; rút tiền linh hoạt với quy trình kiểm soát minh bạch.",
  },
];

const FAQS = [
  {
    q: "Phí 100 Coin trở thành Giảng viên đóng một lần hay hàng tháng?",
    a: "Chỉ đóng 1 lần duy nhất (100 Coin vàng ≈ 1.000.000 VNĐ). Bạn sở hữu tư cách Giảng viên trọn đời, tạo không giới hạn khóa học và không phát sinh bất kỳ phí duy trì nào.",
  },
  {
    q: "Tỷ lệ chia sẻ doanh thu và thời gian rút tiền hoạt động ra sao?",
    a: "Giảng viên hưởng 70% doanh thu thực thu (30% phí hạ tầng nền tảng). Tiền bán khóa học được đối soát trong 7 ngày để bảo đảm chính sách hoàn tiền, sau đó cộng thẳng vào số dư Coin vàng khả dụng để bạn rút về tài khoản.",
  },
  {
    q: "Chữ ký điện tử khi đăng ký Giảng viên có cần thiết bị USB Token không?",
    a: "Không cần! Mây Mây cung cấp sẵn Cloud PKI X.509 (bảo vệ bằng mã PIN 6 số + OTP Email) giúp bạn ký hợp đồng điện tử chuẩn PAdES ngay trên trình duyệt. Nếu đã có chứng thư số mềm (.p12 / .pfx), bạn vẫn có thể tải lên để ký trực tiếp.",
  },
  {
    q: "Nếu ví hiện chưa đủ 100 Coin vàng thì tôi phải làm gì?",
    a: "Bạn chỉ cần bấm 'Nạp thêm Coin' để nạp đủ 100 Coin vàng vào ví cá nhân, sau đó quay lại trang này để ký hợp đồng và kích hoạt tư cách Giảng viên trong chưa đầy 1 phút.",
  },
];

const LecturerWelcome = () => {
  const user = useUserStore((s) => s.user);
  const { data: coins } = useCoinBalances();

  // Interactive Revenue Simulator State
  const [coursePriceCoin, setCoursePriceCoin] = useState(50);
  const [monthlyStudents, setMonthlyStudents] = useState(30);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const rateVnd = coins?.rateVnd ?? DEFAULT_COIN_VND_RATE;
  const paidCoin = coins?.paid ?? 0;
  const hasEnough = paidCoin >= LECTURER_ACTIVATION_COIN_FEE;

  const grossMonthlyCoin = coursePriceCoin * monthlyStudents;
  const netMonthlyCoin = Math.round(grossMonthlyCoin * 0.7);
  const netMonthlyVnd = netMonthlyCoin * rateVnd;
  const netYearlyVnd = netMonthlyVnd * 12;
  const studentsToBreakEven = Math.max(
    1,
    Math.ceil(LECTURER_ACTIVATION_COIN_FEE / Math.max(1, coursePriceCoin * 0.7)),
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient Cloud Sky Blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-10 h-[420px] w-[420px] rounded-full bg-primary-light/80 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-[380px] w-[380px] rounded-full bg-accent-vanilla/55 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-secondary-light/50 blur-3xl" />
      </div>

      <main className="mx-auto max-w-[1320px] space-y-16 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* 1. EDITORIAL CLOUD HERO + 100 COIN PARTNER PASS */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/90 bg-gradient-to-br from-primary-light/95 via-surface/95 to-accent-vanilla/45 p-6 shadow-[0_32px_72px_-24px_rgba(53,111,167,0.22)] backdrop-blur-md sm:p-10 lg:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/80 blur-3xl"
          />

          <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            {/* Left Copy */}
            <div className="space-y-6 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/95 px-3.5 py-1 text-xs font-semibold text-primary shadow-2xs">
                  <Cloud size={14} animated={false} />
                  Mây Mây Faculty Onboarding
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-accent-vanilla/80 px-3 py-1 text-xs font-bold text-accent-vanilla-foreground">
                  <Coins size={13} animated={false} />
                  Phí kích hoạt 1 lần: 100 Coin
                </span>
              </div>

              <h1 className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl">
                Biến tri thức của bạn thành{" "}
                <span className="text-primary">học viện số bền vững</span> trên
                bầu trời Mây Mây
              </h1>

              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Sở hữu trọn bộ công cụ sản xuất khóa học hỗ trợ AI, hệ thống ký
                hợp đồng điện tử chuẩn <strong>PKI X.509 / PAdES</strong> minh
                bạch pháp lý và giữ trọn <strong>70% doanh thu</strong> từ mọi
                học viên ghi danh.
              </p>

              {/* Quick Trust Highlights */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="rounded-2xl border border-white/85 bg-surface/85 p-3.5 backdrop-blur-sm">
                  <p className="font-display text-2xl font-bold text-primary">
                    70%
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                    Chia sẻ doanh thu cho Giảng viên
                  </p>
                </div>
                <div className="rounded-2xl border border-white/85 bg-surface/85 p-3.5 backdrop-blur-sm">
                  <p className="font-display text-2xl font-bold text-foreground">
                    100 Coin
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                    Kích hoạt 1 lần · Trọn đời
                  </p>
                </div>
                <div className="rounded-2xl border border-white/85 bg-surface/85 p-3.5 backdrop-blur-sm">
                  <p className="font-display text-2xl font-bold text-success-foreground">
                    X.509
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                    Hợp đồng số &amp; PDF PAdES
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <BecomeLecturerAction />
                <a
                  href="#revenue-simulator"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-primary-pastel bg-surface/90 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary-light"
                >
                  Ước tính thu nhập
                  <ArrowRight size={15} animated={false} />
                </a>
              </div>
            </div>

            {/* Right: Floating Partner Boarding Pass (100 Coin) */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-[2rem] border border-primary-pastel bg-surface/95 shadow-[0_24px_60px_-20px_rgba(53,111,167,0.28)]">
                {/* Pass Header */}
                <div className="bg-gradient-to-r from-primary-light via-primary-light/70 to-accent-vanilla/60 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                      <Award size={15} animated={false} />
                      Thẻ Đối tác Giảng viên
                    </span>
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-bold text-primary shadow-2xs">
                      TRỌN ĐỜI
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold text-foreground">
                      100 Coin
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      ≈ {formatVnd(LECTURER_ACTIVATION_COIN_FEE * rateVnd)}
                    </span>
                  </div>
                </div>

                {/* Perforated Divider */}
                <div className="relative flex items-center bg-surface">
                  <span
                    aria-hidden="true"
                    className="h-5 w-2.5 rounded-r-full border-y border-r border-border bg-background"
                  />
                  <div className="mx-2 flex-1 border-t border-dashed border-border" />
                  <span
                    aria-hidden="true"
                    className="h-5 w-2.5 rounded-l-full border-y border-l border-border bg-background"
                  />
                </div>

                {/* Pass Body */}
                <div className="space-y-4 px-6 pb-6 pt-3">
                  <ul className="space-y-2.5 text-xs text-foreground">
                    {[
                      "Tạo không giới hạn khóa học, bài giảng & bài tập AI",
                      "Cấp Chứng thư số X.509 & ký Hợp đồng Điện tử PAdES",
                      "Hưởng 70% doanh thu thực thu, rút Coin linh hoạt",
                      "Toàn quyền phát hành mã giảm giá & quản lý học viên",
                    ].map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2">
                        <CheckCircle2
                          size={15}
                          animated={false}
                          className="mt-0.5 shrink-0 text-success-foreground"
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Live Coin Balance Pill */}
                  {user && (
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Wallet size={14} animated={false} className="text-primary" />
                        Coin vàng hiện có
                      </span>
                      <div className="flex items-center gap-2">
                        <strong
                          className={
                            hasEnough
                              ? "text-success-foreground"
                              : "text-warning-foreground"
                          }
                        >
                          {formatCoin(paidCoin)}
                        </strong>
                        {!hasEnough && (
                          <Link
                            href="/wallets"
                            className="rounded-lg bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            Nạp Coin
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  <BecomeLecturerAction
                    label="Ký Hợp đồng & Kích hoạt 100 Coin"
                    size="md"
                    fullWidth
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. BENTO STUDIO SHOWCASE */}
        <section className="space-y-6">
          <div className="mx-auto max-w-2xl text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/80 px-3 py-1 text-xs font-semibold text-primary">
              <GraduationCap size={13} animated={false} />
              Đặc quyền Hệ sinh thái Giảng dạy
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Mọi công cụ bạn cần để sáng tạo &amp; tăng trưởng doanh thu
            </h2>
            <p className="text-sm text-muted-foreground">
              Không chỉ là nơi đăng video — Mây Mây trang bị cho bạn cả một
              phòng studio AI, sổ cái Coin và hạ tầng chữ ký điện tử chuyên nghiệp.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {STUDIO_CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <article
                  key={cap.title}
                  className="group flex flex-col justify-between rounded-3xl border border-primary-pastel/60 bg-surface/95 p-6 shadow-[0_12px_32px_-16px_rgba(53,111,167,0.14)] transition-all hover:-translate-y-1 hover:border-primary hover:shadow-[0_20px_44px_-18px_rgba(53,111,167,0.22)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${cap.accent}`}
                      >
                        <Icon size={20} animated={false} />
                      </span>
                      <span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {cap.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-bold text-foreground group-hover:text-primary">
                      {cap.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {cap.desc}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 3. INTERACTIVE REVENUE SIMULATOR */}
        <section
          id="revenue-simulator"
          className="rounded-[2.5rem] border border-primary-pastel/80 bg-gradient-to-br from-surface via-primary-light/35 to-accent-vanilla/35 p-6 shadow-[0_20px_52px_-20px_rgba(53,111,167,0.18)] sm:p-10"
        >
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-accent-vanilla px-3 py-1 text-xs font-semibold text-accent-vanilla-foreground">
                  <Coins size={13} animated={false} />
                  Mô phỏng Thu nhập Giảng viên (70%)
                </span>
                <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  Bao lâu để hoàn vốn phí 100 Coin?
                </h2>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Kéo hai thanh trượt bên dưới để ước tính doanh thu thực nhận
                  sau khi trừ 30% phí nền tảng.
                </p>
              </div>

              {/* Slider 1: Course Price in Coin */}
              <div className="space-y-2 rounded-2xl border border-border bg-surface/90 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    Giá bán mỗi khóa học
                  </span>
                  <span className="font-bold text-primary">
                    {formatCoin(coursePriceCoin)}{" "}
                    <span className="font-normal text-muted-foreground">
                      (≈ {formatVnd(coursePriceCoin * rateVnd)})
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={5}
                  value={coursePriceCoin}
                  onChange={(e) => setCoursePriceCoin(Number(e.target.value))}
                  aria-label="Giá bán mỗi khóa học tính bằng Coin"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-primary-light accent-primary"
                />
              </div>

              {/* Slider 2: Students per Month */}
              <div className="space-y-2 rounded-2xl border border-border bg-surface/90 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    Số học viên đăng ký mỗi tháng
                  </span>
                  <span className="font-bold text-primary">
                    {monthlyStudents} học viên / tháng
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={monthlyStudents}
                  onChange={(e) => setMonthlyStudents(Number(e.target.value))}
                  aria-label="Số học viên đăng ký mỗi tháng"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-primary-light accent-primary"
                />
              </div>
            </div>

            {/* Simulator Result Card */}
            <div className="lg:col-span-6">
              <div className="rounded-[2rem] border border-primary-pastel bg-surface p-6 shadow-md sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Thu nhập thực nhận (70%)
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-3 py-1 text-[11px] font-bold text-success-foreground">
                    Hoàn vốn sau {studentsToBreakEven} học viên
                  </span>
                </div>

                <div>
                  <p className="font-display text-4xl font-bold text-primary sm:text-5xl">
                    {formatCoin(netMonthlyCoin)}
                    <span className="text-base font-medium text-muted-foreground">
                      {" "}
                      / tháng
                    </span>
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    ≈ {formatVnd(netMonthlyVnd)} / tháng
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-border/80 pt-4 text-xs">
                  <div className="rounded-2xl bg-primary-light/50 p-3.5">
                    <p className="text-muted-foreground">Ước tính 1 năm</p>
                    <p className="mt-1 text-base font-bold text-primary">
                      {formatVnd(netYearlyVnd)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-background p-3.5">
                    <p className="text-muted-foreground">Phí kích hoạt 1 lần</p>
                    <p className="mt-1 text-base font-bold text-foreground">
                      100 Coin
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. 4-STEP JOURNEY TIMELINE */}
        <section className="space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Hành trình 4 bước để bắt đầu giảng dạy
            </h2>
            <p className="text-sm text-muted-foreground">
              Nhanh gọn, minh bạch pháp lý và kích hoạt tức thì ngay trên trình duyệt.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {JOURNEY_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-primary-pastel/60 bg-surface p-5 shadow-xs"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light font-display text-sm font-bold text-primary">
                  {item.step}
                </span>
                <h3 className="mt-3.5 text-sm font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. FAQ ACCORDION */}
        <section className="mx-auto max-w-3xl space-y-5">
          <div className="text-center space-y-1.5">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Câu hỏi thường gặp
            </h2>
            <p className="text-xs text-muted-foreground">
              Mọi thông tin về phí 100 Coin, hợp đồng điện tử X.509 và chia sẻ doanh thu.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-2xl border border-border bg-surface transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-bold text-foreground hover:bg-primary-light/30"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={16}
                      animated={false}
                      className={`shrink-0 text-primary transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/70 bg-background/40 px-5 py-3.5 text-xs leading-relaxed text-muted-foreground">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. BOTTOM CTA BANNER */}
        <section className="rounded-[2.5rem] border border-primary-pastel bg-gradient-to-r from-primary-light via-surface to-accent-vanilla/60 p-8 text-center shadow-[0_20px_52px_-20px_rgba(53,111,167,0.2)] sm:p-10">
          <div className="mx-auto max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1 text-xs font-semibold text-primary shadow-2xs">
              <FileText size={13} animated={false} />
              Sẵn sàng đồng hành cùng cộng đồng học tập Mây Mây
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Ký hợp đồng số &amp; mở học viện của riêng bạn hôm nay
            </h2>
            <p className="text-sm text-muted-foreground">
              Phí kích hoạt trọn đời chỉ <strong>100 Coin</strong> — nhận ngay
              chứng thư số X.509, studio AI tạo bài giảng và 70% doanh thu bền vững.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <BecomeLecturerAction />
              <Link
                href="/wallets"
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-border bg-surface px-5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
              >
                <Users size={15} animated={false} className="text-primary" />
                Kiểm tra ví Coin
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LecturerWelcome;
