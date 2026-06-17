"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { HoldEarningsResponse } from "@/types/lecturer/hold";
import { LecturerWallet } from "@/types/lecturer/wallet";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  HiArrowRight,
  HiChartBar,
  HiClock,
  HiCurrencyDollar,
  HiPlay,
  HiPlus,
  HiSparkles,
  HiStar,
  HiUsers,
  HiVideoCamera,
} from "react-icons/hi";
import useSWR from "swr";

interface IsLecturerResponse {
  is_lecturer: boolean;
}

const LecturerHome = () => {
  const router = useRouter();
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  // Check if user is lecturer
  const {
    data: lecturerData,
    error: lecturerError,
    isLoading: isCheckingLecturer,
  } = useSWR<IsLecturerResponse>(
    "/lecturer/courses/is_lecturer",
    async (url) => {
      try {
        const response = await api.get(url);
        return response.data;
      } catch (error: any) {
        // If 400, 401, 403, 404 - user is not a lecturer (expected)
        if ([400, 401, 403, 404].includes(error.response?.status || 0)) {
          // Return null to indicate user is not a lecturer
          return null;
        }
        // For other errors, throw to let SWR handle
        throw error;
      }
    },
    {
      shouldRetryOnError: false, // Don't retry on expected errors
    }
  );

  const isLecturer = lecturerData?.is_lecturer === true;
  const isLoading = isCheckingLecturer;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra...</p>
        </div>
      </div>
    );
  }

  // If user is lecturer, show dashboard
  if (isLecturer) {
    return <LecturerDashboard router={router} />;
  }

  // For non-lecturers, show simple hero section (like user home page)
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Similar to user home */}
      <section className="relative min-h-[90vh] bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div
            className="absolute top-20 right-20 w-72 h-72 bg-green-200/30 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: "4s" }}
          ></div>
          <div
            className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: "6s" }}
          ></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center min-h-[90vh]">
          <div className="w-full">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center px-5 py-2 rounded-full bg-white shadow-sm border border-green-100">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                <span className="text-sm font-semibold text-green-700">
                  Trở thành giảng viên ngay hôm nay
                </span>
              </div>

              {/* Main Heading */}
              <div className="space-y-6">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight">
                  <span className="text-gray-900">Trở thành giảng viên</span>
                  <br />
                  <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Chia sẻ kiến thức và kiếm thu nhập
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                  Tham gia cộng đồng giảng viên hàng đầu tại StudyNest. Tạo khóa
                  học, chia sẻ kiến thức và kiếm thu nhập từ đam mê của bạn.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <button
                  onClick={() => router.push("/lecturer/courses/create")}
                  className="group bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center"
                >
                  <HiPlay className="mr-2 h-5 w-5" />
                  Bắt đầu ngay
                </button>

                <button className="group border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center">
                  <HiSparkles className="mr-2 h-5 w-5" />
                  Tìm hiểu thêm
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    10K+
                  </div>
                  <div className="text-sm font-medium text-gray-600 mt-1">
                    Giảng viên
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    50K+
                  </div>
                  <div className="text-sm font-medium text-gray-600 mt-1">
                    Khóa học
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
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
              <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <HiVideoCamera className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Tạo khóa học dễ dàng
                </h3>
                <p className="text-sm text-gray-600">
                  Công cụ tạo nội dung trực quan, hỗ trợ video, quiz, tài liệu
                </p>
              </div>

              <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <HiCurrencyDollar className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Thu nhập hấp dẫn
                </h3>
                <p className="text-sm text-gray-600">
                  Nhận 70% hoa hồng từ mỗi khóa học, thanh toán nhanh chóng
                </p>
              </div>

              <div className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <HiUsers className="h-6 w-6 text-white" />
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
    </div>
  );
};

