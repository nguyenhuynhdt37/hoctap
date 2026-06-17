"use client";

import { useRouter } from "next/navigation";
import {
  HiCurrencyDollar,
  HiPlay,
  HiUsers,
  HiVideoCamera,
} from "react-icons/hi";
import { BecomeLecturerAction } from "./become";

const LecturerWelcome = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] bg-gradient-to-br from-[#00a73d]/5 via-white to-[#00a73d]/10 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0">
            <div
              className="absolute top-20 right-20 w-72 h-72 bg-[#00a73d]/20 rounded-full blur-3xl animate-pulse"
              style={{ animationDuration: "4s" }}
            ></div>
            <div
              className="absolute bottom-20 left-20 w-96 h-96 bg-[#00a73d]/10 rounded-full blur-3xl animate-pulse"
              style={{ animationDuration: "6s" }}
            ></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center min-h-[90vh]">
            <div className="w-full">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                {/* Badge */}
                {/* Badge */}
                <div className="inline-flex items-center px-5 py-2 rounded-full bg-white shadow-sm border border-gray-100">
                  <span className="w-2 h-2 bg-[#00a73d] rounded-full mr-2 animate-pulse"></span>
                  <span className="text-sm font-semibold text-[#00a73d]">
                    Trở thành giảng viên ngay hôm nay
                  </span>
                </div>

                {/* Main Heading */}
                <div className="space-y-6">
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight">
                    <span className="text-gray-900">Trở thành giảng viên</span>
                    <br />
                    <span className="bg-gradient-to-r from-[#00a73d] to-[#008a32] bg-clip-text text-transparent">
                      Chia sẻ kiến thức và kiếm thu nhập
                    </span>
                  </h1>

                  <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                    Tham gia cộng đồng giảng viên hàng đầu tại StudyNest. Tạo
                    khóa học, chia sẻ kiến thức và kiếm thu nhập từ đam mê của
                    bạn.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                  <BecomeLecturerAction />

                  <button
                    onClick={() => router.push("/lecturer/courses/create")}
                    className="group border-2 border-[#00a73d] text-[#00a73d] hover:bg-[#00a73d] hover:text-white px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center"
                  >
                    <HiPlay className="mr-2 h-5 w-5" />
                    Tạo khóa học
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-black text-[#00a73d]">
                      10K+
                    </div>
                    <div className="text-sm font-medium text-gray-600 mt-1">
                      Giảng viên
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-black text-[#00a73d]">
                      50K+
                    </div>
                    <div className="text-sm font-medium text-gray-600 mt-1">
                      Khóa học
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-black text-[#00a73d]">
                      70%
                    </div>
                    <div className="text-sm font-medium text-gray-600 mt-1">
                      Hoa hồng
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-4xl mx-auto">
                <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#00a73d]/30 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-[#00a73d]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <HiVideoCamera className="h-6 w-6 text-[#00a73d]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Tạo khóa học dễ dàng
                  </h3>
                  <p className="text-sm text-gray-600">
                    Công cụ tạo nội dung trực quan, hỗ trợ video, quiz, tài liệu
                  </p>
                </div>

                <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#00a73d]/30 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-[#00a73d]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <HiCurrencyDollar className="h-6 w-6 text-[#00a73d]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Thu nhập hấp dẫn
                  </h3>
                  <p className="text-sm text-gray-600">
                    Nhận 70% hoa hồng từ mỗi khóa học, thanh toán nhanh chóng
                  </p>
                </div>

                <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#00a73d]/30 hover:-translate-y-1">
                  <div className="w-12 h-12 bg-[#00a73d]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <HiUsers className="h-6 w-6 text-[#00a73d]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Cộng đồng lớn mạnh
                  </h3>
                  <p className="text-sm text-gray-600">
                    Tham gia cộng đồng 10,000+ giảng viên đang phát triển
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LecturerWelcome;
