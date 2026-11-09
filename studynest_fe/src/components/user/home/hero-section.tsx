"use client";

import {
  HiBadgeCheck,
  HiBookOpen,
  HiPlay,
  HiSparkles,
  HiUsers,
} from "react-icons/hi";

interface HeroSectionProps {
  onScrollToCourses: () => void;
}

const HeroSection = ({ onScrollToCourses }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F2FA]/85 via-[#F6FAFF] to-[#FFFFFF] border-b border-[#E7EEF7]">
      {/* Soft Pastel Ambient Accents (Cloudy Blue + Whisper of Pastel Pink) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 right-[10%] w-80 h-80 bg-[#BFD7ED]/35 rounded-full blur-3xl" />
        <div className="absolute top-32 left-[8%] w-72 h-72 bg-[#FCE8EF]/55 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Editorial Pill Badge */}
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white border border-[#BFD7ED]/80 shadow-xs">
            <span className="w-2 h-2 bg-[#356FA7] rounded-full mr-2.5" />
            <span className="text-xs sm:text-sm font-semibold text-[#356FA7] tracking-wide">
              500.000+ học viên đang tin tưởng
            </span>
          </div>

          {/* Editorial Headline using Lora (font-display) */}
          <div className="space-y-5">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.18] text-[#3D4A5A]">
              <span>Học tập không giới hạn</span>
              <br />
              <span className="text-[#356FA7] italic font-medium">
                Phát triển không ngừng
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#6F7C8C] leading-relaxed max-w-2xl mx-auto font-normal">
              Khám phá hàng nghìn khóa học chất lượng cao từ các chuyên gia hàng
              đầu. Bắt đầu hành trình học tập nhẹ nhàng và hiệu quả ngay hôm nay.
            </p>
          </div>

          {/* Primary & Outline CTAs */}
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center pt-2">
            <button
              onClick={onScrollToCourses}
              className="w-full sm:w-auto bg-[#356FA7] hover:bg-[#285C90] text-white px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 shadow-sm hover:-translate-y-0.5 flex items-center justify-center cursor-pointer"
            >
              <HiPlay className="mr-2 h-5 w-5" />
              Khám phá ngay
            </button>

            <button
              onClick={onScrollToCourses}
              className="w-full sm:w-auto border border-[#BFD7ED] bg-white text-[#356FA7] hover:bg-[#E8F2FA] hover:border-[#356FA7]/40 px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center cursor-pointer"
            >
              <HiSparkles className="mr-2 h-5 w-5 text-[#356FA7]" />
              Dùng thử miễn phí
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-6 pt-10 max-w-xl mx-auto border-t border-[#E7EEF7]/80">
            <div className="text-center">
              <div className="font-display text-2xl sm:text-3xl font-semibold text-[#3D4A5A]">
                500K+
              </div>
              <div className="text-xs sm:text-sm font-medium text-[#6F7C8C] mt-1">
                Học viên
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-2xl sm:text-3xl font-semibold text-[#3D4A5A]">
                10K+
              </div>
              <div className="text-xs sm:text-sm font-medium text-[#6F7C8C] mt-1">
                Khóa học
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-2xl sm:text-3xl font-semibold text-[#356FA7]">
                98%
              </div>
              <div className="text-xs sm:text-sm font-medium text-[#6F7C8C] mt-1">
                Hài lòng
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-14 max-w-5xl mx-auto">
          <div className="group bg-white rounded-[20px] p-6 shadow-xs hover:shadow-md transition-all duration-200 border border-[#E7EEF7] hover:border-[#BFD7ED]">
            <div className="w-11 h-11 bg-[#E8F2FA] text-[#356FA7] rounded-xl flex items-center justify-center mb-4 transition-colors duration-200 group-hover:bg-[#BFD7ED]/70">
              <HiBookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-[#3D4A5A] mb-2">
              Học mọi lúc, mọi nơi
            </h3>
            <p className="text-sm text-[#6F7C8C] leading-relaxed">
              Truy cập khóa học trên mọi thiết bị, học tập linh hoạt theo lịch
              trình của bạn
            </p>
          </div>

          <div className="group bg-white rounded-[20px] p-6 shadow-xs hover:shadow-md transition-all duration-200 border border-[#E7EEF7] hover:border-[#BFD7ED]">
            <div className="w-11 h-11 bg-[#FCE8EF] text-[#3D4A5A] rounded-xl flex items-center justify-center mb-4 transition-colors duration-200 group-hover:bg-[#F7C9D9]/80">
              <HiUsers className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-[#3D4A5A] mb-2">
              Giảng viên chuyên nghiệp
            </h3>
            <p className="text-sm text-[#6F7C8C] leading-relaxed">
              Học từ các chuyên gia hàng đầu với kinh nghiệm thực tế phong phú
            </p>
          </div>

          <div className="group bg-white rounded-[20px] p-6 shadow-xs hover:shadow-md transition-all duration-200 border border-[#E7EEF7] hover:border-[#BFD7ED]">
            <div className="w-11 h-11 bg-[#E3D5F5]/55 text-[#3D4A5A] rounded-xl flex items-center justify-center mb-4 transition-colors duration-200 group-hover:bg-[#E3D5F5]">
              <HiBadgeCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-[#3D4A5A] mb-2">
              Chứng chỉ uy tín
            </h3>
            <p className="text-sm text-[#6F7C8C] leading-relaxed">
              Nhận chứng chỉ được công nhận sau khi hoàn thành khóa học
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
