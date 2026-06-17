"use client";

import { useUserStore } from "@/stores/user";
import { HiGift } from "react-icons/hi";

const CTASection = () => {
  const user = useUserStore((s) => s.user);

  if (user) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-6">
          <span className="w-2 h-2 bg-white rounded-full mr-3 animate-pulse" />
          <span className="text-sm font-semibold">Bắt đầu ngay hôm nay</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-black mb-4">
          Sẵn sàng bắt đầu hành trình học tập?
        </h2>
        <p className="text-green-100 text-lg mb-10 max-w-2xl mx-auto">
          Tham gia cùng hàng trăm nghìn học viên đang phát triển kỹ năng và
          thăng tiến trong sự nghiệp với StudyNest
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="group bg-white hover:bg-gray-50 text-green-600 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer">
            <HiGift className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
            Đăng ký miễn phí ngay
          </button>
          <button className="border-2 border-white hover:bg-white hover:text-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 backdrop-blur-sm hover:scale-105 cursor-pointer">
            Tìm hiểu thêm
          </button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
