"use client";

import { useEffect, useState } from "react";
import {
  HiAcademicCap,
  HiChartBar,
  HiChevronLeft,
  HiChevronRight,
  HiCurrencyDollar,
  HiLightningBolt,
  HiSparkles,
  HiTrendingUp,
  HiUsers,
  HiVideoCamera,
} from "react-icons/hi";

const LecturerSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Chia sẻ kiến thức, tạo thu nhập",
      subtitle: "Biến chuyên môn của bạn thành khóa học online",
      description:
        "Tham gia cộng đồng hơn 10,000 giảng viên đang kiếm thu nhập từ việc giảng dạy trực tuyến",
      icon: HiAcademicCap,
      iconBg: "bg-[#E8F2FA] text-[#356FA7] border-[#BFD7ED]",
      stats: [
        { icon: HiUsers, value: "10K+", label: "Giảng viên" },
        { icon: HiVideoCamera, value: "50K+", label: "Khóa học" },
        { icon: HiCurrencyDollar, value: "100M+", label: "Thu nhập" },
      ],
    },
    {
      title: "Công cụ tạo khóa học mạnh mẽ",
      subtitle: "Dễ dàng tạo và quản lý khóa học của bạn",
      description:
        "Nền tảng tích hợp đầy đủ công cụ để bạn tạo nội dung, quản lý học viên và theo dõi doanh thu",
      icon: HiLightningBolt,
      iconBg: "bg-[#FCE8EF] text-[#8A3B58] border-[#F7C9D9]",
      stats: [
        { icon: HiSparkles, value: "4.8/5", label: "Đánh giá" },
        { icon: HiChartBar, value: "95%", label: "Hoàn thành" },
        { icon: HiTrendingUp, value: "+45%", label: "Tăng trưởng" },
      ],
    },
    {
      title: "Hỗ trợ toàn diện cho giảng viên",
      subtitle: "Đội ngũ hỗ trợ chuyên nghiệp 24/7",
      description:
        "Chúng tôi đồng hành cùng bạn từ khâu tạo khóa học đến marketing và bán hàng",
      icon: HiUsers,
      iconBg: "bg-[#E3D5F5]/60 text-[#593E7A] border-[#E3D5F5]",
      stats: [
        { icon: HiAcademicCap, value: "24/7", label: "Hỗ trợ" },
        { icon: HiChartBar, value: "100%", label: "Miễn phí" },
        { icon: HiCurrencyDollar, value: "70%", label: "Hoa hồng" },
      ],
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative bg-gradient-to-br from-[#E8F2FA] via-[#F6FAFF] to-[#FCE8EF]/40 border-b border-[#E7EEF7] overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#BFD7ED30_1px,transparent_1px),linear-gradient(to_bottom,#BFD7ED30_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_110%)]" />

      <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-20">
        <div className="flex items-center justify-between gap-4 md:gap-8 relative">
          <button
            onClick={prevSlide}
            className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-white border border-[#E7EEF7] shadow-xs hover:bg-[#356FA7] text-[#356FA7] hover:text-white transition-all duration-200 z-10 cursor-pointer"
            aria-label="Slide trước"
          >
            <HiChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex-1 relative min-h-[380px] md:min-h-[440px]">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-300 ${
                  index === currentSlide
                    ? "opacity-100 scale-100 z-10"
                    : "opacity-0 scale-98 z-0 pointer-events-none"
                }`}
              >
                {index === currentSlide && (
                  <div className="text-center max-w-4xl mx-auto">
                    <div className="flex justify-center mb-5">
                      <div
                        className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-xs ${slide.iconBg}`}
                      >
                        <slide.icon className="h-8 w-8" />
                      </div>
                    </div>

                    <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-[#3D4A5A] mb-3 leading-tight tracking-tight">
                      {slide.title}
                    </h1>

                    <p className="text-lg md:text-xl font-semibold text-[#356FA7] mb-3">
                      {slide.subtitle}
                    </p>

                    <p className="text-sm md:text-base text-[#6F7C8C] mb-8 max-w-2xl mx-auto px-4 leading-relaxed">
                      {slide.description}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3.5 justify-center mb-10 px-4">
                      <button className="px-6 py-3 bg-[#356FA7] hover:bg-[#285C90] text-white font-semibold text-sm md:text-base rounded-xl shadow-xs transition-all duration-200 cursor-pointer">
                        <span className="flex items-center justify-center gap-2">
                          <HiVideoCamera className="h-5 w-5" />
                          Tạo khóa học ngay
                        </span>
                      </button>

                      <button className="px-6 py-3 bg-white border border-[#BFD7ED] text-[#356FA7] hover:bg-[#E8F2FA] font-semibold text-sm md:text-base rounded-xl transition-all duration-200 cursor-pointer">
                        Tìm hiểu thêm
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-xl mx-auto px-4">
                      {slide.stats.map((stat, idx) => (
                        <div
                          key={idx}
                          className="bg-white/90 border border-[#E7EEF7] rounded-2xl p-3 md:p-4 shadow-2xs"
                        >
                          <stat.icon className="h-6 w-6 text-[#356FA7] mx-auto mb-1.5" />
                          <p className="text-lg md:text-xl font-bold text-[#3D4A5A]">
                            {stat.value}
                          </p>
                          <p className="text-xs text-[#6F7C8C]">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-white border border-[#E7EEF7] shadow-xs hover:bg-[#356FA7] text-[#356FA7] hover:text-white transition-all duration-200 z-10 cursor-pointer"
            aria-label="Slide tiếp theo"
          >
            <HiChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-center items-center gap-2 mt-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`rounded-full transition-all duration-200 cursor-pointer ${
                index === currentSlide
                  ? "bg-[#356FA7] w-8 h-2.5"
                  : "bg-[#BFD7ED] hover:bg-[#356FA7]/60 w-2.5 h-2.5"
              }`}
              aria-label={`Chuyển đến slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LecturerSlider;
