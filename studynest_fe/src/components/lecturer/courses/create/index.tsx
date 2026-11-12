"use client";

import { prepareImageUpload } from "@/lib/prepare-image-upload";
import { Alert, Button, Card } from "@/components/ui";
import CourseTaxonomyForm from "@/components/catalog/course-taxonomy-form";
import { emptyTaxonomy, taxonomyInput, type CourseTaxonomyInput, type CourseEducation } from "@/types/catalog";
import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { Category } from "@/types/admin/category";
import { Topic } from "@/types/admin/topic";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  Image as ImageIcon,
  Lightbulb,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

interface TopicsResponse {
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  data: Topic[];
}

interface CourseFormData {
  title: string;
  subtitle: string;
  category_id: string;
  topic_id: string;
  description: string;
  level: "all" | "beginner" | "intermediate" | "advanced";
  language: string;
  outcomes: string[];
  requirements: string[];
  target_audience: string[];
  base_price: number;
  currency: string;
  is_published: boolean;
  is_lock_lesson: boolean;
}

const CreateCourse = () => {
  const router = useRouter();
  const [education, setEducation] = useState<CourseTaxonomyInput>(emptyTaxonomy);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
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

  // Fetch categories
  const { data: categoriesData } = useSWR<Category[]>(
    "/lecturer/courses/categories",
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

  const allCategories = categoriesData || [];
  const allTopics = topicsData?.data || [];

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
        // Topic is optional, so no validation needed
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
        education,
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

      const response = await api.post("/lecturer/courses/create", payload);
      const courseId = response.data?.course_id;

      setCreatedCourseId(courseId);
      setSuccessMessage(
        response.data?.message || "✅ Tạo khóa học thành công!"
      );

      // Show upload modal after successful creation
      if (courseId) {
        setShowUploadModal(true);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi tạo khóa học";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/lecturer/courses")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors cursor-pointer text-sm font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Quay lại danh sách khóa học</span>
          </button>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-2">
            Tạo khóa học mới
          </h1>
          <p className="text-muted-foreground">
            Tạo khóa học mới từng bước một cách dễ dàng
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <span className="font-medium text-foreground">
              Bước {currentStep + 1} / {totalSteps}
            </span>
            <span className="font-semibold text-primary">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-primary-light rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span
              className={currentStep >= 0 ? "text-primary font-semibold" : ""}
            >
              Thông tin cơ bản
            </span>
            <span
              className={currentStep >= 1 ? "text-primary font-semibold" : ""}
            >
              Mô tả chi tiết
            </span>
            <span
              className={currentStep >= 2 ? "text-primary font-semibold" : ""}
            >
              Mục tiêu & Đối tượng
            </span>
            <span
              className={currentStep >= 3 ? "text-primary font-semibold" : ""}
            >
              Giá & Xuất bản
            </span>
          </div>
        </Card>

        {/* Success Message */}
        {successMessage && (
          <Alert variant="success" className="mb-6">
            {successMessage}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Step Content */}
        <Card className="p-8 mb-6">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="mb-6">
              <CourseTaxonomyForm value={education} onChange={setEducation} />
            </div>
          )}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Thông tin cơ bản về khóa học
                </h2>
                <p className="text-muted-foreground">
                  Bắt đầu với những thông tin cơ bản để học viên có thể tìm thấy
                  khóa học của bạn
                </p>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Tiêu đề khóa học{" "}
                    <span className="text-destructive-foreground">*</span>
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
                    className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                      errors.title
                        ? "border-destructive-border focus:ring-destructive-border/40 focus:border-destructive-foreground"
                        : "border-border focus:ring-primary/25 focus:border-primary"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-destructive-foreground text-sm mt-1">
                      {errors.title}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Tiêu đề nên ngắn gọn, rõ ràng và hấp dẫn
                  </p>
                </div>

                {/* Subtitle */}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label className="block text-sm font-semibold text-foreground">
                      Mô tả ngắn{" "}
                      <span className="text-destructive-foreground">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      onClick={handleGenerateSubtitle}
                      disabled={isGeneratingSubtitle || !formData.title.trim()}
                      isLoading={isGeneratingSubtitle}
                      loadingText="Đang tạo..."
                      leftIcon={
                        !isGeneratingSubtitle ? (
                          <Sparkles className="h-4 w-4" />
                        ) : undefined
                      }
                      title="Tự động tạo mô tả ngắn từ AI"
                    >
                      Tạo mô tả tự động
                    </Button>
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
                    className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                      errors.subtitle
                        ? "border-destructive-border focus:ring-destructive-border/40 focus:border-destructive-foreground"
                        : "border-border focus:ring-primary/25 focus:border-primary"
                    }`}
                  />
                  {errors.subtitle && (
                    <p className="text-destructive-foreground text-sm mt-1">
                      {errors.subtitle}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Nhập tiêu đề khóa học và nhấn &ldquo;Tạo mô tả tự động&rdquo; để AI
                      tạo mô tả ngắn cho bạn
                    </span>
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Danh mục{" "}
                    <span className="text-destructive-foreground">*</span>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category_id: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground focus:outline-none focus:ring-2 transition-all ${
                      errors.category_id
                        ? "border-destructive-border focus:ring-destructive-border/40 focus:border-destructive-foreground"
                        : "border-border focus:ring-primary/25 focus:border-primary"
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
                    <p className="text-destructive-foreground text-sm mt-1">
                      {errors.category_id}
                    </p>
                  )}
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Chủ đề{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (Tùy chọn)
                    </span>
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
                    className={`w-full px-4 py-3 border rounded-xl text-foreground focus:outline-none focus:ring-2 transition-all ${
                      errors.topic_id
                        ? "border-destructive-border focus:ring-destructive-border/40 focus:border-destructive-foreground"
                        : "border-border focus:ring-primary/25 focus:border-primary"
                    } ${
                      !formData.category_id
                        ? "bg-surface-muted cursor-not-allowed opacity-70"
                        : "bg-surface"
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
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Chủ đề giúp phân loại chi tiết hơn cho khóa học của bạn
                    </span>
                  </p>
                  {formData.category_id && allTopics.length === 0 && (
                    <p className="text-warning-foreground text-sm mt-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        Danh mục này chưa có chủ đề nào. Bạn có thể bỏ qua bước
                        này.
                      </span>
                    </p>
                  )}
                </div>

                {/* Level & Language */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
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
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    >
                      <option value="all">Tất cả cấp độ</option>
                      <option value="beginner">Người mới bắt đầu</option>
                      <option value="intermediate">Trung bình</option>
                      <option value="advanced">Nâng cao</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
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
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
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
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Mô tả chi tiết khóa học
                </h2>
                <p className="text-muted-foreground">
                  Mô tả chi tiết sẽ giúp học viên hiểu rõ hơn về nội dung và giá
                  trị của khóa học
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Mô tả chi tiết{" "}
                    <span className="text-destructive-foreground">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    onClick={handleGenerateDescription}
                    disabled={
                      isGeneratingDescription ||
                      !formData.title.trim() ||
                      !formData.subtitle.trim() ||
                      !formData.category_id
                    }
                    isLoading={isGeneratingDescription}
                    loadingText="Đang tạo..."
                    leftIcon={
                      !isGeneratingDescription ? (
                        <Sparkles className="h-4 w-4" />
                      ) : undefined
                    }
                    title="Tự động tạo mô tả chi tiết từ AI"
                  >
                    Tạo mô tả tự động
                  </Button>
                </div>
                <TiptapEditor
                  value={formData.description}
                  onChange={(content) =>
                    setFormData((prev) => ({ ...prev, description: content }))
                  }
                  placeholder="Nhập mô tả chi tiết về khóa học của bạn..."
                />
                {errors.description && (
                  <p className="text-destructive-foreground text-sm mt-1">
                    {errors.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    Nhập tiêu đề, mô tả ngắn và chọn danh mục, sau đó nhấn &ldquo;Tạo
                    mô tả tự động&rdquo; để AI tạo mô tả chi tiết cho bạn. Bạn có thể
                    chỉnh sửa sau.
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Outcomes, Requirements, Target Audience */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Mục tiêu và đối tượng học viên
                </h2>
                <p className="text-muted-foreground">
                  Giúp học viên hiểu rõ những gì họ sẽ đạt được sau khi hoàn
                  thành khóa học
                </p>
              </div>

              {/* Outcomes */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Lightbulb className="h-4 w-4 text-warning-foreground" />
                    <span>Mục tiêu học tập</span>
                    <span className="text-destructive-foreground">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    onClick={handleGenerateOutcomes}
                    disabled={
                      isGeneratingOutcomes ||
                      !formData.title.trim() ||
                      !formData.subtitle.trim() ||
                      !formData.category_id
                    }
                    isLoading={isGeneratingOutcomes}
                    loadingText="Đang tạo..."
                    leftIcon={
                      !isGeneratingOutcomes ? (
                        <Sparkles className="h-4 w-4" />
                      ) : undefined
                    }
                    title="Tự động tạo mục tiêu học tập từ AI"
                  >
                    Tạo mục tiêu tự động
                  </Button>
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
                      className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    />
                    {formData.outcomes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("outcomes", index)}
                        className="px-4 py-3 bg-destructive-bg text-destructive-foreground border border-destructive-border/60 rounded-xl hover:bg-destructive-bg/80 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="pastel"
                  size="sm"
                  onClick={() => handleAddItem("outcomes")}
                  leftIcon={<Plus className="h-4 w-4" />}
                  className="mt-2"
                >
                  Thêm mục tiêu
                </Button>
                {errors.outcomes && (
                  <p className="text-destructive-foreground text-sm mt-2">
                    {errors.outcomes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    Nhấn &ldquo;Tạo mục tiêu tự động&rdquo; để AI tạo các mục tiêu học tập
                    cho bạn. Bạn có thể chỉnh sửa hoặc thêm mục tiêu sau.
                  </span>
                </p>
              </div>

              {/* Requirements */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span>Yêu cầu</span>
                    <span className="text-destructive-foreground">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    onClick={handleGenerateRequirements}
                    disabled={
                      isGeneratingRequirements ||
                      !formData.title.trim() ||
                      !formData.subtitle.trim() ||
                      !formData.category_id
                    }
                    isLoading={isGeneratingRequirements}
                    loadingText="Đang tạo..."
                    leftIcon={
                      !isGeneratingRequirements ? (
                        <Sparkles className="h-4 w-4" />
                      ) : undefined
                    }
                    title="Tự động tạo yêu cầu từ AI"
                  >
                    Tạo yêu cầu tự động
                  </Button>
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
                      className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    />
                    {formData.requirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem("requirements", index)}
                        className="px-4 py-3 bg-destructive-bg text-destructive-foreground border border-destructive-border/60 rounded-xl hover:bg-destructive-bg/80 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="pastel"
                  size="sm"
                  onClick={() => handleAddItem("requirements")}
                  leftIcon={<Plus className="h-4 w-4" />}
                  className="mt-2"
                >
                  Thêm yêu cầu
                </Button>
                {errors.requirements && (
                  <p className="text-destructive-foreground text-sm mt-2">
                    {errors.requirements}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    Nhấn &ldquo;Tạo yêu cầu tự động&rdquo; để AI tạo các yêu cầu cho bạn.
                    Bạn có thể chỉnh sửa hoặc thêm yêu cầu sau.
                  </span>
                </p>
              </div>

              {/* Target Audience */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Users className="h-4 w-4 text-info-foreground" />
                    <span>Đối tượng học viên</span>
                    <span className="text-destructive-foreground">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    onClick={handleGenerateTargetAudience}
                    disabled={
                      isGeneratingTargetAudience ||
                      !formData.title.trim() ||
                      !formData.subtitle.trim() ||
                      !formData.category_id
                    }
                    isLoading={isGeneratingTargetAudience}
                    loadingText="Đang tạo..."
                    leftIcon={
                      !isGeneratingTargetAudience ? (
                        <Sparkles className="h-4 w-4" />
                      ) : undefined
                    }
                    title="Tự động tạo đối tượng học viên từ AI"
                  >
                    Tạo đối tượng tự động
                  </Button>
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
                      className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    />
                    {formData.target_audience.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveItem("target_audience", index)
                        }
                        className="px-4 py-3 bg-destructive-bg text-destructive-foreground border border-destructive-border/60 rounded-xl hover:bg-destructive-bg/80 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="pastel"
                  size="sm"
                  onClick={() => handleAddItem("target_audience")}
                  leftIcon={<Plus className="h-4 w-4" />}
                  className="mt-2"
                >
                  Thêm đối tượng
                </Button>
                {errors.target_audience && (
                  <p className="text-destructive-foreground text-sm mt-2">
                    {errors.target_audience}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    Nhấn &ldquo;Tạo đối tượng tự động&rdquo; để AI tạo các đối tượng học
                    viên cho bạn. Bạn có thể chỉnh sửa hoặc thêm đối tượng sau.
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Pricing & Publish */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Giá và xuất bản
                </h2>
                <p className="text-muted-foreground">
                  Thiết lập giá cho khóa học và quyết định có xuất bản ngay hay
                  không
                </p>
              </div>

              <div className="space-y-5">
                {/* Price */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
                    <CircleDollarSign className="h-4 w-4 text-primary" />
                    <span>Giá khóa học (VND)</span>
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
                      className={`flex-1 px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                        errors.base_price
                          ? "border-destructive-border focus:ring-destructive-border/40 focus:border-destructive-foreground"
                          : "border-border focus:ring-primary/25 focus:border-primary"
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
                      className="px-4 py-3 bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    >
                      <option value="VND">VND</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  {errors.base_price && (
                    <p className="text-destructive-foreground text-sm mt-1">
                      {errors.base_price}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Nhập 0 để tạo khóa học miễn phí</span>
                  </p>
                </div>

                {/* Lock Lessons Toggle */}
                <div className="bg-info-bg/70 rounded-xl p-6 border border-info-border">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
                        <Lock className="h-4 w-4 text-info-foreground" />
                        Khóa bài học
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
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
                      <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Publish Toggle */}
                <div className="bg-background/80 rounded-xl p-6 border border-border">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1">
                        Xuất bản khóa học
                      </label>
                      <p className="text-xs text-muted-foreground">
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
                      <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-primary-light/60 border border-primary-pastel rounded-xl p-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    Tóm tắt khóa học
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Tiêu đề:</span>
                      <span className="font-medium text-foreground text-right">
                        {formData.title || "Chưa có"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Danh mục:</span>
                      <span className="font-medium text-foreground text-right">
                        {allCategories.find(
                          (c) => c.id === formData.category_id
                        )?.name || "Chưa chọn"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Giá:</span>
                      <span className="font-medium text-foreground text-right">
                        {formData.base_price === 0
                          ? "Miễn phí"
                          : new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: formData.currency,
                              maximumFractionDigits: 0,
                            }).format(formData.base_price)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Trạng thái:</span>
                      <span
                        className={`font-medium ${
                          formData.is_published
                            ? "text-primary"
                            : "text-muted-foreground"
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
        </Card>

        {/* Navigation Buttons */}
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleBack}
              disabled={currentStep === 0 || isSubmitting}
              leftIcon={<ChevronLeft className="h-5 w-5" />}
            >
              Quay lại
            </Button>

            {currentStep < totalSteps - 1 ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleNext}
                rightIcon={<ChevronRight className="h-5 w-5" />}
              >
                Tiếp theo
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                loadingText="Đang tạo..."
                leftIcon={
                  !isSubmitting ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : undefined
                }
              >
                Tạo khóa học
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Upload Thumbnail Modal */}
      {showUploadModal && createdCourseId && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50"
            onClick={() => {
              if (!isUploading) {
                setShowUploadModal(false);
                router.push("/lecturer/courses");
              }
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-2xl font-bold text-foreground">
                  Tải lên banner khóa học
                </h3>
                <button
                  onClick={() => {
                    if (!isUploading) {
                      setShowUploadModal(false);
                      router.push("/lecturer/courses");
                    }
                  }}
                  disabled={isUploading}
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {uploadError && (
                <Alert variant="destructive" className="mb-6">
                  {uploadError}
                </Alert>
              )}

              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-3">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span>Chọn hình ảnh banner</span>
                  </label>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors bg-background/40">
                    {thumbnailPreview ? (
                      <div className="space-y-4">
                        <img
                          src={thumbnailPreview}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded-xl object-cover border border-border"
                        />
                        <div className="flex items-center justify-center gap-3">
                          <label className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover cursor-pointer transition-colors font-medium text-sm">
                            Chọn ảnh khác
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setThumbnailFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setThumbnailPreview(
                                      reader.result as string
                                    );
                                  };
                                  reader.readAsDataURL(file);
                                  setUploadError(null);
                                }
                              }}
                              className="hidden"
                              disabled={isUploading}
                            />
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setThumbnailFile(null);
                              setThumbnailPreview(null);
                            }}
                            disabled={isUploading}
                          >
                            Xóa
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <div className="space-y-4">
                          <div className="mx-auto w-16 h-16 bg-primary-light rounded-full flex items-center justify-center text-primary">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Nhấp để chọn hình ảnh
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
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

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setShowUploadModal(false);
                      router.push("/lecturer/courses");
                    }}
                    disabled={isUploading}
                  >
                    Bỏ qua
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={async () => {
                      if (!thumbnailFile) {
                        setUploadError("Vui lòng chọn hình ảnh");
                        return;
                      }

                      setIsUploading(true);
                      setUploadError(null);

                      try {
                        const formData = new FormData();
                        formData.append(
                          "file",
                          await prepareImageUpload(thumbnailFile, "courseThumbnail"),
                        );

                        const response = await api.post(
                          `/lecturer/courses/upload-thumbnail/${createdCourseId}`,
                          formData,
                          {
                            headers: {
                              "Content-Type": "multipart/form-data",
                            },
                          }
                        );

                        setSuccessMessage(
                          response.data?.message ||
                            "Tải lên banner thành công!"
                        );

                        // Redirect after 1 second
                        setTimeout(() => {
                          router.push("/lecturer/courses");
                        }, 1000);
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
                    }}
                    disabled={isUploading || !thumbnailFile}
                    isLoading={isUploading}
                    loadingText="Đang tải lên..."
                    leftIcon={
                      !isUploading ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : undefined
                    }
                  >
                    Tải lên banner
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CreateCourse;
