"use client";

import { getImageUrl } from "@/lib/utils/helpers/image";
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
        className="absolute inset-0 bg-foreground/45 backdrop-blur-xs"
        onClick={() => !isEnrolling && onClose()}
      />
      <div className="relative z-10 w-full max-w-md bg-surface rounded-[24px] border border-border overflow-hidden shadow-2xl">
        {!enrollSuccess ? (
          <>
            <div className="bg-gradient-to-br from-primary-light via-surface to-secondary-light/60 border-b border-border px-6 py-7 text-center">
              <div className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                <HiAcademicCap className="h-7 w-7" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-1">
                Xác nhận đăng ký học
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Bắt đầu hành trình chinh phục kiến thức cùng Mây Mây
              </p>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4 mb-5">
                {course.thumbnail_url && (
                  <img
                    src={getImageUrl(course.thumbnail_url)}
                    alt={course.title}
                    className="w-20 h-20 rounded-2xl object-cover border border-border shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-base leading-snug mb-1.5">
                    {course.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <HiClock className="h-4 w-4 text-primary" />
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
                    {finalPrice !== undefined &&
                    finalPrice < course.base_price ? (
                      <div className="space-y-0.5">
                        <div className="text-xs text-subtle-foreground line-through">
                          {formatPrice(course.base_price, course.currency)}
                        </div>
                        <div className="text-xl font-bold text-primary">
                          {formatPrice(finalPrice, course.currency)}
                        </div>
                        {discountAmount !== undefined && discountAmount > 0 && (
                          <div className="text-xs text-success-foreground font-semibold">
                            Tiết kiệm{" "}
                            {formatPrice(discountAmount, course.currency)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(course.base_price, course.currency)}
                      </span>
                    )}
                  </div>

                  {discountCode && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary-light border border-secondary-pastel rounded-lg text-xs">
                      <span className="text-muted-foreground">Mã ưu đãi:</span>
                      <span className="font-mono font-bold text-secondary-foreground">
                        {discountCode}
                      </span>
                      {discountName && (
                        <span className="text-muted-foreground">
                          ({discountName})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-primary-light/65 border border-primary-pastel rounded-2xl p-4 mb-6">
                <h5 className="font-bold text-xs uppercase tracking-wider text-primary mb-2.5 flex items-center gap-1.5">
                  <HiCheckCircle className="h-4 w-4" />
                  <span>Quyền lợi học viên Mây Mây</span>
                </h5>
                <ul className="space-y-1.5 text-xs sm:text-sm text-foreground">
                  <li className="flex items-center gap-2">
                    <HiCheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>Truy cập bài giảng mọi lúc, mọi nơi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <HiCheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>Trợ giảng Mây Mây AI giải đáp 24/7</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <HiCheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span>Luyện tập trắc nghiệm & theo dõi tiến độ</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isEnrolling}
                  className="flex-1 py-3 px-4 border border-border text-foreground rounded-xl text-sm font-semibold hover:bg-background transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={onEnroll}
                  disabled={isEnrolling || !courseSlug}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isEnrolling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <HiAcademicCap className="h-4 w-4" />
                      <span>Xác nhận đăng ký</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-10 text-center">
            <div className="w-16 h-16 bg-success-bg text-success-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <HiCheckCircle className="h-9 w-9" />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">
              Đăng ký thành công!
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Chào mừng bạn đến với lớp học trên Mây Mây. Hệ thống đang mở phòng học cho bạn...
            </p>
            <button
              type="button"
              onClick={() => {
                if (courseSlug) {
                  router.push(`/learning/${courseSlug}`);
                }
              }}
              className="bg-primary hover:bg-primary-hover text-primary-foreground py-3 px-6 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Vào học ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
