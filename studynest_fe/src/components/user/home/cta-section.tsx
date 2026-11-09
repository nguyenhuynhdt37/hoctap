"use client";

import { useUserStore } from "@/stores/user";
import Link from "next/link";
import { HiGift } from "react-icons/hi";

const CTASection = () => {
  const user = useUserStore((s) => s.user);

  if (user) return null;

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-[32px] bg-gradient-to-br from-[#E8F2FA] via-[#F6FAFF] to-[#FCE8EF]/60 border border-[#E7EEF7] px-6 py-14 sm:px-12 sm:py-16 text-center relative overflow-hidden shadow-xs">
          <div className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 bg-[#BFD7ED]/30 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 bg-[#F7C9D9]/25 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/90 border border-[#BFD7ED] text-[#356FA7] mb-6">
              <span className="w-2 h-2 bg-[#356FA7] rounded-full mr-2.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Bắt đầu ngay hôm nay
              </span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#3D4A5A] tracking-tight mb-4">
              Sẵn sàng bắt đầu hành trình học tập?
            </h2>
            <p className="text-[#6F7C8C] text-base sm:text-lg mb-8 leading-relaxed">
              Tham gia cùng hàng trăm nghìn học viên đang phát triển kỹ năng và
              thăng tiến trong sự nghiệp với StudyNest
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
              <Link
                href="/register"
                className="group bg-[#356FA7] hover:bg-[#285C90] text-white px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center shadow-xs hover:shadow-sm cursor-pointer"
              >
                <HiGift className="mr-2.5 h-5 w-5" />
                Đăng ký miễn phí ngay
              </Link>
              <Link
                href="/courses"
                className="bg-white hover:bg-[#F6FAFF] border border-[#BFD7ED] text-[#356FA7] px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center cursor-pointer"
              >
                Tìm hiểu thêm
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
