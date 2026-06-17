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
      gradient: "from-green-500 to-emerald-600",
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
      gradient: "from-emerald-500 to-teal-600",
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
      gradient: "from-teal-500 to-cyan-600",
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
    <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98120_1px,transparent_1px),linear-gradient(to_bottom,#10b98120_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_110%)]" />

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-green-300/20 rounded-full blur-3xl animate-float"
          style={{ top: "10%", left: "10%" }}
        />
        <div
          className="absolute w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl animate-float"
          style={{ top: "60%", right: "10%", animationDelay: "2s" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="flex items-center justify-between gap-4 md:gap-8 relative">
          {/* Prev Navigation Button - Hiển thị trên tất cả màn hình */}
          <button
            onClick={prevSlide}
            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition-all duration-300 z-10"
            aria-label="Slide trước"
          >
            <HiChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
          </button>

          {/* Slide Content */}
          <div className="flex-1 relative min-h-[400px] md:min-h-[500px]">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-500 ${
                  index === currentSlide
                    ? "opacity-100 scale-100 z-10"
                    : "opacity-0 scale-95 z-0 pointer-events-none"
                }`}
              >
                {index === currentSlide && (
                  <div className="text-center max-w-4xl mx-auto">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                      <div
                        className={`w-20 h-20 bg-gradient-to-br ${slide.gradient} rounded-2xl flex items-center justify-center shadow-lg animate-bounce-slow`}
                      >
                        <slide.icon className="h-10 w-10 text-white" />
                      </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 mb-4 leading-tight">
                      {slide.title}
                    </h1>

                    {/* Subtitle */}
                    <p className="text-lg md:text-xl lg:text-2xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                      {slide.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-base md:text-lg text-gray-600 mb-8 max-w-2xl mx-auto px-4">
                      {slide.description}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 px-4">
                      <button
                        className={`group px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r ${slide.gradient} text-white font-bold text-base md:text-lg rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <HiVideoCamera className="h-5 w-5 md:h-6 md:w-6" />
                          Tạo khóa học ngay
                        </span>
                      </button>

                      <button className="px-6 md:px-8 py-3 md:py-4 bg-white border-2 border-green-200 text-gray-700 font-bold text-base md:text-lg rounded-xl hover:border-green-400 hover:shadow-lg active:scale-95 transition-all duration-300">
                        Tìm hiểu thêm
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-2xl mx-auto px-4">
                      {slide.stats.map((stat, idx) => (
                        <div
                          key={idx}
                          className="bg-white/80 backdrop-blur-sm rounded-xl p-3 md:p-4 shadow-md hover:shadow-lg transition-shadow"
                        >
                          <stat.icon className="h-6 w-6 md:h-8 md:w-8 text-green-600 mx-auto mb-2" />
                          <p className="text-xl md:text-2xl font-bold text-gray-900">
                            {stat.value}
                          </p>
                          <p className="text-xs md:text-sm text-gray-600">
                            {stat.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Next Navigation Button - Hiển thị trên tất cả màn hình */}
          <button
            onClick={nextSlide}
            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition-all duration-300 z-10"
            aria-label="Slide tiếp theo"
          >
            <HiChevronRight className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
          </button>
        </div>

        {/* Dots Indicator - Cải thiện để dễ nhấn hơn */}
        <div className="flex justify-center items-center gap-2 md:gap-3 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-green-600 w-10 h-3"
                  : "bg-green-200 hover:bg-green-300 w-3 h-3"
              }`}
              aria-label={`Chuyển đến slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          33% {
            transform: translateY(-20px) translateX(10px);
          }
          66% {
            transform: translateY(20px) translateX(-10px);
          }
        }

        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LecturerSlider;
