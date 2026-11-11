"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useUserStore } from "@/stores/user";
import {
  AvailableDiscount,
  DiscountApplyResponse,
  DiscountApplyResult,
  DiscountInfo,
} from "@/types/user/course-sidebar";
import { Course } from "@/types/user/course_detail";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  HiAcademicCap,
  HiBookOpen,
  HiCheckCircle,
  HiClock,
  HiGlobe,
  HiHeart,
  HiPlay,
  HiShare,
  HiShoppingCart,
  HiCloud,
} from "react-icons/hi";
import EnrollmentModal from "./enrollment-modal";

const DiscountEffect = ({ active = false }: { active?: boolean }) => {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[24px] z-0">
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-secondary-light/50 via-surface-muted/30 to-transparent" />
    </div>
  );
};

interface CourseSidebarProps {
  course: Course;
  courseSlug: string | null;
  totalDurationSeconds: number;
  isFavourite: boolean;
  isTogglingFavourite: boolean;
  onToggleFavourite: () => void;
  onEnroll?: () => void;
  onPreview: (courseId: string, lessonId?: string) => void;
  formatPrice: (price: number, currency?: string) => string;
  formatSecondsToHms: (seconds: number) => string;
  onFireActiveChange?: (active: boolean) => void;
}

export default function CourseSidebar({
  course,
  courseSlug,
  totalDurationSeconds,
  isFavourite,
  isTogglingFavourite,
  onToggleFavourite,
  onPreview,
  formatPrice,
  formatSecondsToHms,
  onFireActiveChange,
}: CourseSidebarProps) {
  const router = useRouter();
  const { user } = useUserStore();
  const [discountInput, setDiscountInput] = useState<string>("");
  const [availableDiscounts, setAvailableDiscounts] = useState<
    AvailableDiscount[]
  >([]);
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(false);
  const [pricingResult, setPricingResult] =
    useState<DiscountApplyResult | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [enrollSuccess, setEnrollSuccess] = useState<boolean>(false);
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const hasFetchedDiscountsRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  const hasPrice = course.base_price > 0;
  const isInstructorOwner =
    Boolean(user?.id) &&
    Boolean(course?.instructor?.id) &&
    user!.id === course!.instructor!.id;

  const totalLessons = (course.sections || []).reduce(
    (total, section) => total + (section.lessons?.length || 0),
    0,
  );

  useEffect(() => {
    setIsEnrollModalOpen(false);
    setIsEnrolling(false);
    setEnrollSuccess(false);
    setPricingResult(null);
    setDiscountInfo(null);
    setDiscountInput("");
    hasFetchedDiscountsRef.current = null;
    isInitialLoadRef.current = true;
  }, [course.id]);

  // Only fetch available discounts when user is logged in AND course is paid
  useEffect(() => {
    if (!user?.id || !hasPrice || !course.id) return;
    if (hasFetchedDiscountsRef.current === course.id) return;

    let isMounted = true;

    const fetchAvailableDiscounts = async () => {
      try {
        setIsLoadingDiscounts(true);
        const response = await api.post("/users/discounts/available", {
          course_ids: [course.id],
        });

        if (!isMounted) return;

        const discounts = response.data.items || [];
        setAvailableDiscounts(discounts);

        if (discounts.length > 0 && isInitialLoadRef.current) {
          const firstDiscountCode = discounts[0].discount_code;
          setDiscountInput(firstDiscountCode);
          isInitialLoadRef.current = false;

          try {
            setIsApplyingDiscount(true);
            const applyResponse = await api.post<DiscountApplyResponse>(
              "/users/discounts/apply",
              {
                course_ids: [course.id],
                discount_input: firstDiscountCode,
              },
            );

            if (!isMounted) return;

            const courseResult = applyResponse.data.items.find(
              (item) => item.course_id === course.id,
            );
            if (courseResult?.applied) {
              setPricingResult(courseResult);
              setDiscountInfo({
                discount_id: applyResponse.data.discount_id,
                discount_code: applyResponse.data.discount_code,
                discount_name: applyResponse.data.discount_name,
                discount_description: applyResponse.data.discount_description,
                discount_applies_to: applyResponse.data.discount_applies_to,
                discount_type: applyResponse.data.discount_type,
                discount_percent_value:
                  applyResponse.data.discount_percent_value,
                discount_fixed_value: applyResponse.data.discount_fixed_value,
                discount_usage_limit: applyResponse.data.discount_usage_limit,
                discount_usage_count: applyResponse.data.discount_usage_count,
                discount_per_user_limit:
                  applyResponse.data.discount_per_user_limit,
                discount_is_active: applyResponse.data.discount_is_active,
                discount_is_hidden: applyResponse.data.discount_is_hidden,
                start_at: applyResponse.data.discount_start_at,
                end_at: applyResponse.data.discount_end_at,
                user_used_transactions:
                  applyResponse.data.user_used_transactions,
                user_remaining_uses: applyResponse.data.user_remaining_uses,
              });
            }
          } catch {
            // Ignore initial auto-apply error
          } finally {
            if (isMounted) {
              setIsApplyingDiscount(false);
            }
          }
        }

        hasFetchedDiscountsRef.current = course.id;
      } catch {
        // Ignore discount fetch failure
      } finally {
        if (isMounted) {
          setIsLoadingDiscounts(false);
        }
      }
    };

    fetchAvailableDiscounts();

    return () => {
      isMounted = false;
    };
  }, [user?.id, course.id, hasPrice]);

  const handleApplyDiscount = async () => {
    if (!hasPrice || !course.id || !discountInput.trim()) return;
    if (!user?.id) {
      showToast.info("Vui lòng đăng nhập để áp dụng mã ưu đãi.");
      router.push(
        `/login?redirect=${encodeURIComponent(`/course/${courseSlug || ""}`)}`,
      );
      return;
    }

    try {
      setIsApplyingDiscount(true);
      const response = await api.post<DiscountApplyResponse>(
        "/users/discounts/apply",
        {
          course_ids: [course.id],
          discount_input: discountInput.trim(),
        },
      );

      const courseResult = response.data.items.find(
        (item) => item.course_id === course.id,
      );
      if (courseResult) {
        if (!courseResult.applied) {
          const errorMsg =
            courseResult.reason || "Mã giảm giá không thể áp dụng";
          showToast.error(errorMsg);
          setPricingResult(null);
          setDiscountInfo(null);
          setDiscountInput("");
        } else {
          setPricingResult(courseResult);
          setDiscountInfo({
            discount_id: response.data.discount_id,
            discount_code: response.data.discount_code,
            discount_name: response.data.discount_name,
            discount_description: response.data.discount_description,
            discount_applies_to: response.data.discount_applies_to,
            discount_type: response.data.discount_type,
            discount_percent_value: response.data.discount_percent_value,
            discount_fixed_value: response.data.discount_fixed_value,
            discount_usage_limit: response.data.discount_usage_limit,
            discount_usage_count: response.data.discount_usage_count,
            discount_per_user_limit: response.data.discount_per_user_limit,
            discount_is_active: response.data.discount_is_active,
            discount_is_hidden: response.data.discount_is_hidden,
            start_at: response.data.discount_start_at,
            end_at: response.data.discount_end_at,
            user_used_transactions: response.data.user_used_transactions,
            user_remaining_uses: response.data.user_remaining_uses,
          });
        }
      }
    } catch (error: any) {
      setPricingResult(null);
      setDiscountInfo(null);
      let errorMsg = "Không thể áp dụng mã giảm giá. Vui lòng thử lại.";
      if (error?.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      showToast.error(errorMsg);
      setDiscountInput("");
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  useEffect(() => {
    if (!discountInfo?.end_at) {
      setTimeRemaining("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const endTime = new Date(discountInfo.end_at!).getTime();
      const distance = endTime - now;

      if (distance < 0) {
        setTimeRemaining("Đã hết hạn");
        setDiscountInfo(null);
        setPricingResult(null);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [discountInfo?.end_at]);

  const displayPrice = pricingResult
    ? pricingResult.final_price
    : course.base_price;
  const discountAmount = pricingResult ? pricingResult.discounted_amount : 0;
  const isDiscountApplied = pricingResult?.applied ?? false;

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast.success("Đã sao chép đường dẫn khóa học!");
    } catch {
      showToast.info("Bạn có thể sao chép đường dẫn trên thanh địa chỉ.");
    }
  };

  const handleEnroll = async () => {
    if (!user?.id) {
      showToast.info("Vui lòng đăng nhập để đăng ký khóa học.");
      router.push(
        `/login?redirect=${encodeURIComponent(`/course/${courseSlug || ""}`)}`,
      );
      return;
    }
    if (!course || isEnrolling) return;
    if (!courseSlug) {
      showToast.error(
        "Không thể đăng ký: Thiếu thông tin khóa học. Vui lòng thử lại sau.",
      );
      return;
    }

    try {
      setIsEnrolling(true);

      if (
        user?.id &&
        course?.instructor?.id &&
        user.id === course.instructor.id
      ) {
        try {
          await api.post(`/courses/${course.id}/enroll`);
        } catch {
          // Ignore if already enrolled
        }
        if (typeof window !== "undefined") {
          window.location.replace(`/learning/${courseSlug}`);
        } else {
          router.replace(`/learning/${courseSlug}`);
        }
        return;
      }

      if (course.base_price > 0) {
        const checkoutPayload: {
          course_ids: string[];
          discount_code?: string;
        } = {
          course_ids: [course.id],
        };

        if (discountInfo?.discount_code) {
          checkoutPayload.discount_code = discountInfo.discount_code;
        }

        try {
          const checkoutResponse = await api.post<{
            message: string;
            is_free: boolean;
            transaction_id: string | null;
            total_paid: string;
            items: Array<{
              course_id: string;
              price: string;
              discount_amount: string;
              applied_discount: boolean;
            }>;
          }>("/user/transaction/courses/checkout", checkoutPayload);

          if (checkoutResponse.status === 200 && checkoutResponse.data) {
            const { is_free, transaction_id, message } = checkoutResponse.data;
            showToast.success(message || "Thanh toán thành công! 🎉");

            const redirectToLearning = () => {
              if (typeof window !== "undefined") {
                window.location.replace(`/learning/${courseSlug}`);
              } else {
                router.replace(`/learning/${courseSlug}`);
              }
            };

            if (is_free) {
              setTimeout(() => {
                redirectToLearning();
              }, 1500);
            } else if (transaction_id) {
              const redirectUrl = `/transaction?status=success&order_id=${transaction_id}&redirect=/learning/${courseSlug}`;
              if (typeof window !== "undefined") {
                window.location.replace(redirectUrl);
              } else {
                router.replace(redirectUrl);
              }
            } else {
              setTimeout(() => {
                redirectToLearning();
              }, 1500);
            }
            return;
          }
        } catch (checkoutError: any) {
          let errorMessage = "Không thể thanh toán. Vui lòng thử lại sau.";
          if (checkoutError?.response?.data?.detail) {
            errorMessage = checkoutError.response.data.detail;
          } else if (checkoutError?.response?.data?.message) {
            errorMessage = checkoutError.response.data.message;
          }
          showToast.error(errorMessage);
          throw checkoutError;
        }
      } else {
        try {
          const response = await api.post(`/courses/${course.id}/enroll`);
          if (response.status === 200) {
            showToast.success("Đăng ký khóa học thành công! 🎉");
            setEnrollSuccess(true);
            setTimeout(() => {
              if (typeof window !== "undefined") {
                window.location.replace(`/learning/${courseSlug}`);
              } else {
                router.replace(`/learning/${courseSlug}`);
              }
            }, 1500);
          }
        } catch (enrollError: any) {
          const errorMessage =
            enrollError?.response?.data?.detail ||
            enrollError?.response?.data?.message ||
            "Không thể đăng ký khóa học. Vui lòng thử lại sau.";
          showToast.error(errorMessage);
        }
      }
    } catch {
      showToast.error("Đã xảy ra lỗi không mong đợi. Vui lòng thử lại sau.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const isFireActive =
    !isInstructorOwner && Boolean(isDiscountApplied && discountInfo);

  useEffect(() => {
    onFireActiveChange?.(isFireActive);
  }, [isFireActive, onFireActiveChange]);

  return (
    <div className="sticky top-24 space-y-6">
      <div
        className={`rounded-[24px] shadow-md border p-6 sm:p-7 relative overflow-hidden transition-all duration-200 ${
          !isInstructorOwner && isDiscountApplied && discountInfo
            ? "bg-surface-muted border-secondary-pastel"
            : "bg-surface border-border"
        }`}
      >
        <DiscountEffect active={isFireActive} />

        {/* Discount Banner */}
        {!isInstructorOwner && isDiscountApplied && discountInfo && (
          <div className="absolute top-0 left-0 right-0 bg-secondary-light text-secondary-foreground border-b border-secondary-pastel py-2 px-4 rounded-t-[24px] z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                Ưu đãi Mây Mây đang áp dụng
              </span>
              {timeRemaining && (
                <div className="flex items-center gap-1 bg-surface/90 border border-secondary-pastel rounded-full px-2.5 py-0.5">
                  <span className="text-xs font-medium">⏰</span>
                  <span className="text-xs font-bold font-mono text-secondary-foreground">
                    {timeRemaining}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Price Header */}
        <div
          className={`mb-6 ${isDiscountApplied && discountInfo ? "mt-8" : ""}`}
        >
          {!isInstructorOwner && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                Học phí trọn khóa
              </span>
              {hasPrice ? (
                discountAmount > 0 && isDiscountApplied ? (
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-3xl font-bold text-primary">
                      {formatPrice(displayPrice, course.currency)}
                    </span>
                    <span className="text-sm text-subtle-foreground line-through">
                      {formatPrice(course.base_price, course.currency)}
                    </span>
                    <span className="text-xs text-success-foreground bg-success-bg px-2.5 py-0.5 rounded-full font-semibold">
                      Tiết kiệm {formatPrice(discountAmount, course.currency)}
                    </span>
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-foreground">
                    {formatPrice(course.base_price, course.currency)}
                  </div>
                )
              ) : (
                <div className="text-3xl font-bold text-primary">
                  {formatPrice(course.base_price, course.currency)}
                </div>
              )}
            </div>
          )}
        </div>

        {
          <>
            {/* Instructor owner: Direct access button */}
            {isInstructorOwner && (
              <div className="mb-5 pb-5 border-b border-border">
                <button
                  type="button"
                  onClick={() => void handleEnroll()}
                  disabled={!courseSlug || isEnrolling}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isEnrolling ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <HiPlay className="h-5 w-5" />
                      <span>Truy cập bài giảng</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Paid Course Discount & Purchase Controls */}
            {!isInstructorOwner && hasPrice && (
              <div className="mb-5 pb-5 border-b border-border">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Mã ưu đãi học phí
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={discountInput}
                      onChange={(e) => {
                        setDiscountInput(e.target.value);
                        setShowDiscountDropdown(true);
                      }}
                      onFocus={() => setShowDiscountDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowDiscountDropdown(false), 200);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && discountInput.trim()) {
                          handleApplyDiscount();
                        }
                      }}
                      placeholder="Nhập mã ưu đãi..."
                      disabled={isApplyingDiscount}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary focus:bg-surface transition-all duration-200 text-sm"
                    />
                    {isLoadingDiscounts && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {availableDiscounts.length > 0 &&
                      showDiscountDropdown &&
                      discountInput.trim() === "" && (
                        <div className="absolute z-20 w-full mt-1.5 bg-surface border border-border rounded-xl shadow-md max-h-60 overflow-y-auto">
                          {availableDiscounts.map((discount) => (
                            <button
                              key={discount.id}
                              type="button"
                              onClick={() => {
                                setDiscountInput(discount.discount_code);
                                setShowDiscountDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-primary-light/60 transition-colors text-sm border-b border-border/60 last:border-b-0 cursor-pointer"
                            >
                              <div className="font-semibold text-primary">
                                {discount.discount_code}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {discount.name}
                                {discount.discount_type === "percent"
                                  ? ` - Giảm ${discount.percent_value}%`
                                  : ` - Giảm ${formatPrice(
                                      discount.fixed_value ?? 0,
                                      course.currency,
                                    )}`}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    disabled={!discountInput.trim() || isApplyingDiscount}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                      discountInput.trim() && !isApplyingDiscount
                        ? "bg-primary-light text-primary hover:bg-primary hover:text-primary-foreground border border-primary-pastel cursor-pointer"
                        : "bg-background text-subtle-foreground border border-border cursor-not-allowed"
                    }`}
                  >
                    {isApplyingDiscount ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Áp dụng"
                    )}
                  </button>
                </div>

                {discountInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountInput("");
                      setPricingResult(null);
                      setDiscountInfo(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 cursor-pointer"
                  >
                    ✕ Xóa mã giảm giá
                  </button>
                )}

                <div className="space-y-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (!user?.id) {
                        showToast.info(
                          "Vui lòng đăng nhập để đăng ký khóa học.",
                        );
                        router.push(
                          `/login?redirect=${encodeURIComponent(
                            `/course/${courseSlug || ""}`,
                          )}`,
                        );
                        return;
                      }
                      if (course.base_price === 0) {
                        void handleEnroll();
                      } else {
                        setIsEnrollModalOpen(true);
                      }
                    }}
                    disabled={!courseSlug}
                    className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <HiShoppingCart className="h-5 w-5" />
                    <span>Đăng ký khóa học ngay</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onToggleFavourite}
                      disabled={isTogglingFavourite}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                        isFavourite
                          ? "bg-secondary-light border-secondary-pastel border text-secondary-foreground"
                          : "border border-border text-foreground hover:border-primary-pastel hover:bg-background"
                      }`}
                    >
                      <HiHeart
                        className={`h-4 w-4 ${isFavourite ? "fill-current" : ""}`}
                      />
                      <span>
                        {isTogglingFavourite
                          ? "Đang lưu..."
                          : isFavourite
                            ? "Đã lưu"
                            : "Yêu thích"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex-1 border border-border text-foreground py-2.5 px-4 rounded-xl text-sm font-medium hover:border-primary-pastel hover:bg-background transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <HiShare className="h-4 w-4" />
                      <span>Chia sẻ</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Free Course Enroll Controls */}
            {!isInstructorOwner && !hasPrice && (
              <div className="mb-5 pb-5 border-b border-border space-y-3">
                <button
                  type="button"
                  onClick={() => void handleEnroll()}
                  disabled={!courseSlug || isEnrolling}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {isEnrolling ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <HiPlay className="h-5 w-5" />
                      <span>Bắt đầu học miễn phí</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onToggleFavourite}
                    disabled={isTogglingFavourite}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      isFavourite
                        ? "bg-secondary-light border-secondary-pastel border text-secondary-foreground"
                        : "border border-border text-foreground hover:border-primary-pastel hover:bg-background"
                    }`}
                  >
                    <HiHeart
                      className={`h-4 w-4 ${isFavourite ? "fill-current" : ""}`}
                    />
                    <span>{isFavourite ? "Đã lưu" : "Yêu thích"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 border border-border text-foreground py-2.5 px-4 rounded-xl text-sm font-medium hover:border-primary-pastel hover:bg-background transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <HiShare className="h-4 w-4" />
                    <span>Chia sẻ</span>
                  </button>
                </div>
              </div>
            )}
          </>
        }

        {/* Course Key Specifications */}
        <div className="space-y-3 text-xs sm:text-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Thông tin khóa học trên Mây Mây
          </p>

          <div className="flex justify-between items-center py-2 border-b border-border/70">
            <span className="flex items-center gap-2 text-muted-foreground">
              <HiClock className="w-4 h-4 text-primary" />
              <span>Thời lượng</span>
            </span>
            <span className="font-semibold text-foreground">
              {formatSecondsToHms(totalDurationSeconds)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/70">
            <span className="flex items-center gap-2 text-muted-foreground">
              <HiBookOpen className="w-4 h-4 text-primary" />
              <span>Số bài giảng</span>
            </span>
            <span className="font-semibold text-foreground">
              {totalLessons} bài học
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/70">
            <span className="flex items-center gap-2 text-muted-foreground">
              <HiAcademicCap className="w-4 h-4 text-primary" />
              <span>Trình độ</span>
            </span>
            <span className="font-semibold text-foreground">
              {course.level === "beginner"
                ? "Cơ bản & Nền tảng"
                : course.level === "intermediate"
                  ? "Vận dụng & Mở rộng"
                  : course.level === "advanced"
                    ? "Nâng cao & Chuyên sâu"
                    : "Phổ thông toàn diện"}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-border/70">
            <span className="flex items-center gap-2 text-muted-foreground">
              <HiGlobe className="w-4 h-4 text-primary" />
              <span>Ngôn ngữ giảng dạy</span>
            </span>
            <span className="font-semibold text-foreground">Tiếng Việt</span>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <HiCheckCircle className="w-4 h-4 text-primary" />
              <span>Trợ giảng Mây Mây AI</span>
            </span>
            <span className="font-semibold text-primary">Hỗ trợ 24/7</span>
          </div>
        </div>
      </div>

      {/* Enrollment Modal */}
      <EnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => {
          setIsEnrollModalOpen(false);
          setEnrollSuccess(false);
          setIsEnrolling(false);
        }}
        course={course}
        totalDurationSeconds={totalDurationSeconds}
        courseSlug={courseSlug}
        isEnrolling={isEnrolling}
        enrollSuccess={enrollSuccess}
        onEnroll={handleEnroll}
        formatPrice={formatPrice}
        formatSecondsToHms={formatSecondsToHms}
        finalPrice={displayPrice}
        discountAmount={discountAmount}
        discountCode={discountInfo?.discount_code}
        discountName={discountInfo?.discount_name}
      />
    </div>
  );
}