// Dashboard component for registered lecturers
const LecturerDashboard = ({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) => {
  // Fetch wallet data
  const { data: wallet } = useSWR<LecturerWallet>(
    "/lecturer/wallets/lecturer/wallet",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Fetch hold earnings count
  const { data: holdData } = useSWR<HoldEarningsResponse>(
    "/lecturer/transactions/earnings/holding?page=1&limit=1",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const holdCount = holdData?.total || 0;

  const formatCurrency = (value?: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            Chào mừng trở lại! 👋
          </h1>
          <p className="text-gray-600 text-lg">
            Quản lý khóa học, theo dõi học viên và phát triển sự nghiệp giảng
            dạy của bạn
          </p>
        </div>

        {/* 3 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Truy cập nhanh
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/lecturer/courses/create")}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-green-200 hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <HiPlus className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      Tạo khóa học mới
                    </p>
                    <p className="text-xs text-gray-500">Bắt đầu ngay</p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/lecturer/courses")}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-green-200 hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <HiVideoCamera className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      Quản lý khóa học
                    </p>
                    <p className="text-xs text-gray-500">Xem tất cả</p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/lecturer/wallets")}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-green-200 hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <HiCurrencyDollar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      Ví của giảng viên
                    </p>
                    <p className="text-xs text-gray-500">Quản lý tài chính</p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/lecturer/hold")}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-green-200 hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-left group relative"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <HiClock className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      Giao dịch đang hold
                    </p>
                    <p className="text-xs text-gray-500">Xem chi tiết</p>
                  </div>
                  {holdCount > 0 && (
                    <span className="bg-green-600 text-white text-xs font-semibold rounded-full px-2 py-1 min-w-[20px] text-center">
                      {holdCount > 99 ? "99+" : holdCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => router.push("/lecturer/refund")}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-green-200 hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg
                      className="h-5 w-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      Yêu cầu hoàn tiền
                    </p>
                    <p className="text-xs text-gray-500">Quản lý refund</p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/lecturer/analytics")}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-green-200 hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <HiChartBar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      Thống kê & Báo cáo
                    </p>
                    <p className="text-xs text-gray-500">Theo dõi hiệu quả</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Middle Column - Stats */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Thống kê tổng quan
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <HiVideoCamera className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tổng khóa học</p>
                      <p className="text-2xl font-bold text-gray-900">-</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/lecturer/courses")}
                    className="text-green-600 hover:text-green-700"
                  >
                    <HiArrowRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <HiUsers className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tổng học viên</p>
                      <p className="text-2xl font-bold text-gray-900">-</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/lecturer/analytics")}
                    className="text-green-600 hover:text-green-700"
                  >
                    <HiArrowRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <HiStar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Đánh giá TB</p>
                      <p className="text-2xl font-bold text-gray-900">-</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/lecturer/analytics")}
                    className="text-green-600 hover:text-green-700"
                  >
                    <HiArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Wallet & Hold */}
          <div className="lg:col-span-1 space-y-6">
            {/* Wallet Card */}
            <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 rounded-xl border border-green-200 shadow-lg p-6 text-white">
              <h2 className="text-lg font-bold mb-4">Ví của giảng viên</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-white/80 mb-1">Số dư hiện tại</p>
                  <p className="text-3xl font-bold">
                    {wallet ? formatCurrency(wallet.balance) : "-"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                  <div>
                    <p className="text-xs text-white/70 mb-1">Tổng nạp</p>
                    <p className="text-lg font-semibold">
                      {wallet ? formatCurrency(wallet.total_in) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/70 mb-1">Tổng rút</p>
                    <p className="text-lg font-semibold">
                      {wallet ? formatCurrency(wallet.total_out) : "-"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/lecturer/wallets")}
                  className="w-full mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors text-sm"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>

            {/* Hold Transactions Card */}
            <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Giao dịch đang hold
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <HiClock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Số lượng</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {holdCount}
                      </p>
                    </div>
                  </div>
                  {holdCount > 0 && (
                    <span className="bg-green-600 text-white text-xs font-semibold rounded-full px-2 py-1">
                      Cần xử lý
                    </span>
                  )}
                </div>
                <button
                  onClick={() => router.push("/lecturer/hold")}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>

            {/* Getting Started */}
            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center shrink-0">
                  <HiSparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">Bắt đầu ngay</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Tạo khóa học đầu tiên và chia sẻ kiến thức của bạn
                  </p>
                  <button
                    onClick={() => router.push("/lecturer/courses/create")}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm"
                  >
                    Tạo khóa học
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerHome;
