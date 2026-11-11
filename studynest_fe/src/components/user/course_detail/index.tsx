"use client";

import CourseEducationInfo from "@/components/catalog/course-education";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useUserStore } from "@/stores/user";
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
  const user = useUserStore((s) => s.user);
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
      return response.data;
    }
  );

  // Only fetch favourite status when user is authenticated to avoid 401 -> /login redirect
  const { data: favouriteData, mutate: mutateFavourite } = useSWR(
    user?.id && data?.course?.id ? `/favourites/${data.course.id}` : null,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    }
  );

  // Auto-expand the first curriculum section when course data loads
  useEffect(() => {
    if (data?.course?.sections && data.course.sections.length > 0) {
      setExpandedSections(new Set([data.course.sections[0].id]));
    }
  }, [data?.course?.id]);

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
    if (!dateString) return "Mới cập nhật";
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return "Mới cập nhật";
    return parsed.toLocaleDateString("vi-VN");
  };

  const sumCourseDurationSeconds = (
    sections: CourseDetailData["course"]["sections"]
  ) => {
    if (!Array.isArray(sections)) return 0;
    return sections.reduce((total, section) => {
      return (
        total +
        (section.lessons || []).reduce(
          (s, lesson) =>
            s + (typeof lesson.duration === "number" ? lesson.duration : 0),
          0
        )
      );
    }, 0);
  };

  const formatSecondsToHms = (seconds: number) => {
    if (!seconds || seconds <= 0) return "Linh hoạt";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h} giờ ${m} phút`;
    if (m > 0) return `${m} phút ${s > 0 ? `${s} giây` : ""}`.trim();
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
    if (!user?.id) {
      showToast.info("Vui lòng đăng nhập để lưu khóa học vào danh sách yêu thích.");
      router.push(`/login?redirect=${encodeURIComponent(`/course/${slug}`)}`);
      return;
    }

    try {
      setIsTogglingFavourite(true);
      const response = await api.post(`/favourites/${data.course.id}`);
      if (response.data?.is_favourite !== undefined) {
        setIsFavourite(response.data.is_favourite);
        mutateFavourite();
      }
    } catch {
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
        setPreviewTitle(list[activeIndex].title || "Xem trước bài giảng");
      } else {
        setPreviewUrl("");
        setPreviewTitle("Xem trước bài giảng");
      }
      setIsPreviewOpen(true);
    } catch {
      setPreviewUrl("");
      setPreviewTitle("Xem trước bài giảng");
      setIsPreviewOpen(true);
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
    if (!user?.id) {
      showToast.info("Vui lòng đăng nhập để đăng ký khóa học.");
      router.push(`/login?redirect=${encodeURIComponent(`/course/${slug}`)}`);
      return;
    }
    if (!courseSlug) {
      showToast.error(
        "Không thể đăng ký: Thiếu thông tin khóa học. Vui lòng thử lại sau."
      );
      return;
    }

    try {
      setIsEnrolling(true);

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
            showToast.success(message || "Thanh toán thành công! 🎉");

            if (is_free) {
              setTimeout(() => {
                router.push(`/learning/${courseSlug}`);
              }, 1500);
            } else if (transaction_id) {
              const redirectUrl = `/transaction?status=success&order_id=${transaction_id}&redirect=/learning/${courseSlug}`;
              router.push(redirectUrl);
            } else {
              setTimeout(() => {
                router.push(`/learning/${courseSlug}`);
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
    } catch {
      showToast.error("Đã xảy ra lỗi không mong đợi. Vui lòng thử lại sau.");
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-b from-primary-light/70 via-background to-background border-b border-border py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
            <div className="h-4 bg-primary-pastel/60 rounded-full w-48 mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="h-10 bg-primary-pastel/60 rounded-2xl w-4/5" />
                <div className="h-5 bg-primary-light rounded-xl w-3/5" />
                <div className="flex gap-3 pt-2">
                  <div className="h-8 w-28 bg-primary-light rounded-full" />
                  <div className="h-8 w-36 bg-primary-light rounded-full" />
                </div>
              </div>
              <div className="lg:col-span-4">
                <div className="aspect-video bg-primary-light rounded-[24px]" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="h-52 bg-surface rounded-[24px] border border-border" />
              <div className="h-80 bg-surface rounded-[24px] border border-border" />
            </div>
            <div className="lg:col-span-4">
              <div className="h-96 bg-surface rounded-[24px] border border-border" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-surface rounded-[24px] border border-border p-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            ☁️
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Không tìm thấy khóa học
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Khóa học bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang lộ trình khác trên Mây Mây.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors cursor-pointer"
          >
            Quay về Trang chủ Mây Mây
          </button>
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
    <div className="min-h-screen bg-background pb-16">
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
        totalDurationSeconds={totalDurationSeconds}
        formatDate={formatDate}
        formatSecondsToHms={formatSecondsToHms}
        onPreview={openPreview}
        isFireActive={isFireActive}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <CourseEducationInfo courseId={data.course.id} />
            <OutcomesSection outcomes={course.outcomes} />
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
            <DescriptionSection description={course.description} />
            <RequirementsSection requirements={course.requirements} />
            <TargetAudienceSection targetAudience={course.target_audience} />
            <RelatedTopicsSection categories={category_chain} />
            <InstructorSection instructor={course.instructor} />
            {sample_reviews && sample_reviews.length > 0 && (
              <ReviewsSection reviews={sample_reviews} />
            )}
          </div>

          <div className="lg:col-span-4">
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
