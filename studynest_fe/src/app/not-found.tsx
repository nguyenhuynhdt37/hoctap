"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiArrowLeft, HiBookOpen, HiHome, HiSearch } from "react-icons/hi";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          {/* 404 Number */}
          <h1 className="text-8xl md:text-9xl font-black text-green-600 mb-4">
            404
          </h1>

          {/* Message */}
          <div className="max-w-2xl mb-8 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Trang không tồn tại
            </h2>
            <p className="text-lg text-gray-600">
              Có vẻ như bạn đã lạc đường rồi. Trang bạn đang tìm kiếm không tồn
              tại hoặc đã được chuyển đi nơi khác.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Link
              href="/"
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <HiHome className="h-5 w-5" />
              Về Trang Chủ
            </Link>

            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
            >
              <HiArrowLeft className="h-5 w-5" />
              Quay Lại
            </button>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
            <Link
              href="/"
              className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white text-xl">
                  <HiHome />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Trang Chủ</h3>
                  <p className="text-sm text-gray-600">Khám phá khóa học</p>
                </div>
              </div>
            </Link>

            <Link
              href="/course"
              className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white text-xl">
                  <HiBookOpen />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Khóa Học</h3>
                  <p className="text-sm text-gray-600">Danh sách khóa học</p>
                </div>
              </div>
            </Link>

            <Link
              href="/course"
              className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white text-xl">
                  <HiSearch />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Tìm Kiếm</h3>
                  <p className="text-sm text-gray-600">Tìm nội dung học</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Footer Message */}
          <p className="mt-12 text-gray-500 text-sm">
            Nếu bạn cho rằng đây là lỗi, vui lòng{" "}
            <Link
              href="/"
              className="text-green-600 hover:text-green-700 font-medium underline"
            >
              liên hệ với chúng tôi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
