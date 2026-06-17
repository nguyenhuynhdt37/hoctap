"use client";

import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { Course } from "@/types/user/course_detail";
import { useRouter } from "next/navigation";
import { HiAcademicCap, HiCheckCircle, HiClock } from "react-icons/hi";

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  totalDurationSeconds: number;
  courseSlug: string | null;
  isEnrolling: boolean;
  enrollSuccess: boolean;
  onEnroll: () => void;
  formatPrice: (price: number, currency?: string) => string;
  formatSecondsToHms: (seconds: number) => string;
  finalPrice?: number;
  discountAmount?: number;
  discountCode?: string;
  discountName?: string;
}

export default function EnrollmentModal({
  isOpen,
  onClose,
  course,
  totalDurationSeconds,
  courseSlug,
  isEnrolling,
  enrollSuccess,
  onEnroll,
  formatPrice,
  formatSecondsToHms,
  finalPrice,
  discountAmount,
  discountCode,
  discountName,
}: EnrollmentModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isEnrolling && onClose()}
      />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-300">
        {!enrollSuccess ? (
          <>
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiAcademicCap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Xác nhận đăng ký
              </h3>
              <p className="text-teal-100">
                Bạn có chắc chắn muốn đăng ký khóa học này?
              </p>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <img
                  src={getGoogleDriveImageUrl(course.thumbnail_url)}
                  alt={course.title}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-lg leading-tight mb-2">
                    {course.title}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <HiClock className="h-4 w-4" />
                    <span>{formatSecondsToHms(totalDurationSeconds)}</span>
                    <span>•</span>
                    <span>
                      {course.sections.reduce(
                        (total, section) => total + section.lessons.length,
                        0
                      )}{" "}
                      bài học
                    </span>
                  </div>
                  <div className="mt-2">
                    {finalPrice !== undefined && finalPrice < course.base_price ? (
                      <div className="space-y-1">
                        <div className="text-lg text-gray-500 line-through">
                          {formatPrice(course.base_price, course.currency)}
                        </div>
                        <div className="text-2xl font-bold text-teal-600">
                          {formatPrice(finalPrice, course.currency)}
                        </div>
                        {discountAmount !== undefined && discountAmount > 0 && (
                          <div className="text-sm text-green-600 font-medium">
                            Tiết kiệm {formatPrice(discountAmount, course.currency)}
                          </div>
                        )}
                      </div>
                    ) : (
                    <span className="text-2xl font-bold text-teal-600">
                      {formatPrice(course.base_price, course.currency)}
                    </span>
                    )}
                  </div>
                  {/* Hiển thị mã giảm giá đã áp dụng */}
                  {discountCode && (
                    <div className="mt-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
                        <span className="text-xs font-semibold text-gray-600">Mã đã áp dụng:</span>
                        <span className="text-sm font-mono font-bold text-red-600">
                          {discountCode}
                        </span>
                        {discountName && (
                          <span className="text-xs text-gray-600">
                            ({discountName})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-teal-50 rounded-lg p-4 mb-6">
                <h5 className="font-semibold text-teal-800 mb-3 flex items-center gap-2">
                  <HiCheckCircle className="h-5 w-5" />
                  Bạn sẽ nhận được:
                </h5>
                <ul className="space-y-2 text-sm text-teal-700">
                  <li className="flex items-center gap-2">
                    <HiCheckCircle className="h-4 w-4" />
                    <span>Truy cập trọn đời</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <HiCheckCircle className="h-4 w-4" />
                    <span>Chứng chỉ hoàn thành</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <HiCheckCircle className="h-4 w-4" />
                    <span>Hỗ trợ 24/7</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <HiCheckCircle className="h-4 w-4" />
                    <span>Đảm bảo hoàn tiền 30 ngày</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isEnrolling}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  onClick={onEnroll}
                  disabled={isEnrolling || !courseSlug}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                    courseSlug && !isEnrolling
                      ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700"
                      : "bg-gray-400 text-gray-200 cursor-not-allowed"
                  }`}
                >
                  {!courseSlug ? (
                    <>
                      <HiClock className="h-4 w-4" />
                      Thiếu thông tin khóa học
                    </>
                  ) : isEnrolling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <HiAcademicCap className="h-4 w-4" />
                      Đăng ký ngay
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <HiCheckCircle className="h-10 w-10 text-teal-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Đăng ký thành công! 🎉
            </h3>
            <p className="text-gray-600 mb-6">
              Chúc mừng! Bạn đã đăng ký khóa học thành công.
              <br />
              Đang chuyển hướng đến trang học...
            </p>
            <div className="bg-teal-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-teal-700">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                <div
                  className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
                <span className="ml-2 text-sm font-medium">
                  Chuyển hướng trong 3 giây...
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                if (courseSlug) {
                  router.push(`/learning/${courseSlug}`);
                }
              }}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 cursor-pointer"
            >
              Chuyển ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

