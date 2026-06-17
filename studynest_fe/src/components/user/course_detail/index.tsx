"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { CourseDetailData } from "@/types/user/course_detail";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import useSWR from "swr";
import CourseHeader from "./course-header";
import CourseSidebar from "./course-sidebar";
import CurriculumSection from "./curriculum-section";
import DescriptionSection from "./description-section";
import EmptyCourseView from "./empty-course-view";
import EnrollmentModal from "./enrollment-modal";
import InstructorSection from "./instructor-section";
import OutcomesSection from "./outcomes-section";
import PreviewModal from "./preview-modal";
import RelatedTopicsSection from "./related-topics-section";
import RequirementsSection from "./requirements-section";
import ReviewsSection from "./reviews-section";
import TargetAudienceSection from "./target-audience-section";

const CourseDetail = () => {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [expandAllSections, setExpandAllSections] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [previewItems, setPreviewItems] = useState<
    Array<{ id: string; title: string; video_url: string; duration: number }>
  >([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [isFavourite, setIsFavourite] = useState<boolean>(false);
  const [isTogglingFavourite, setIsTogglingFavourite] =
    useState<boolean>(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [enrollSuccess, setEnrollSuccess] = useState<boolean>(false);
  const [isFireActive, setIsFireActive] = useState<boolean>(false);

  const {
    data,
    error,
    isLoading: loading,
  } = useSWR<any>(
    slug ? [`/courses/${slug}/detail-info-by-slug`] : null,
    async ([url]) => {
      const response = await api.get(url);
      console.log("API Response:", response.data);
      return response.data;
    }
  );

  const { data: favouriteData, mutate: mutateFavourite } = useSWR(
    data?.course?.id ? `/favourites/${data.course.id}` : null,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    }
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleAllSections = () => {
    if (expandAllSections) {
      setExpandedSections(new Set());
    } else {
      const allSectionIds = new Set<string>(
        data?.course?.sections.map((section: { id: string }) => section.id) ||
          []
      );
      setExpandedSections(allSectionIds);
    }
    setExpandAllSections(!expandAllSections);
  };

  const formatPrice = (price: number, currency = "VND") => {
    if (price === 0) return "Miễn phí";
    try {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(price);
    } catch {
      return `${price.toLocaleString("en-US")} ${currency}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const sumCourseDurationSeconds = (
    sections: CourseDetailData["course"]["sections"]
  ) => {
    return sections.reduce((total, section) => {
      return (
        total +
        section.lessons.reduce(
          (s, lesson) =>
            s + (typeof lesson.duration === "number" ? lesson.duration : 0),
          0
        )
      );
    }, 0);
  };

  const formatSecondsToHms = (seconds: number) => {
    if (!seconds || seconds <= 0) return "--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h} giờ ${m} phút`;
    if (m > 0) return `${m} phút ${s} giây`;
    return `${s} giây`;
  };

  const formatSecondsToMmSs = (seconds: number | null | undefined) => {
    if (!seconds && seconds !== 0) return "--:--";
    const m = Math.floor((seconds as number) / 60)
      .toString()
      .padStart(1, "0");
    const s = Math.floor((seconds as number) % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // Reset tất cả state enrollment khi component mount hoặc slug thay đổi
  useEffect(() => {
    setIsEnrollModalOpen(false);
    setIsEnrolling(false);
    setEnrollSuccess(false);
  }, [slug]);

  React.useEffect(() => {
    if (favouriteData?.is_favourite !== undefined) {
      setIsFavourite(favouriteData.is_favourite);
    } else if (data?.course?.is_favourite !== undefined) {
      setIsFavourite(data.course.is_favourite);
    }
  }, [favouriteData?.is_favourite, data?.course?.is_favourite]);

  const toggleFavourite = async () => {
    if (!data?.course || isTogglingFavourite) return;

    try {
      setIsTogglingFavourite(true);
      const response = await api.post(`/favourites/${data.course.id}`);
      if (response.data?.is_favourite !== undefined) {
        setIsFavourite(response.data.is_favourite);
        mutateFavourite();
      }
    } catch (error) {
      console.error("Error toggling favourite:", error);
      setIsFavourite(!isFavourite);
    } finally {
      setIsTogglingFavourite(false);
    }
  };

  const toYoutubeEmbedUrl = (url: string): string => {
    try {
      if (!url) return "";
      if (url.includes("youtube.com/embed/")) return url;

      let videoId = "";
      const watchMatch = url.match(/[?&]v=([^&]+)/);
      if (watchMatch) {
        videoId = watchMatch[1];
      } else if (url.includes("youtu.be/")) {
        const beMatch = url.match(/youtu\.be\/([^?&]+)/);
        if (beMatch) {
          videoId = beMatch[1];
        }
      } else if (url.includes("youtube.com/embed/")) {
        const embedMatch = url.match(/embed\/([^?&]+)/);
        if (embedMatch) {
          videoId = embedMatch[1];
        }
      } else if (!url.includes("http")) {
        videoId = url;
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const openPreview = async (courseId: string, lessonId?: string) => {
    try {
      setIsPreviewLoading(true);
      const res = await api.get(`/courses/${courseId}/preview`);
      const list = Array.isArray(res.data) ? res.data : [];
      setPreviewItems(list);

      if (list.length > 0) {
        let activeIndex = 0;
        if (lessonId) {
          const lessonIndex = list.findIndex((item) => item.id === lessonId);
          if (lessonIndex !== -1) {
            activeIndex = lessonIndex;
          }
        }
        setActivePreviewIndex(activeIndex);
        setPreviewUrl(toYoutubeEmbedUrl(list[activeIndex].video_url));
        setPreviewTitle(list[activeIndex].title || "Xem trước khóa học");
      } else {
        setPreviewUrl("");
        setPreviewTitle("Xem trước khóa học");
      }
      setIsPreviewOpen(true);
    } catch (e) {
      // no-op
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSelectPreviewItem = (index: number) => {
    setActivePreviewIndex(index);
    setPreviewUrl(toYoutubeEmbedUrl(previewItems[index].video_url));
    setPreviewTitle(previewItems[index].title);
  };

  const handleEnroll = async () => {
    if (!data?.course || isEnrolling) return;
    if (!courseSlug) {
      showToast.error(
        "Không thể đăng ký: Thiếu thông tin khóa học. Vui lòng thử lại sau."
      );
      return;
    }

    try {
      setIsEnrolling(true);

      // Nếu khóa học có phí, chỉ gọi API checkout (không gọi enroll)
      if (data.course.base_price > 0) {
        const checkoutPayload: {
          course_ids: string[];
          discount_code?: string;
        } = {
          course_ids: [data.course.id],
        };

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

            // Xử lý redirect dựa trên is_free và transaction_id
            if (is_free) {
              // Free checkout: redirect trực tiếp đến learning (không có transaction)
              setTimeout(() => {
                router.push(`/learning/${courseSlug}`);
              }, 1500);
            } else if (transaction_id) {
              // Có transaction: redirect đến trang transaction success
              const redirectUrl = `/transaction?status=success&order_id=${transaction_id}&redirect=/learning/${courseSlug}`;
              router.push(redirectUrl);
            } else {
              // Trường hợp không có transaction_id nhưng không phải free (không nên xảy ra)
              console.warn("Checkout thành công nhưng không có transaction_id");
              setTimeout(() => {
                router.push(`/learning/${courseSlug}`);
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
              errorMessage = "Thông tin thanh toán không hợp lệ. Vui lòng kiểm tra lại.";
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
      const response = await api.post(`/courses/${data.course.id}/enroll`);
      if (response.status === 200) {
            showToast.success("Đăng ký khóa học thành công! 🎉");
        setEnrollSuccess(true);
        setTimeout(() => {
          router.push(`/learning/${courseSlug}`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Không tìm thấy khóa học
          </h1>
          <p className="text-gray-600">
            Khóa học bạn đang tìm kiếm không tồn tại.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.status === "empty") {
    return (
      <EmptyCourseView
        course={data.course}
        message={data.message}
        isFavourite={isFavourite}
        isTogglingFavourite={isTogglingFavourite}
        onToggleFavourite={toggleFavourite}
      />
    );
  }

  const { course, category_chain, sample_reviews } = data;
  const totalDurationSeconds = sumCourseDurationSeconds(course.sections);
  const courseSlug = course.slug;

  return (
    <div className="min-h-screen bg-gray-50">
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
      />

      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={previewTitle}
        previewUrl={previewUrl}
        previewItems={previewItems}
        activeIndex={activePreviewIndex}
        isLoading={isPreviewLoading}
        onSelectItem={handleSelectPreviewItem}
        formatSecondsToMmSs={formatSecondsToMmSs}
      />

      <CourseHeader
        course={course}
        categoryChain={category_chain}
        formatDate={formatDate}
        onPreview={openPreview}
        isFireActive={isFireActive}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <OutcomesSection outcomes={course.outcomes} />
            <RelatedTopicsSection categories={category_chain} />
            <DescriptionSection description={course.description} />
            <RequirementsSection requirements={course.requirements} />
            <TargetAudienceSection targetAudience={course.target_audience} />
            <CurriculumSection
              sections={course.sections}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
              expandAll={expandAllSections}
              onToggleAll={toggleAllSections}
              onPreviewLesson={openPreview}
              courseId={course.id}
              formatSecondsToMmSs={formatSecondsToMmSs}
            />
            <InstructorSection instructor={course.instructor} />
            {sample_reviews && sample_reviews.length > 0 && (
              <ReviewsSection reviews={sample_reviews} />
            )}
          </div>

          <div className="lg:col-span-1">
            <CourseSidebar
              course={course}
              courseSlug={courseSlug}
              totalDurationSeconds={totalDurationSeconds}
              isFavourite={isFavourite}
              isTogglingFavourite={isTogglingFavourite}
              onToggleFavourite={toggleFavourite}
              onEnroll={() => setIsEnrollModalOpen(true)}
              onPreview={openPreview}
              formatPrice={formatPrice}
              formatSecondsToHms={formatSecondsToHms}
              onFireActiveChange={setIsFireActive}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
