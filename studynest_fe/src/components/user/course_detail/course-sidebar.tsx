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
  HiClock,
  HiHeart,
  HiPlay,
  HiShare,
  HiShoppingCart,
} from "react-icons/hi";
import EnrollmentModal from "./enrollment-modal";

// Discount Effect Component - đơn giản hóa
const DiscountEffect = ({ active = false }: { active?: boolean }) => {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg z-0">
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-orange-400/40 via-red-400/30 to-transparent" />
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

  // Reset tất cả state enrollment khi component mount hoặc course thay đổi
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

  // Fetch available discounts khi course có phí (chỉ fetch 1 lần cho mỗi course)
  useEffect(() => {
    if (!hasPrice || !course.id) return;

    // Đã fetch cho course này rồi thì không fetch lại
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

        // Tự động điền và apply mã đầu tiên nếu có
        if (discounts.length > 0 && isInitialLoadRef.current) {
          const firstDiscountCode = discounts[0].discount_code;
          setDiscountInput(firstDiscountCode);
          isInitialLoadRef.current = false;

          // Tự động apply mã đầu tiên
          try {
            setIsApplyingDiscount(true);
            const applyResponse = await api.post<DiscountApplyResponse>(
              "/users/discounts/apply",
              {
                course_ids: [course.id],
                discount_input: firstDiscountCode,
              }
            );

            if (!isMounted) return;

            const courseResult = applyResponse.data.items.find(
              (item) => item.course_id === course.id
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
          } catch (applyError) {
            // Không hiển thị lỗi khi tự động áp dụng lần đầu
            if (isMounted) {
              console.log("Auto-apply discount failed:", applyError);
            }
          } finally {
            if (isMounted) {
              setIsApplyingDiscount(false);
            }
          }
        }

        // Đánh dấu đã fetch cho course này
        hasFetchedDiscountsRef.current = course.id;
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching available discounts:", error);
        }
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
  }, [course.id, hasPrice]);

  // Handle apply discount khi user click nút
  const handleApplyDiscount = async () => {
    if (!hasPrice || !course.id || !discountInput.trim()) {
      return;
    }

    try {
      setIsApplyingDiscount(true);
      const response = await api.post<DiscountApplyResponse>(
        "/users/discounts/apply",
        {
          course_ids: [course.id],
          discount_input: discountInput.trim(),
        }
      );

      // Tìm kết quả cho course này
      const courseResult = response.data.items.find(
        (item) => item.course_id === course.id
      );
      if (courseResult) {
        // Kiểm tra nếu mã không áp dụng được
        if (!courseResult.applied) {
          const errorMsg =
            courseResult.reason || "Mã giảm giá không thể áp dụng";
          showToast.error(errorMsg);
          setPricingResult(null);
          setDiscountInfo(null);
          // Xóa mã giảm giá nếu không áp dụng được
          setDiscountInput("");
        } else {
          // Chỉ lưu nếu applied = true
          setPricingResult(courseResult);
          // Lưu thông tin discount từ response
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
      console.error("Error applying discount:", error);
      setPricingResult(null);
      setDiscountInfo(null);
      // Bắt lỗi từ API response
      let errorMsg = "Không thể áp dụng mã giảm giá. Vui lòng thử lại.";
      if (error?.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      showToast.error(errorMsg);
      // Xóa mã giảm giá nếu có lỗi
      setDiscountInput("");
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  // Countdown timer cho discount - cập nhật real-time
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
        // Reset discount info khi hết hạn
        setDiscountInfo(null);
        setPricingResult(null);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
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

    // Cập nhật ngay lập tức
    updateCountdown();
    // Cập nhật mỗi giây
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [discountInfo?.end_at]);

  // Fetch số lượng mã còn lại định kỳ (sử dụng user_remaining_uses)
  // Chỉ fetch khi discount đã được apply và không fetch ngay lập tức để tránh duplicate calls
  useEffect(() => {
    if (!discountInfo?.discount_id || !hasPrice || !course.id) {
      return;
    }

    // Không fetch ngay lập tức, chỉ fetch định kỳ sau khi đã có discount info
    // Điều này tránh duplicate call ngay sau khi apply discount
    const fetchRemainingUsage = async () => {
      try {
        const response = await api.post<DiscountApplyResponse>(
          "/users/discounts/apply",
          {
            course_ids: [course.id],
            discount_input: discountInfo.discount_id,
          }
        );

        // Cập nhật thông tin discount nếu có thay đổi
        setDiscountInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            discount_code: response.data.discount_code || prev.discount_code,
            discount_name: response.data.discount_name || prev.discount_name,
            discount_description:
              response.data.discount_description || prev.discount_description,
            discount_applies_to:
              response.data.discount_applies_to || prev.discount_applies_to,
            discount_type: response.data.discount_type || prev.discount_type,
            discount_percent_value:
              response.data.discount_percent_value ??
              prev.discount_percent_value,
            discount_fixed_value:
              response.data.discount_fixed_value ?? prev.discount_fixed_value,
            discount_usage_limit:
              response.data.discount_usage_limit ?? prev.discount_usage_limit,
            discount_usage_count:
              response.data.discount_usage_count ?? prev.discount_usage_count,
            discount_per_user_limit:
              response.data.discount_per_user_limit ??
              prev.discount_per_user_limit,
            discount_is_active:
              response.data.discount_is_active ?? prev.discount_is_active,
            discount_is_hidden:
              response.data.discount_is_hidden ?? prev.discount_is_hidden,
            start_at: response.data.discount_start_at || prev.start_at,
            end_at: response.data.discount_end_at || prev.end_at,
            user_used_transactions:
              response.data.user_used_transactions ??
              prev.user_used_transactions,
            user_remaining_uses:
              response.data.user_remaining_uses ?? prev.user_remaining_uses,
          };
        });
      } catch (error) {
        console.error("Error fetching remaining usage:", error);
      }
    };

    // Chỉ fetch định kỳ mỗi 60 giây (tăng từ 30s để giảm số lần gọi API)
    // Không fetch ngay lập tức để tránh duplicate với lần apply đầu tiên
    const interval = setInterval(fetchRemainingUsage, 60000);

    return () => clearInterval(interval);
  }, [discountInfo?.discount_id, hasPrice, course.id]);

  const displayPrice = pricingResult
    ? pricingResult.final_price
    : course.base_price;
  const discountAmount = pricingResult ? pricingResult.discounted_amount : 0;
  const isDiscountApplied = pricingResult?.applied ?? false;

  // Handle enrollment
  const handleEnroll = async () => {
    if (!course || isEnrolling) return;
    if (!courseSlug) {
      showToast.error(
        "Không thể đăng ký: Thiếu thông tin khóa học. Vui lòng thử lại sau."
      );
      return;
    }

    try {
      setIsEnrolling(true);

      // Nếu user là giảng viên của khóa học → cho truy cập trực tiếp (dù có phí)
      if (
        user?.id &&
        course?.instructor?.id &&
        user.id === course.instructor.id
      ) {
        try {
          await api.post(`/courses/${course.id}/enroll`);
        } catch (_) {
          // Bỏ qua lỗi enroll nếu đã có trong khóa học
        }
        // Điều hướng thẳng vào trang học
        if (typeof window !== "undefined") {
          window.location.replace(`/learning/${courseSlug}`);
        } else {
          router.replace(`/learning/${courseSlug}`);
        }
        return;
      }

      // Nếu khóa học có phí, chỉ gọi API checkout (không gọi enroll)
      if (course.base_price > 0) {
        const checkoutPayload: {
          course_ids: string[];
          discount_code?: string;
        } = {
          course_ids: [course.id],
        };

        // Thêm discount_code nếu có
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

            // Hiển thị thông báo thành công
            showToast.success(message || "Thanh toán thành công! 🎉");

            // Xóa toàn bộ lịch sử router trước đó để người dùng không thể back lại
            // Sử dụng window.location.replace để thay thế hoàn toàn entry hiện tại
            const redirectToLearning = () => {
              if (typeof window !== "undefined") {
                window.location.replace(`/learning/${courseSlug}`);
              } else {
                router.replace(`/learning/${courseSlug}`);
              }
            };

            // Xử lý redirect dựa trên is_free và transaction_id
            if (is_free) {
              // Free checkout: redirect trực tiếp đến learning (không có transaction)
              setTimeout(() => {
                redirectToLearning();
              }, 1500);
            } else if (transaction_id) {
              // Có transaction: redirect đến trang transaction success
              const redirectUrl = `/transaction?status=success&order_id=${transaction_id}&redirect=/learning/${courseSlug}`;
              if (typeof window !== "undefined") {
                window.location.replace(redirectUrl);
              } else {
                router.replace(redirectUrl);
              }
            } else {
              // Trường hợp không có transaction_id nhưng không phải free (không nên xảy ra)
              console.warn("Checkout thành công nhưng không có transaction_id");
              setTimeout(() => {
                redirectToLearning();
              }, 1500);
            }
            return;
          }
        } catch (checkoutError: any) {
          // Xử lý các lỗi cụ thể từ backend
          let errorMessage = "Không thể thanh toán. Vui lòng thử lại sau.";

          if (checkoutError?.response?.status === 400) {
            // Lỗi validation: khóa học không tồn tại, giá = 0, etc.
            const errorDetail =
              checkoutError?.response?.data?.detail ||
              checkoutError?.response?.data?.message;
            if (errorDetail) {
              errorMessage = errorDetail;
            } else {
              errorMessage =
                "Thông tin thanh toán không hợp lệ. Vui lòng kiểm tra lại.";
            }
          } else if (checkoutError?.response?.status === 404) {
            // Ví không tồn tại
            errorMessage =
              checkoutError?.response?.data?.detail ||
              "Ví không tồn tại. Vui lòng liên hệ hỗ trợ.";
          } else if (checkoutError?.response?.status === 402) {
            // Không đủ tiền trong ví (Payment Required)
            errorMessage =
              checkoutError?.response?.data?.detail ||
              "Số dư ví không đủ. Vui lòng nạp thêm tiền.";
          } else if (checkoutError?.response?.data?.detail) {
            errorMessage = checkoutError.response.data.detail;
          } else if (checkoutError?.response?.data?.message) {
            errorMessage = checkoutError.response.data.message;
          }

          showToast.error(errorMessage);
          throw checkoutError;
        }
      } else {
        // Nếu khóa học miễn phí, gọi API enroll
        try {
          const response = await api.post(`/courses/${course.id}/enroll`);
          if (response.status === 200) {
            showToast.success("Đăng ký khóa học thành công! 🎉");
            setEnrollSuccess(true);

            // Xóa toàn bộ lịch sử router trước đó để người dùng không thể back lại
            // Sử dụng window.location.replace để thay thế hoàn toàn entry hiện tại
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
    } catch (error) {
      // Lỗi không mong đợi
      showToast.error("Đã xảy ra lỗi không mong đợi. Vui lòng thử lại sau.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const isFireActive =
    !isInstructorOwner && Boolean(isDiscountApplied && discountInfo);

  // Notify parent when fire active state changes
  useEffect(() => {
    onFireActiveChange?.(isFireActive);
  }, [isFireActive, onFireActiveChange]);

  return (
    <div className="sticky top-20 space-y-6">
      <div
        className={`rounded-lg shadow-sm border-2 p-6 relative overflow-hidden transition-all duration-300 ${
          !isInstructorOwner && isDiscountApplied && discountInfo
            ? "bg-gradient-to-b from-red-50 via-orange-50 to-red-100 border-red-500 shadow-red-300 shadow-lg"
            : "bg-white border-gray-200"
        }`}
      >
        <DiscountEffect active={isFireActive} />
        {/* Discount Border */}
        {!isInstructorOwner && isDiscountApplied && discountInfo && (
          <div className="absolute inset-0 rounded-lg border-2 border-orange-400 pointer-events-none" />
        )}

        {/* Discount Banner */}
        {!isInstructorOwner && isDiscountApplied && discountInfo && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-4 rounded-t-lg shadow-md z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">
                  🔥 Khuyến mãi đặc biệt
                </span>
              </div>
              {timeRemaining && (
                <div className="flex items-center gap-1 bg-white/20 rounded px-2 py-1">
                  <span className="text-xs font-medium">⏰</span>
                  <span className="text-xs font-bold font-mono">
                    {timeRemaining}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div
          className={`text-center mb-6 ${
            isDiscountApplied && discountInfo ? "mt-12" : ""
          }`}
        >
          {!isInstructorOwner &&
            (hasPrice ? (
              <div className="space-y-2">
                {discountAmount > 0 && isDiscountApplied ? (
                  <>
                    <div className="text-lg text-gray-500 line-through">
                      {formatPrice(course.base_price, course.currency)}
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {formatPrice(displayPrice, course.currency)}
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      Tiết kiệm {formatPrice(discountAmount, course.currency)}
                    </div>
                  </>
                ) : (
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(course.base_price, course.currency)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatPrice(course.base_price, course.currency)}
              </div>
            ))}
        </div>

        {/* Instructor owner: Direct access button */}
        {isInstructorOwner && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <button
              onClick={() => void handleEnroll()}
              disabled={!courseSlug || isEnrolling}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                courseSlug
                  ? "bg-teal-600 text-white hover:bg-teal-700"
                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
            >
              {isEnrolling ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <HiPlay className="h-5 w-5" />
                  Truy cập ngay
                </>
              )}
            </button>
          </div>
        )}

        {/* Discount Input - chỉ hiện khi có phí */}
        {!isInstructorOwner && hasPrice && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🎟️ Mã giảm giá
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
                    // Delay để cho phép click vào dropdown item
                    setTimeout(() => setShowDiscountDropdown(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && discountInput.trim()) {
                      handleApplyDiscount();
                    }
                  }}
                  placeholder="Nhập mã giảm giá hoặc chọn từ danh sách"
                  disabled={isApplyingDiscount}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200 text-sm"
                />
                {isLoadingDiscounts && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {availableDiscounts.length > 0 &&
                  showDiscountDropdown &&
                  discountInput.trim() === "" && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {availableDiscounts.map((discount) => (
                        <button
                          key={discount.id}
                          type="button"
                          onClick={() => {
                            setDiscountInput(discount.discount_code);
                            setShowDiscountDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-green-50 transition-colors text-sm"
                        >
                          <div className="font-medium text-gray-900">
                            {discount.discount_code}
                          </div>
                          <div className="text-xs text-gray-600">
                            {discount.name}
                            {discount.discount_type === "percent"
                              ? ` - ${discount.percent_value}%`
                              : ` - ${formatPrice(
                                  discount.fixed_value ?? 0,
                                  course.currency
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
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap ${
                  discountInput.trim() && !isApplyingDiscount
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isApplyingDiscount ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                className="text-xs text-gray-500 hover:text-gray-700 mt-2 flex items-center gap-1"
              >
                ✕ Xóa mã giảm giá
              </button>
            )}

            <div className="space-y-3 my-4">
              <button
                onClick={() => {
                  if (course.base_price === 0) {
                    // Khóa học free: gọi enroll trực tiếp
                    void handleEnroll();
                  } else {
                    // Khóa có phí: mở modal checkout
                    setIsEnrollModalOpen(true);
                  }
                }}
                disabled={!courseSlug}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  courseSlug
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                }`}
              >
                {!courseSlug ? (
                  <>
                    <HiClock className="h-5 w-5" />
                    Đang tải thông tin...
                  </>
                ) : course.base_price === 0 ? (
                  <>
                    <HiPlay className="h-5 w-5" />
                    Đăng ký ngay
                  </>
                ) : (
                  <>
                    <HiShoppingCart className="h-5 w-5" />
                    Mua ngay{" "}
                    {discountAmount > 0 && isDiscountApplied && (
                      <span className="text-xs opacity-90">
                        ({formatPrice(displayPrice, course.currency)})
                      </span>
                    )}
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={onToggleFavourite}
                  disabled={isTogglingFavourite}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isFavourite
                      ? "bg-red-50 border-red-300 border text-red-600 hover:bg-red-100"
                      : "border border-gray-300  text-gray-700 hover:border-teal-300 hover:text-teal-600"
                  }`}
                >
                  <HiHeart
                    className={`h-4 w-4 ${isFavourite ? "fill-current" : ""}`}
                  />
                  {isTogglingFavourite
                    ? "Đang xử lý..."
                    : isFavourite
                    ? "Đã yêu thích"
                    : "Yêu thích"}
                </button>
                <button className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:border-gray-400 hover:text-gray-800 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <HiShare className="h-4 w-4" />
                  Chia sẻ
                </button>
              </div>
            </div>
            {/* Discount Info - chỉ hiện khi có discount applied */}
            {isDiscountApplied && discountInfo && (
              <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  {/* Countdown Timer */}
                  {discountInfo.end_at && timeRemaining && (
                    <div className="bg-white border border-orange-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        ⏰ Thời gian còn lại
                      </div>
                      <div className="text-lg font-bold text-orange-600 font-mono">
                        {timeRemaining}
                      </div>
                    </div>
                  )}

                  {/* Usage Count - Số lượng mã còn lại */}
                  {discountInfo.user_remaining_uses !== undefined &&
                    discountInfo.user_remaining_uses !== null && (
                      <div className="bg-white border border-green-200 rounded-lg p-3">
                        <div className="text-xs font-medium text-gray-700 mb-1">
                          🎫 Mã còn lại
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          {discountInfo.user_remaining_uses}
                        </div>
                      </div>
                    )}
                </div>

                {/* Thông tin chi tiết mã giảm giá */}
                <div className="mt-3 space-y-2">
                  {discountInfo.discount_name && (
                    <div className="bg-white rounded p-2 border border-orange-200">
                      <div className="text-xs text-gray-600 mb-1">Tên mã</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {discountInfo.discount_name}
                      </div>
                    </div>
                  )}

                  {discountInfo.discount_code && (
                    <div className="bg-white rounded p-2 border border-orange-200">
                      <div className="text-xs text-gray-600 mb-1">
                        Mã giảm giá
                      </div>
                      <div className="text-sm font-mono font-bold text-orange-600">
                        {discountInfo.discount_code}
                      </div>
                    </div>
                  )}

                  {discountInfo.discount_description && (
                    <div className="bg-white rounded p-2 border border-orange-200">
                      <div className="text-xs text-gray-600 mb-1">Mô tả</div>
                      <div className="text-sm text-gray-700">
                        {discountInfo.discount_description}
                      </div>
                    </div>
                  )}

                  {/* Thông tin giá trị giảm giá */}
                  {(discountInfo.discount_type ||
                    discountInfo.discount_percent_value !== null ||
                    discountInfo.discount_fixed_value !== null) && (
                    <div className="bg-white rounded p-2 border border-orange-200">
                      <div className="text-xs text-gray-600 mb-1">
                        Giá trị giảm
                      </div>
                      <div className="text-sm text-gray-700">
                        {discountInfo.discount_type === "percent" &&
                        discountInfo.discount_percent_value !== null ? (
                          <span className="font-bold text-orange-600">
                            {discountInfo.discount_percent_value}%
                          </span>
                        ) : discountInfo.discount_type === "fixed" &&
                          discountInfo.discount_fixed_value !== null &&
                          discountInfo.discount_fixed_value !== undefined ? (
                          <span className="font-bold text-orange-600">
                            {formatPrice(
                              discountInfo.discount_fixed_value,
                              course.currency
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nút đăng ký cho khóa học miễn phí (luôn hiển thị) */}
        {!isInstructorOwner && !hasPrice && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <button
              onClick={() => void handleEnroll()}
              disabled={!courseSlug || isEnrolling}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                courseSlug
                  ? "bg-teal-600 text-white hover:bg-teal-700"
                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
            >
              {isEnrolling ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <HiPlay className="h-5 w-5" />
                  Đăng ký ngay
                </>
              )}
            </button>
          </div>
        )}

        <div className="text-center text-sm text-gray-600 mb-6">
          Đảm bảo hoàn tiền trong 3 ngày
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Thời lượng:</span>
            <span className="font-medium text-gray-900">
              {formatSecondsToHms(totalDurationSeconds)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Bài học:</span>
            <span className="font-medium text-gray-900">
              {course.sections.reduce(
                (total, section) => total + section.lessons.length,
                0
              )}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Cấp độ:</span>
            <span className="font-medium text-gray-900">
              {course.level === "beginner"
                ? "Cơ bản"
                : course.level === "intermediate"
                ? "Trung cấp"
                : course.level === "advanced"
                ? "Nâng cao"
                : course.level}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Ngôn ngữ:</span>
            <span className="font-medium text-gray-900">
              {(course.language || "").toUpperCase()}
            </span>
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
