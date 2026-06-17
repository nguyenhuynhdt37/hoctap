"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { CategoriesPaginatedResponse } from "@/types/admin/category";
import { TopicsResponse } from "@/types/admin/topic";
import { CourseDetailResponse, CourseFormData } from "@/types/lecturer/course";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  HiAcademicCap,
  HiCheckCircle,
  HiChevronLeft,
  HiChevronRight,
  HiCurrencyDollar,
  HiLightBulb,
  HiLockClosed,
  HiPhotograph,
  HiPlus,
  HiTrash,
  HiUsers,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";

interface EditCourseProps {
  courseId: string;
}

const EditCourse = ({ courseId }: EditCourseProps) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isGeneratingSubtitle, setIsGeneratingSubtitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingOutcomes, setIsGeneratingOutcomes] = useState(false);
  const [isGeneratingRequirements, setIsGeneratingRequirements] =
    useState(false);
  const [isGeneratingTargetAudience, setIsGeneratingTargetAudience] =
    useState(false);
  const isInitialLoadRef = useRef(true);

  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    subtitle: "",
    category_id: "",
    topic_id: "",
    description: "",
    level: "all",
    language: "vi",
    outcomes: [""],
    requirements: [""],
    target_audience: [""],
    base_price: 0,
    currency: "VND",
    is_published: false,
    is_lock_lesson: false,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof CourseFormData, string>>
  >({});

  const totalSteps = 4;

  // Fetch course details
  const { data: courseData, mutate: mutateCourse } =
    useSWR<CourseDetailResponse>(
      courseId ? `/lecturer/courses/${courseId}` : null,
      async (url: string) => {
        const res = await api.get(url);
        return res.data;
      },
      {
        revalidateOnFocus: false,
      }
    );

  // Fetch categories
  const { data: categoriesData } = useSWR<CategoriesPaginatedResponse>(
    "/admin/categories?page=1&page_size=100&sort_by=name&sort_order=asc",
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Fetch topics based on selected category
  const { data: topicsData } = useSWR<TopicsResponse>(
    formData.category_id
      ? `/admin/topics?category_id=${formData.category_id}&page=1&limit=100&sort_by=name&sort_order=asc`
      : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const allCategories = categoriesData?.items || [];
  const allTopics = topicsData?.data || [];

  // Populate form when course data is loaded
  useEffect(() => {
    if (courseData && isInitialLoadRef.current) {
      setFormData({
        title: courseData.title || "",
        subtitle: courseData.subtitle || "",
        category_id: courseData.category.id || "",
        topic_id: courseData.topic?.id || "",
        description: courseData.description || "",
        level: courseData.level || "all",
        language: courseData.language || "vi",
        outcomes: courseData.outcomes.length > 0 ? courseData.outcomes : [""],
        requirements:
          courseData.requirements.length > 0 ? courseData.requirements : [""],
        target_audience:
          courseData.target_audience.length > 0
            ? courseData.target_audience
            : [""],
        base_price: courseData.base_price || 0,
        currency: courseData.currency || "VND",
        is_published: courseData.is_published || false,
        is_lock_lesson: courseData.is_lock_lesson || false,
      });
      if (courseData.thumbnail_url) {
        setThumbnailPreview(getGoogleDriveImageUrl(courseData.thumbnail_url));
      }
      setIsLoadingCourse(false);
      isInitialLoadRef.current = false;
    }
  }, [courseData]);

  // Reset topic when category changes
  useEffect(() => {
    if (formData.category_id) {
      setFormData((prev) => ({ ...prev, topic_id: "" }));
    }
  }, [formData.category_id]);

  // Validation functions
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof CourseFormData, string>> = {};

    switch (step) {
      case 0: // Basic Info
        if (!formData.title.trim()) {
          newErrors.title = "Vui lòng nhập tiêu đề khóa học";
        }
        if (!formData.subtitle.trim()) {
          newErrors.subtitle = "Vui lòng nhập mô tả ngắn";
        }
        if (!formData.category_id) {
          newErrors.category_id = "Vui lòng chọn danh mục";
        }
        break;
      case 1: // Description
        if (!formData.description.trim()) {
          newErrors.description = "Vui lòng nhập mô tả chi tiết";
        }
        break;
      case 2: // Outcomes, Requirements, Target Audience
        if (
          formData.outcomes.length === 0 ||
          formData.outcomes.every((o) => !o.trim())
        ) {
          newErrors.outcomes = "Vui lòng nhập ít nhất một mục tiêu học tập";
        }
        if (
          formData.requirements.length === 0 ||
          formData.requirements.every((r) => !r.trim())
        ) {
          newErrors.requirements = "Vui lòng nhập ít nhất một yêu cầu";
        }
        if (
          formData.target_audience.length === 0 ||
          formData.target_audience.every((t) => !t.trim())
        ) {
          newErrors.target_audience =
            "Vui lòng nhập ít nhất một đối tượng học viên";
        }
        break;
      case 3: // Pricing
        if (formData.base_price < 0) {
          newErrors.base_price = "Giá không được âm";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleAddItem = (
    field: "outcomes" | "requirements" | "target_audience"
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const handleRemoveItem = (
    field: "outcomes" | "requirements" | "target_audience",
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleUpdateItem = (
    field: "outcomes" | "requirements" | "target_audience",
    index: number,
    value: string
  ) => {
    setFormData((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const handleGenerateSubtitle = async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề khóa học trước");
      return;
    }

    setIsGeneratingSubtitle(true);
    setError(null);

    try {
      const response = await api.post(
        "/lecturers/chat/course/create/short_description",
        {
          course_name: formData.title.trim(),
        }
      );

      // API trả về text thuần trực tiếp
      const generatedSubtitle = response.data;

      if (generatedSubtitle && typeof generatedSubtitle === "string") {
        setFormData((prev) => ({
          ...prev,
          subtitle: generatedSubtitle,
        }));
      } else {
        setError("Không thể tạo mô tả tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo mô tả tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingSubtitle(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề khóa học trước");
      return;
    }

    if (!formData.subtitle.trim()) {
      setError("Vui lòng nhập mô tả ngắn trước");
      return;
    }

    const selectedCategory = allCategories.find(
      (c) => c.id === formData.category_id
    );

    if (!selectedCategory) {
      setError("Vui lòng chọn danh mục trước");
      return;
    }

    setIsGeneratingDescription(true);
    setError(null);

    try {
      const payload: any = {
        course_name: formData.title.trim(),
        short_description: formData.subtitle.trim(),
        category_name: selectedCategory.name,
      };

      if (formData.topic_id.trim()) {
        const selectedTopic = allTopics.find((t) => t.id === formData.topic_id);
        if (selectedTopic) {
          payload.topic_name = selectedTopic.name;
        }
      }

      const response = await api.post(
        "/lecturers/chat/course/create/description",
        payload
      );

      // API trả về markdown string trực tiếp
      const generatedDescription = response.data;

      if (generatedDescription && typeof generatedDescription === "string") {
        setFormData((prev) => ({
          ...prev,
          description: generatedDescription,
        }));
      } else {
        setError("Không thể tạo mô tả chi tiết tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo mô tả chi tiết tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleGenerateOutcomes = async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề khóa học trước");
      return;
    }

    if (!formData.subtitle.trim()) {
      setError("Vui lòng nhập mô tả ngắn trước");
      return;
    }

    const selectedCategory = allCategories.find(
      (c) => c.id === formData.category_id
    );

    if (!selectedCategory) {
      setError("Vui lòng chọn danh mục trước");
      return;
    }

    setIsGeneratingOutcomes(true);
    setError(null);

    try {
      const payload: any = {
        course_name: formData.title.trim(),
        short_description: formData.subtitle.trim(),
        category_name: selectedCategory.name,
      };

      if (formData.topic_id.trim()) {
        const selectedTopic = allTopics.find((t) => t.id === formData.topic_id);
        if (selectedTopic) {
          payload.topic_name = selectedTopic.name;
        }
      }

      const response = await api.post(
        "/lecturers/chat/course/create/learning_goals",
        payload
      );

      // API trả về string[] trực tiếp
      const generatedOutcomes = Array.isArray(response.data)
        ? response.data
        : [];

      if (generatedOutcomes.length > 0) {
        setFormData((prev) => ({
          ...prev,
          outcomes: generatedOutcomes,
        }));
      } else {
        setError("Không thể tạo mục tiêu học tập tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo mục tiêu học tập tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingOutcomes(false);
    }
  };

  const handleGenerateRequirements = async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề khóa học trước");
      return;
    }

    if (!formData.subtitle.trim()) {
      setError("Vui lòng nhập mô tả ngắn trước");
      return;
    }

    const selectedCategory = allCategories.find(
      (c) => c.id === formData.category_id
    );

    if (!selectedCategory) {
      setError("Vui lòng chọn danh mục trước");
      return;
    }

    setIsGeneratingRequirements(true);
    setError(null);

    try {
      const payload: any = {
        course_name: formData.title.trim(),
        short_description: formData.subtitle.trim(),
        category_name: selectedCategory.name,
      };

      if (formData.topic_id.trim()) {
        const selectedTopic = allTopics.find((t) => t.id === formData.topic_id);
        if (selectedTopic) {
          payload.topic_name = selectedTopic.name;
        }
      }

      const response = await api.post(
        "/lecturers/chat/course/create/request",
        payload
      );

      // API trả về string[] trực tiếp
      const generatedRequirements = Array.isArray(response.data)
        ? response.data
        : [];

      if (generatedRequirements.length > 0) {
        setFormData((prev) => ({
          ...prev,
          requirements: generatedRequirements,
        }));
      } else {
        setError("Không thể tạo yêu cầu tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo yêu cầu tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingRequirements(false);
    }
  };

  const handleGenerateTargetAudience = async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề khóa học trước");
      return;
    }

    if (!formData.subtitle.trim()) {
      setError("Vui lòng nhập mô tả ngắn trước");
      return;
    }

    const selectedCategory = allCategories.find(
      (c) => c.id === formData.category_id
    );

    if (!selectedCategory) {
      setError("Vui lòng chọn danh mục trước");
      return;
    }

    setIsGeneratingTargetAudience(true);
    setError(null);

    try {
      const payload: any = {
        course_name: formData.title.trim(),
        short_description: formData.subtitle.trim(),
        category_name: selectedCategory.name,
      };

      if (formData.topic_id.trim()) {
        const selectedTopic = allTopics.find((t) => t.id === formData.topic_id);
        if (selectedTopic) {
          payload.topic_name = selectedTopic.name;
        }
      }

      const response = await api.post(
        "/lecturers/chat/course/create/student_target",
        payload
      );

      // API trả về string[] trực tiếp
      const generatedTargetAudience = Array.isArray(response.data)
        ? response.data
        : [];

      if (generatedTargetAudience.length > 0) {
        setFormData((prev) => ({
          ...prev,
          target_audience: generatedTargetAudience,
        }));
      } else {
        setError("Không thể tạo đối tượng học viên tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo đối tượng học viên tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingTargetAudience(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Clean up empty strings from arrays
      const payload: any = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        category_id: formData.category_id,
        description: formData.description.trim(),
        level: formData.level,
        language: formData.language,
        is_published: formData.is_published,
        is_lock_lesson: formData.is_lock_lesson,
        outcomes: formData.outcomes
          .filter((o) => o.trim())
          .map((o) => o.trim()),
        requirements: formData.requirements
          .filter((r) => r.trim())
          .map((r) => r.trim()),
        target_audience: formData.target_audience
          .filter((t) => t.trim())
          .map((t) => t.trim()),
        base_price: formData.base_price,
        currency: formData.currency,
      };

      // Only include topic_id if it's not empty
      if (formData.topic_id.trim()) {
        payload.topic_id = formData.topic_id;
      }

      const response = await api.put(`/lecturer/courses/${courseId}`, payload);

      setSuccessMessage(
        response.data?.message || "✅ Cập nhật khóa học thành công!"
      );

      // Reload course data
      await mutateCourse();

      // Redirect after 1 second
      setTimeout(() => {
        router.push("/lecturer/courses");
      }, 1000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi cập nhật khóa học";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadThumbnail = async () => {
    if (!thumbnailFile) {
      setUploadError("Vui lòng chọn hình ảnh");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", thumbnailFile);

      const response = await api.post(
        `/lecturer/courses/upload-thumbnail/${courseId}`,
        formDataUpload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSuccessMessage(
        response.data?.message || "✅ Tải lên banner thành công!"
      );

      // Reload course data
      await mutateCourse();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi tải lên banner";
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  if (isLoadingCourse) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-center text-gray-600 mt-4">
            Đang tải thông tin khóa học...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/lecturer/courses")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <HiChevronLeft className="h-5 w-5" />
            <span className="font-medium">Quay lại danh sách khóa học</span>
          </button>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Chỉnh sửa khóa học
          </h1>
          <p className="text-gray-600">Cập nhật thông tin khóa học của bạn</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <span className="font-medium">
              Bước {currentStep + 1} / {totalSteps}
            </span>
            <span className="font-semibold text-green-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span
              className={currentStep >= 0 ? "text-green-600 font-medium" : ""}
            >
              Thông tin cơ bản
            </span>
            <span
              className={currentStep >= 1 ? "text-green-600 font-medium" : ""}
            >
              Mô tả chi tiết
            </span>
            <span
              className={currentStep >= 2 ? "text-green-600 font-medium" : ""}
            >
              Mục tiêu & Đối tượng
            </span>
            <span
              className={currentStep >= 3 ? "text-green-600 font-medium" : ""}
            >
              Giá & Xuất bản
            </span>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <HiCheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 font-medium">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <HiXCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Error Message */}
        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <HiXCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          </div>
        )}

        {/* Thumbnail Section */}
        {currentStep === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <HiPhotograph className="inline h-5 w-5 text-green-600 mr-1" />
              Banner khóa học
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors">
              {thumbnailPreview ? (
                <div className="space-y-4">
                  <img
                    src={thumbnailPreview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg object-cover"
                  />
                  <div className="flex items-center justify-center gap-3">
                    <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors font-medium">
                      Chọn ảnh khác
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              setUploadError(
                                "Kích thước file không được vượt quá 10MB"
                              );
                              return;
                            }
                            setThumbnailFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setThumbnailPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                            setUploadError(null);
                          }
                        }}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailFile(null);
                        setThumbnailPreview(null);
                      }}
                      disabled={isUploading}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                    >
                      Xóa
                    </button>
                    {thumbnailFile && (
                      <button
                        type="button"
                        onClick={handleUploadThumbnail}
                        disabled={isUploading}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 flex items-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang tải...
                          </>
                        ) : (
                          <>
                            <HiCheckCircle className="h-5 w-5" />
                            Tải lên banner
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <HiPhotograph className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Nhấp để chọn hình ảnh
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, GIF (tối đa 10MB)
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          setUploadError(
                            "Kích thước file không được vượt quá 10MB"
                          );
                          return;
                        }
                        setThumbnailFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setThumbnailPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                        setUploadError(null);
                      }
                    }}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-6">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Thông tin cơ bản về khóa học
                </h2>
                <p className="text-gray-600">
                  Cập nhật thông tin cơ bản để học viên có thể tìm thấy khóa học
                  của bạn
                </p>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tiêu đề khóa học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Ví dụ: Lập trình Python từ cơ bản đến nâng cao"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors.title
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500 focus:border-transparent"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                  )}
                </div>

                {/* Subtitle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Mô tả ngắn <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSubtitle}
                      disabled={isGeneratingSubtitle || !formData.title.trim()}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                      title="Tự động tạo mô tả ngắn từ AI"
                    >
                      {isGeneratingSubtitle ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang tạo...
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          Tạo mô tả tự động
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        subtitle: e.target.value,
                      }))
                    }
                    placeholder="Một câu mô tả ngắn gọn về khóa học của bạn"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors.subtitle
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500 focus:border-transparent"
                    }`}
                  />
                  {errors.subtitle && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.subtitle}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Nhập tiêu đề khóa học và nhấn "Tạo mô tả tự động" để AI
                    tạo mô tả ngắn cho bạn
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category_id: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors.category_id
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500 focus:border-transparent"
                    }`}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {allCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.parent_id ? "  └─ " : ""}
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.category_id}
                    </p>
                  )}
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Chủ đề{" "}
                    <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                  </label>
                  <select
                    value={formData.topic_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        topic_id: e.target.value,
                      }))
                    }
                    disabled={!formData.category_id || allTopics.length === 0}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors.topic_id
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500 focus:border-transparent"
                    } ${
                      !formData.category_id
                        ? "bg-gray-100 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <option value="">
                      {!formData.category_id
                        ? "-- Vui lòng chọn danh mục trước --"
                        : "-- Chọn chủ đề --"}
                    </option>
                    {allTopics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </select>
                  {formData.category_id && allTopics.length === 0 && (
                    <p className="text-yellow-600 text-sm mt-1">
                      ⚠️ Danh mục này chưa có chủ đề nào. Bạn có thể bỏ qua bước
                      này.
                    </p>
                  )}
                </div>

                {/* Level & Language */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cấp độ
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          level: e.target.value as CourseFormData["level"],
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value="all">Tất cả cấp độ</option>
                      <option value="beginner">Người mới bắt đầu</option>
                      <option value="intermediate">Trung bình</option>
                      <option value="advanced">Nâng cao</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ngôn ngữ
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          language: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Description */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Mô tả chi tiết khóa học
                </h2>
                <p className="text-gray-600">
                  Cập nhật mô tả chi tiết sẽ giúp học viên hiểu rõ hơn về nội
                  dung và giá trị của khóa học
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Mô tả chi tiết <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={
                      isGeneratingDescription ||
                      !formData.title.trim() ||
                      !formData.subtitle.trim() ||
                      !formData.category_id
                    }
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    title="Tự động tạo mô tả chi tiết từ AI"
                  >
                    {isGeneratingDescription ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        Tạo mô tả tự động
                      </>
                    )}
                  </button>
                </div>
                <TiptapEditor
                  value={formData.description}
                  onChange={(content) =>
                    setFormData((prev) => ({ ...prev, description: content }))
                  }
                  placeholder="Nhập mô tả chi tiết về khóa học của bạn..."
                />
                {errors.description && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  💡 Nhập tiêu đề, mô tả ngắn và chọn danh mục, sau đó nhấn "Tạo
                  mô tả tự động" để AI tạo mô tả chi tiết cho bạn. Bạn có thể
                  chỉnh sửa sau.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Outcomes, Requirements, Target Audience */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Mục tiêu và đối tượng học viên
                </h2>
                <p className="text-gray-600">
                  Cập nhật thông tin để giúp học viên hiểu rõ những gì họ sẽ đạt
                  được sau khi hoàn thành khóa học
                </p>
              </div>

              {/* Outcomes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <HiLightBulb className="inline h-5 w-5 text-yellow-500 mr-1" />
                    Mục tiêu học tập <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateOutcomes}
                    disabled={
                      isGeneratingOutcomes ||
                      !formData.title.trim() ||
                      !formData.subtitle.trim() ||
                      !formData.category_id
                    }
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    title="Tự động tạo mục tiêu học tập từ AI"
                  >
                    {isGeneratingOutcomes ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        Tạo mục tiêu tự động
                      </>
                    )}
                  </button>
                </div>
                {formData.outcomes.map((outcome, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={outcome}
                      onChange={(e) =>
                        handleUpdateItem("outcomes", index, e.target.value)
                      }
                      placeholder={`Mục tiêu ${index + 1}...`}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    {formData.outcomes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("outcomes", index)}
                        className="px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <HiTrash className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddItem("outcomes")}
                  className="flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors mt-2"
                >
                  <HiPlus className="h-5 w-5" />
                  Thêm mục tiêu
                </button>
                {errors.outcomes && (
                  <p className="text-red-600 text-sm mt-2">{errors.outcomes}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  💡 Nhấn "Tạo mục tiêu tự động" để AI tạo các mục tiêu học tập
                  cho bạn. Bạn có thể chỉnh sửa hoặc thêm mục tiêu sau.
                </p>
              </div>

              {/* Requirements */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <HiAcademicCap className="inline h-5 w-5 text-blue-500 mr-1" />
                    Yêu cầu <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRequirements}
                    disabled={
                      isGeneratingRequirements ||
                      !formData.title.trim() ||
                      !formData.subtitle.trim() ||
                      !formData.category_id
                    }
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    title="Tự động tạo yêu cầu từ AI"
                  >
                    {isGeneratingRequirements ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        Tạo yêu cầu tự động
                      </>
                    )}
                  </button>
                </div>
                {formData.requirements.map((requirement, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={requirement}
                      onChange={(e) =>
                        handleUpdateItem("requirements", index, e.target.value)
                      }
                      placeholder={`Yêu cầu ${index + 1}...`}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    {formData.requirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("requirements", index)}
                        className="px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <HiTrash className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddItem("requirements")}
                  className="flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors mt-2"
                >
                  <HiPlus className="h-5 w-5" />
                  Thêm yêu cầu
                </button>
                {errors.requirements && (
                  <p className="text-red-600 text-sm mt-2">
                    {errors.requirements}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  💡 Nhấn "Tạo yêu cầu tự động" để AI tạo các yêu cầu cho bạn.
                  Bạn có thể chỉnh sửa hoặc thêm yêu cầu sau.
                </p>
              </div>

              {/* Target Audience */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <HiUsers className="inline h-5 w-5 text-purple-500 mr-1" />
                    Đối tượng học viên <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateTargetAudience}
                    disabled={
                      isGeneratingTargetAudience ||
                      !formData.title.trim() ||
                      !formData.subtitle.trim() ||
                      !formData.category_id
                    }
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    title="Tự động tạo đối tượng học viên từ AI"
                  >
                    {isGeneratingTargetAudience ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        Tạo đối tượng tự động
                      </>
                    )}
                  </button>
                </div>
                {formData.target_audience.map((audience, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={audience}
                      onChange={(e) =>
                        handleUpdateItem(
                          "target_audience",
                          index,
                          e.target.value
                        )
                      }
                      placeholder={`Đối tượng ${index + 1}...`}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    {formData.target_audience.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveItem("target_audience", index)
                        }
                        className="px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <HiTrash className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddItem("target_audience")}
                  className="flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors mt-2"
                >
                  <HiPlus className="h-5 w-5" />
                  Thêm đối tượng
                </button>
                {errors.target_audience && (
                  <p className="text-red-600 text-sm mt-2">
                    {errors.target_audience}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  💡 Nhấn "Tạo đối tượng tự động" để AI tạo các đối tượng học
                  viên cho bạn. Bạn có thể chỉnh sửa hoặc thêm đối tượng sau.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Pricing & Publish */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Giá và xuất bản
                </h2>
                <p className="text-gray-600">
                  Cập nhật giá cho khóa học và quyết định có xuất bản ngay hay
                  không
                </p>
              </div>

              <div className="space-y-5">
                {/* Price */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <HiCurrencyDollar className="inline h-5 w-5 text-green-600 mr-1" />
                    Giá khóa học (VND)
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={formData.base_price}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setFormData((prev) => ({ ...prev, base_price: value }));
                      }}
                      min="0"
                      step="1000"
                      placeholder="0"
                      className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        errors.base_price
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-green-500 focus:border-transparent"
                      }`}
                    />
                    <select
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          currency: e.target.value,
                        }))
                      }
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="VND">VND</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  {errors.base_price && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.base_price}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Nhập 0 để tạo khóa học miễn phí
                  </p>
                </div>

                {/* Lock Lessons Toggle */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                        <HiLockClosed className="h-5 w-5 text-blue-600" />
                        Khóa bài học
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        {formData.is_lock_lesson
                          ? "Học viên phải xem bài học theo thứ tự, không thể nhảy bài"
                          : "Học viên có thể xem bất kỳ bài học nào trong khóa học"}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_lock_lesson}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_lock_lesson: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Publish Toggle */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Xuất bản khóa học
                      </label>
                      <p className="text-xs text-gray-500">
                        {formData.is_published
                          ? "Khóa học sẽ được xuất bản và hiển thị công khai sau khi được duyệt"
                          : "Khóa học sẽ được lưu ở chế độ nháp"}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_published}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_published: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Tóm tắt khóa học
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tiêu đề:</span>
                      <span className="font-medium text-gray-900">
                        {formData.title || "Chưa có"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Danh mục:</span>
                      <span className="font-medium text-gray-900">
                        {allCategories.find(
                          (c) => c.id === formData.category_id
                        )?.name || "Chưa chọn"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Giá:</span>
                      <span className="font-medium text-gray-900">
                        {formData.base_price === 0
                          ? "Miễn phí"
                          : new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: formData.currency,
                              maximumFractionDigits: 0,
                            }).format(formData.base_price)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trạng thái:</span>
                      <span
                        className={`font-medium ${
                          formData.is_published
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {formData.is_published ? "Xuất bản" : "Nháp"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0 || isSubmitting}
              className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiChevronLeft className="h-5 w-5" />
              Quay lại
            </button>

            {currentStep < totalSteps - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tiếp theo
                <HiChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    <HiCheckCircle className="h-5 w-5" />
                    Cập nhật khóa học
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCourse;
