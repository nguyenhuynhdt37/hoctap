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
    <div className="min-h-screen bg-[#F6FAFF] flex flex-col">
      <main className="flex-grow">
        <section className="relative min-h-[90vh] bg-gradient-to-br from-[#E8F2FA] via-[#F6FAFF] to-[#FCE8EF]/40 overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-16 right-16 w-72 h-72 bg-[#BFD7ED]/30 rounded-full blur-3xl" />
            <div className="absolute bottom-16 left-16 w-80 h-80 bg-[#F7C9D9]/25 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center min-h-[90vh]">
            <div className="w-full">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/90 shadow-2xs border border-[#BFD7ED]">
                  <span className="w-2 h-2 bg-[#356FA7] rounded-full mr-2.5" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#356FA7]">
                    Trở thành giảng viên ngay hôm nay
                  </span>
                </div>

                <div className="space-y-5">
                  <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-[#3D4A5A]">
                    <span>Trở thành giảng viên</span>
                    <br />
                    <span className="text-[#356FA7]">
                      Chia sẻ kiến thức và kiếm thu nhập
                    </span>
                  </h1>

                  <p className="text-base sm:text-lg text-[#6F7C8C] leading-relaxed max-w-2xl mx-auto">
                    Tham gia cộng đồng giảng viên hàng đầu tại StudyNest. Tạo
                    khóa học, chia sẻ kiến thức và kiếm thu nhập từ đam mê của
                    bạn.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center pt-2">
                  <BecomeLecturerAction />

                  <button
                    onClick={() => router.push("/lecturer/courses/create")}
                    className="group bg-white border border-[#BFD7ED] text-[#356FA7] hover:bg-[#E8F2FA] px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 flex items-center cursor-pointer"
                  >
                    <HiPlay className="mr-2 h-5 w-5" />
                    Tạo khóa học
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-10 max-w-xl mx-auto">
                  <div className="text-center bg-white/80 border border-[#E7EEF7] rounded-2xl p-4">
                    <div className="font-display text-2xl sm:text-3xl font-bold text-[#356FA7]">
                      10K+
                    </div>
                    <div className="text-xs font-medium text-[#6F7C8C] mt-1">
                      Giảng viên
                    </div>
                  </div>
                  <div className="text-center bg-white/80 border border-[#E7EEF7] rounded-2xl p-4">
                    <div className="font-display text-2xl sm:text-3xl font-bold text-[#356FA7]">
                      50K+
                    </div>
                    <div className="text-xs font-medium text-[#6F7C8C] mt-1">
                      Khóa học
                    </div>
                  </div>
                  <div className="text-center bg-white/80 border border-[#E7EEF7] rounded-2xl p-4">
                    <div className="font-display text-2xl sm:text-3xl font-bold text-[#356FA7]">
                      70%
                    </div>
                    <div className="text-xs font-medium text-[#6F7C8C] mt-1">
                      Hoa hồng
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-4xl mx-auto">
                <div className="group bg-white rounded-[20px] p-6 shadow-xs hover:shadow-md transition-all duration-200 border border-[#E7EEF7] hover:border-[#BFD7ED] hover:-translate-y-0.5">
                  <div className="w-12 h-12 bg-[#E8F2FA] rounded-xl flex items-center justify-center mb-4">
                    <HiVideoCamera className="h-6 w-6 text-[#356FA7]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#3D4A5A] mb-2">
                    Tạo khóa học dễ dàng
                  </h3>
                  <p className="text-sm text-[#6F7C8C] leading-relaxed">
                    Công cụ tạo nội dung trực quan, hỗ trợ video, quiz, tài liệu
                  </p>
                </div>

                <div className="group bg-white rounded-[20px] p-6 shadow-xs hover:shadow-md transition-all duration-200 border border-[#E7EEF7] hover:border-[#BFD7ED] hover:-translate-y-0.5">
                  <div className="w-12 h-12 bg-[#FCE8EF] rounded-xl flex items-center justify-center mb-4">
                    <HiCurrencyDollar className="h-6 w-6 text-[#8A3B58]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#3D4A5A] mb-2">
                    Thu nhập hấp dẫn
                  </h3>
                  <p className="text-sm text-[#6F7C8C] leading-relaxed">
                    Nhận 70% hoa hồng từ mỗi khóa học, thanh toán nhanh chóng
                  </p>
                </div>

                <div className="group bg-white rounded-[20px] p-6 shadow-xs hover:shadow-md transition-all duration-200 border border-[#E7EEF7] hover:border-[#BFD7ED] hover:-translate-y-0.5">
                  <div className="w-12 h-12 bg-[#E3D5F5]/60 rounded-xl flex items-center justify-center mb-4">
                    <HiUsers className="h-6 w-6 text-[#593E7A]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#3D4A5A] mb-2">
                    Cộng đồng lớn mạnh
                  </h3>
                  <p className="text-sm text-[#6F7C8C] leading-relaxed">
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
