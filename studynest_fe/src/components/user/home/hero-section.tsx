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
    <section className="relative min-h-[90vh] bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute top-20 right-20 w-72 h-72 bg-green-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "6s" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center min-h-[90vh]">
        <div className="w-full">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center px-5 py-2 rounded-full bg-white shadow-sm border border-green-100">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              <span className="text-sm font-semibold text-green-700">
                500.000+ học viên đang tin tưởng
              </span>
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight">
                <span className="text-gray-900">Học tập không giới hạn</span>
                <br />
                <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Phát triển không ngừng
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                Khám phá hàng nghìn khóa học chất lượng cao từ các chuyên gia
                hàng đầu. Bắt đầu hành trình học tập của bạn ngay hôm nay.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <button
                onClick={onScrollToCourses}
                className="group bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center cursor-pointer"
              >
                <HiPlay className="mr-2 h-5 w-5" />
                Khám phá ngay
              </button>

              <button
                onClick={onScrollToCourses}
                className="group border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center cursor-pointer"
              >
                <HiSparkles className="mr-2 h-5 w-5" />
                Dùng thử miễn phí
              </button>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  500K+
                </div>
                <div className="text-sm font-medium text-gray-600 mt-1">
                  Học viên
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  10K+
                </div>
                <div className="text-sm font-medium text-gray-600 mt-1">
                  Khóa học
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  98%
                </div>
                <div className="text-sm font-medium text-gray-600 mt-1">
                  Hài lòng
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-4xl mx-auto">
            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <HiBookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Học mọi lúc, mọi nơi
              </h3>
              <p className="text-sm text-gray-600">
                Truy cập khóa học trên mọi thiết bị, học tập linh hoạt theo
                lịch trình của bạn
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <HiUsers className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Giảng viên chuyên nghiệp
              </h3>
              <p className="text-sm text-gray-600">
                Học từ các chuyên gia hàng đầu với kinh nghiệm thực tế phong
                phú
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <HiBadgeCheck className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Chứng chỉ uy tín
              </h3>
              <p className="text-sm text-gray-600">
                Nhận chứng chỉ được công nhận sau khi hoàn thành khóa học
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

