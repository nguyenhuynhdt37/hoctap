"use client";

import CourseTaxonomyForm from "@/components/catalog/course-taxonomy-form";
import {
  EditPreviewSidebar,
  type EditStepKey,
} from "@/components/lecturer/courses/edit/edit-preview-sidebar";
import TiptapEditor from "@/components/shared/tiptap_editor";
import { Alert, Button, Card } from "@/components/ui";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import {
  coinToVnd,
  DEFAULT_COIN_VND_RATE,
  formatCoin,
  formatCoursePriceCoin,
  vndToCoin,
} from "@/lib/learning-hub/coin-logic";
import { prepareImageUpload } from "@/lib/prepare-image-upload";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  type CatalogOptions,
  type CourseTaxonomyInput,
  emptyTaxonomy,
} from "@/types/catalog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Lock,
  Plus,
  Rocket,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from "pulsoicon-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

interface CreateCourseFormData {
  title: string;
  subtitle: string;
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

const CREATE_STEP_SCHEMA = {
  step: {
    type: "string",
    default: "info",
    allowed: ["info", "description", "outcomes", "pricing"] as const,
  },
} as const;

const STEP_TABS: Array<{
  key: EditStepKey;
  index: number;
  label: string;
  shortLabel: string;
  Icon: typeof BookOpen;
}> = [
  {
    key: "info",
    index: 0,
    label: "Thông tin & Phân loại",
    shortLabel: "Thông tin",
    Icon: BookOpen,
  },
  {
    key: "description",
    index: 1,
    label: "Mô tả chi tiết",
    shortLabel: "Mô tả",
    Icon: FileText,
  },
  {
    key: "outcomes",
    index: 2,
    label: "Mục tiêu & Đối tượng",
    shortLabel: "Mục tiêu",
    Icon: Target,
  },
  {
    key: "pricing",
    index: 3,
    label: "Giá Coin & Xuất bản",
    shortLabel: "Giá & Xuất bản",
    Icon: Coins,
  },
];

const QUICK_COIN_PRESETS = [
  { coin: 0, label: "Miễn phí" },
  { coin: 10, label: "10 Coin" },
  { coin: 25, label: "25 Coin" },
  { coin: 50, label: "50 Coin" },
  { coin: 100, label: "100 Coin" },
];

const CreateCourse = () => {
  const router = useRouter();
  const { values: urlState, setParam } = useUrlQueryState(CREATE_STEP_SCHEMA);
  const activeStepKey = urlState.step;
  const currentStep = useMemo(
    () => Math.max(0, STEP_TABS.findIndex((t) => t.key === activeStepKey)),
    [activeStepKey]
  );

  const [education, setEducation] = useState<CourseTaxonomyInput>(emptyTaxonomy);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [bannerUploaded, setBannerUploaded] = useState(false);

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

  const [formData, setFormData] = useState<CreateCourseFormData>({
    title: "",
    subtitle: "",
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
    Partial<Record<keyof CreateCourseFormData, string>>
  >({});

  // Fetch catalog options (Khối lớp · Môn học · Định hướng · Kỳ thi)
  const { data: catalogOptions } = useSWR<CatalogOptions>(
    "/catalog/filters",
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const selectedSubjectName = useMemo(() => {
    if (!education.subject_id || !catalogOptions?.subjects) return "";
    return (
      catalogOptions.subjects.find((s) => s.id === education.subject_id)
        ?.name || ""
    );
  }, [catalogOptions?.subjects, education.subject_id]);

  const selectedGradeNames = useMemo(() => {
    if (!education.grade_ids.length || !catalogOptions?.grades) return [];
    const byId = new Map(catalogOptions.grades.map((g) => [g.id, g.name]));
    return education.grade_ids
      .map((id) => byId.get(id))
      .filter((name): name is string => Boolean(name));
  }, [catalogOptions?.grades, education.grade_ids]);

  const wordCount = useMemo(() => {
    const plain = (formData.description || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!plain) return 0;
    return plain.split(" ").length;
  }, [formData.description]);

  const jumpToStep = (step: EditStepKey) => {
    setParam("step", step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateAllSteps = (): {
    valid: boolean;
    firstInvalidStep: EditStepKey | null;
  } => {
    const newErrors: Partial<Record<keyof CreateCourseFormData, string>> = {};
    let firstInvalidStep: EditStepKey | null = null;

    if (!formData.title.trim()) {
      newErrors.title = "Vui lòng nhập tiêu đề khóa học";
      firstInvalidStep = firstInvalidStep ?? "info";
    }
    if (!formData.subtitle.trim()) {
      newErrors.subtitle = "Vui lòng nhập mô tả ngắn";
      firstInvalidStep = firstInvalidStep ?? "info";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Vui lòng nhập mô tả chi tiết";
      firstInvalidStep = firstInvalidStep ?? "description";
    }
    if (
      formData.outcomes.length === 0 ||
      formData.outcomes.every((o) => !o.trim())
    ) {
      newErrors.outcomes = "Vui lòng nhập ít nhất một mục tiêu học tập";
      firstInvalidStep = firstInvalidStep ?? "outcomes";
    }
    if (
      formData.requirements.length === 0 ||
      formData.requirements.every((r) => !r.trim())
    ) {
      newErrors.requirements = "Vui lòng nhập ít nhất một yêu cầu";
      firstInvalidStep = firstInvalidStep ?? "outcomes";
    }
    if (
      formData.target_audience.length === 0 ||
      formData.target_audience.every((t) => !t.trim())
    ) {
      newErrors.target_audience =
        "Vui lòng nhập ít nhất một đối tượng học viên";
      firstInvalidStep = firstInvalidStep ?? "outcomes";
    }
    if (formData.base_price < 0) {
      newErrors.base_price = "Giá không được âm";
      firstInvalidStep = firstInvalidStep ?? "pricing";
    }

    setErrors(newErrors);
    return {
      valid: Object.keys(newErrors).length === 0,
      firstInvalidStep,
    };
  };

  const handleNext = () => {
    if (currentStep < STEP_TABS.length - 1) {
      jumpToStep(STEP_TABS[currentStep + 1].key);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      jumpToStep(STEP_TABS[currentStep - 1].key);
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
      const next = [...prev[field]];
      next[index] = value;
      return { ...prev, [field]: next };
    });
  };

  const handleSelectThumbnailFile = (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Kích thước file không được vượt quá 10MB");
      return;
    }
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setUploadError(null);
  };

  const uploadBannerForCourse = async (courseId: string, file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", await prepareImageUpload(file, "courseThumbnail"));
      await api.post(`/lecturer/courses/upload-thumbnail/${courseId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBannerUploaded(true);
      showToast.success("Đã tải lên ảnh bìa khóa học!");
      return true;
    } catch (err: unknown) {
      const msg = formatApiError(err, "Đã xảy ra lỗi khi tải lên banner");
      setUploadError(msg);
      showToast.error(msg);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  // AI Generators
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
        { course_name: formData.title.trim() }
      );
      if (response.data && typeof response.data === "string") {
        setFormData((prev) => ({ ...prev, subtitle: response.data }));
        showToast.success("AI đã tạo mô tả ngắn");
      } else {
        setError("Không thể tạo mô tả tự động. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      setError(formatApiError(err, "Không thể tạo mô tả tự động"));
    } finally {
      setIsGeneratingSubtitle(false);
    }
  };

  const buildAiPayload = () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề khóa học trước");
      return null;
    }
    if (!formData.subtitle.trim()) {
      setError("Vui lòng nhập mô tả ngắn trước");
      return null;
    }
    const payload: Record<string, string> = {
      course_name: formData.title.trim(),
      short_description: formData.subtitle.trim(),
      category_name: selectedSubjectName || "Giáo dục phổ thông",
    };
    if (selectedGradeNames.length > 0) {
      payload.topic_name = selectedGradeNames.join(", ");
    }
    return payload;
  };

  const handleGenerateDescription = async () => {
    const payload = buildAiPayload();
    if (!payload) return;
    setIsGeneratingDescription(true);
    setError(null);
    try {
      const response = await api.post(
        "/lecturers/chat/course/create/description",
        payload
      );
      if (response.data && typeof response.data === "string") {
        setFormData((prev) => ({ ...prev, description: response.data }));
        showToast.success("AI đã tạo mô tả chi tiết");
      } else {
        setError("Không thể tạo mô tả chi tiết tự động. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      setError(formatApiError(err, "Không thể tạo mô tả chi tiết tự động"));
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleGenerateOutcomes = async () => {
    const payload = buildAiPayload();
    if (!payload) return;
    setIsGeneratingOutcomes(true);
    setError(null);
    try {
      const response = await api.post(
        "/lecturers/chat/course/create/learning_goals",
        payload
      );
      const list = Array.isArray(response.data) ? response.data : [];
      if (list.length > 0) {
        setFormData((prev) => ({ ...prev, outcomes: list }));
        showToast.success("AI đã tạo danh sách mục tiêu học tập");
      } else {
        setError("Không thể tạo mục tiêu học tập tự động. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      setError(formatApiError(err, "Không thể tạo mục tiêu học tập tự động"));
    } finally {
      setIsGeneratingOutcomes(false);
    }
  };

  const handleGenerateRequirements = async () => {
    const payload = buildAiPayload();
    if (!payload) return;
    setIsGeneratingRequirements(true);
    setError(null);
    try {
      const response = await api.post(
        "/lecturers/chat/course/create/request",
        payload
      );
      const list = Array.isArray(response.data) ? response.data : [];
      if (list.length > 0) {
        setFormData((prev) => ({ ...prev, requirements: list }));
        showToast.success("AI đã tạo danh sách yêu cầu đầu vào");
      } else {
        setError("Không thể tạo yêu cầu tự động. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      setError(formatApiError(err, "Không thể tạo yêu cầu tự động"));
    } finally {
      setIsGeneratingRequirements(false);
    }
  };

  const handleGenerateTargetAudience = async () => {
    const payload = buildAiPayload();
    if (!payload) return;
    setIsGeneratingTargetAudience(true);
    setError(null);
    try {
      const response = await api.post(
        "/lecturers/chat/course/create/student_target",
        payload
      );
      const list = Array.isArray(response.data) ? response.data : [];
      if (list.length > 0) {
        setFormData((prev) => ({ ...prev, target_audience: list }));
        showToast.success("AI đã tạo danh sách đối tượng học viên");
      } else {
        setError("Không thể tạo đối tượng học viên tự động. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      setError(formatApiError(err, "Không thể tạo đối tượng học viên tự động"));
    } finally {
      setIsGeneratingTargetAudience(false);
    }
  };

  const handleSubmit = async () => {
    const { valid, firstInvalidStep } = validateAllSteps();
    if (!valid) {
      if (firstInvalidStep) jumpToStep(firstInvalidStep);
      showToast.error("Vui lòng hoàn thiện các trường bắt buộc trước khi tạo");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: Record<string, unknown> = {
        education,
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        description: formData.description.trim(),
        level: formData.level,
        language: formData.language,
        is_published: formData.is_published,
        is_lock_lesson: formData.is_lock_lesson,
        outcomes: formData.outcomes.filter((o) => o.trim()).map((o) => o.trim()),
        requirements: formData.requirements
          .filter((r) => r.trim())
          .map((r) => r.trim()),
        target_audience: formData.target_audience
          .filter((t) => t.trim())
          .map((t) => t.trim()),
        base_price: formData.base_price,
        currency: formData.currency,
      };

      const response = await api.post("/lecturer/courses/create", payload);
      const newCourseId = response.data?.course_id as string | undefined;

      const msg = response.data?.message || "Tạo khóa học thành công!";
      setSuccessMessage(msg);
      showToast.success(msg);

      if (newCourseId) {
        setCreatedCourseId(newCourseId);
        // Nếu giảng viên đã chọn sẵn banner ở Phần 01 → tự động upload luôn!
        if (thumbnailFile) {
          await uploadBannerForCourse(newCourseId, thumbnailFile);
        }
      }
    } catch (err: unknown) {
      const msg = formatApiError(err, "Đã xảy ra lỗi khi tạo khóa học");
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCoin = vndToCoin(formData.base_price, DEFAULT_COIN_VND_RATE);
  const aiReady = Boolean(formData.title.trim() && formData.subtitle.trim());

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-[1380px] px-4 pt-6 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/lecturer/courses"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm font-medium text-muted-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Danh sách khóa học</span>
          </Link>
        </div>

        {/* Studio Hero Banner */}
        <section className="relative mb-6 overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/85 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.14)] sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/75 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-14 left-1/3 h-40 w-40 rounded-full bg-primary-pastel/35 blur-3xl"
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-xs">
                  <Rocket className="h-3.5 w-3.5" />
                  <span>Khởi tạo khóa học mới</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-surface/80 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  Bước {currentStep + 1} / {STEP_TABS.length}
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {formData.title.trim() || "Tạo khóa học mới"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Hoàn thiện 4 phân khu trực quan, xem trước tức thì thẻ khóa học
                ở cột phải và dùng trợ lý AI để soạn thảo nhanh hơn.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                loadingText="Đang tạo..."
                leftIcon={
                  !isSubmitting ? <CheckCircle2 className="h-4 w-4" /> : undefined
                }
              >
                Tạo khóa học
              </Button>
            </div>
          </div>

          {/* 4 Tab phân khu đồng bộ URL (?step=...) */}
          <div className="relative mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {STEP_TABS.map((tab) => {
              const Icon = tab.Icon;
              const isActive = activeStepKey === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => jumpToStep(tab.key)}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border/80 bg-surface/90 text-foreground hover:border-primary-pastel hover:bg-surface"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-primary-light text-primary"
                    }`}
                  >
                    <Icon animated={false} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isActive ? "text-white/80" : "text-muted-foreground"
                      }`}
                    >
                      Phần 0{tab.index + 1}
                    </p>
                    <p className="truncate text-xs font-bold sm:text-sm">
                      {tab.shortLabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Alerts */}
        {successMessage && !createdCourseId && (
          <Alert variant="success" className="mb-5">
            {successMessage}
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-5">
            {typeof error === "string" ? error : JSON.stringify(error)}
          </Alert>
        )}
        {uploadError && !createdCourseId && (
          <Alert variant="destructive" className="mb-5">
            {uploadError}
          </Alert>
        )}

        {/* Bố cục Studio 2 cột (8/4) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* CỘT TRÁI (8/12) */}
          <div className="space-y-6 lg:col-span-8">
            {/* ===== PHẦN 1: THÔNG TIN & PHÂN LOẠI ===== */}
            {activeStepKey === "info" && (
              <>
                <CourseTaxonomyForm value={education} onChange={setEducation} />

                {/* Banner Picker ngay từ bước 1 */}
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-foreground">
                          Ảnh bìa khóa học (Banner)
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Chọn sẵn ảnh tỷ lệ 16:9 — sẽ tự động tải lên ngay khi
                          tạo khóa học
                        </p>
                      </div>
                    </div>
                    {thumbnailFile && (
                      <span className="rounded-full border border-success-border bg-success-bg px-2.5 py-1 text-[11px] font-semibold text-success-foreground">
                        Sẵn sàng tải lên
                      </span>
                    )}
                  </div>

                  <div className="rounded-2xl border-2 border-dashed border-primary-pastel/80 bg-background/60 p-5 text-center transition-colors hover:border-primary">
                    {thumbnailPreview ? (
                      <div className="space-y-4">
                        <img
                          src={thumbnailPreview}
                          alt="Xem trước banner khóa học"
                          className="mx-auto max-h-56 rounded-2xl border border-border object-cover shadow-sm"
                        />
                        <div className="flex flex-wrap items-center justify-center gap-2.5">
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover">
                            <Upload className="h-3.5 w-3.5" />
                            <span>Chọn ảnh khác</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleSelectThumbnailFile(e.target.files?.[0])
                              }
                              className="hidden"
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
                          >
                            Gỡ ảnh
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="block cursor-pointer py-4">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light text-primary">
                          <ImageIcon className="h-7 w-7" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-foreground">
                          Nhấp để chọn ảnh bìa khóa học (tùy chọn)
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Hỗ trợ PNG, JPG, GIF (tối đa 10MB)
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleSelectThumbnailFile(e.target.files?.[0])
                          }
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </Card>

                {/* Basic Info Card */}
                <Card className="p-6">
                  <div className="mb-5 border-b border-border/70 pb-4">
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Thông tin cơ bản
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Đặt tiêu đề hấp dẫn và mô tả ngắn súc tích để thu hút học
                      viên ngay từ cái nhìn đầu tiên
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-sm font-semibold text-foreground">
                          Tiêu đề khóa học{" "}
                          <span className="text-destructive-foreground">*</span>
                        </label>
                        <span className="text-[11px] text-muted-foreground">
                          {formData.title.length} ký tự
                        </span>
                      </div>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Ví dụ: Chinh phục Toán 12 — Luyện thi THPT Quốc gia 9+"
                        className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                          errors.title
                            ? "border-destructive-border focus:border-destructive-foreground focus:ring-destructive-border/40"
                            : "border-border focus:border-primary focus:ring-primary/20"
                        }`}
                      />
                      {errors.title && (
                        <p className="mt-1 text-xs font-medium text-destructive-foreground">
                          {errors.title}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <label className="text-sm font-semibold text-foreground">
                          Mô tả ngắn{" "}
                          <span className="text-destructive-foreground">*</span>
                        </label>
                        <Button
                          type="button"
                          variant="pastel"
                          size="sm"
                          onClick={handleGenerateSubtitle}
                          disabled={
                            isGeneratingSubtitle || !formData.title.trim()
                          }
                          isLoading={isGeneratingSubtitle}
                          loadingText="AI đang viết..."
                          leftIcon={
                            !isGeneratingSubtitle ? (
                              <Bot className="h-3.5 w-3.5" />
                            ) : undefined
                          }
                        >
                          AI gợi ý mô tả ngắn
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
                        placeholder="Một câu tóm tắt ngắn gọn giá trị cốt lõi của khóa học..."
                        className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                          errors.subtitle
                            ? "border-destructive-border focus:border-destructive-foreground focus:ring-destructive-border/40"
                            : "border-border focus:border-primary focus:ring-primary/20"
                        }`}
                      />
                      {errors.subtitle && (
                        <p className="mt-1 text-xs font-medium text-destructive-foreground">
                          {errors.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-foreground">
                          Cấp độ học viên
                        </label>
                        <select
                          value={formData.level}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              level: e.target
                                .value as CreateCourseFormData["level"],
                            }))
                          }
                          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                          <option value="all">Tất cả cấp độ</option>
                          <option value="beginner">Người mới bắt đầu</option>
                          <option value="intermediate">Trung bình</option>
                          <option value="advanced">Nâng cao</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-foreground">
                          Ngôn ngữ giảng dạy
                        </label>
                        <select
                          value={formData.language}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              language: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                          <option value="vi">Tiếng Việt</option>
                          <option value="en">Tiếng Anh</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* ===== PHẦN 2: MÔ TẢ CHI TIẾT ===== */}
            {activeStepKey === "description" && (
              <Card className="p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Mô tả chi tiết khóa học
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Trình bày rõ nội dung, lộ trình và phương pháp học ·{" "}
                      <strong className="text-foreground">
                        {wordCount} từ
                      </strong>
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDescription || !aiReady}
                    isLoading={isGeneratingDescription}
                    loadingText="AI đang soạn..."
                    leftIcon={
                      !isGeneratingDescription ? (
                        <Bot className="h-3.5 w-3.5" />
                      ) : undefined
                    }
                  >
                    AI viết mô tả chi tiết
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
                  <p className="mt-2 text-xs font-medium text-destructive-foreground">
                    {errors.description}
                  </p>
                )}

                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    Điền tiêu đề và mô tả ngắn ở Phần 01 để kích hoạt trợ lý AI
                    viết nháp nhanh theo đúng môn học & khối lớp.
                  </span>
                </p>
              </Card>
            )}

            {/* ===== PHẦN 3: MỤC TIÊU & ĐỐI TƯỢNG ===== */}
            {activeStepKey === "outcomes" && (
              <div className="space-y-5">
                {/* Mục tiêu học tập */}
                <Card className="border-warning-border/70 p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-warning-border bg-warning-bg text-warning-foreground">
                        <Lightbulb className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          Mục tiêu học tập{" "}
                          <span className="text-destructive-foreground">*</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Học viên sẽ đạt được kỹ năng, kết quả gì sau khóa học?
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      onClick={handleGenerateOutcomes}
                      disabled={isGeneratingOutcomes || !aiReady}
                      isLoading={isGeneratingOutcomes}
                      loadingText="AI đang tạo..."
                      leftIcon={
                        !isGeneratingOutcomes ? (
                          <Bot className="h-3.5 w-3.5" />
                        ) : undefined
                      }
                    >
                      AI gợi ý mục tiêu
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {formData.outcomes.map((outcome, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-bg text-xs font-bold text-warning-foreground">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={outcome}
                          onChange={(e) =>
                            handleUpdateItem("outcomes", index, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddItem("outcomes");
                            }
                          }}
                          placeholder={`Mục tiêu ${index + 1}...`}
                          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        {formData.outcomes.length > 1 && (
                          <button
                            aria-label="Xóa mục tiêu học tập"
                            type="button"
                            onClick={() => handleRemoveItem("outcomes", index)}
                            className="cursor-pointer rounded-xl border border-destructive-border/60 bg-destructive-bg p-2.5 text-destructive-foreground transition-colors hover:opacity-85"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    onClick={() => handleAddItem("outcomes")}
                    leftIcon={<Plus className="h-4 w-4" />}
                    className="mt-3"
                  >
                    Thêm mục tiêu
                  </Button>
                  {errors.outcomes && (
                    <p className="mt-2 text-xs font-medium text-destructive-foreground">
                      {errors.outcomes}
                    </p>
                  )}
                </Card>

                {/* Yêu cầu đầu vào */}
                <Card className="border-primary-pastel/70 p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          Yêu cầu đầu vào{" "}
                          <span className="text-destructive-foreground">*</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Kiến thức nền tảng hoặc dụng cụ học viên cần chuẩn bị
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      onClick={handleGenerateRequirements}
                      disabled={isGeneratingRequirements || !aiReady}
                      isLoading={isGeneratingRequirements}
                      loadingText="AI đang tạo..."
                      leftIcon={
                        !isGeneratingRequirements ? (
                          <Bot className="h-3.5 w-3.5" />
                        ) : undefined
                      }
                    >
                      AI gợi ý yêu cầu
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {formData.requirements.map((requirement, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={requirement}
                          onChange={(e) =>
                            handleUpdateItem(
                              "requirements",
                              index,
                              e.target.value
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddItem("requirements");
                            }
                          }}
                          placeholder={`Yêu cầu ${index + 1}...`}
                          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        {formData.requirements.length > 1 && (
                          <button
                            aria-label="Xóa yêu cầu"
                            type="button"
                            onClick={() =>
                              handleRemoveItem("requirements", index)
                            }
                            className="cursor-pointer rounded-xl border border-destructive-border/60 bg-destructive-bg p-2.5 text-destructive-foreground transition-colors hover:opacity-85"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    onClick={() => handleAddItem("requirements")}
                    leftIcon={<Plus className="h-4 w-4" />}
                    className="mt-3"
                  >
                    Thêm yêu cầu
                  </Button>
                  {errors.requirements && (
                    <p className="mt-2 text-xs font-medium text-destructive-foreground">
                      {errors.requirements}
                    </p>
                  )}
                </Card>

                {/* Đối tượng học viên */}
                <Card className="border-accent-border/70 p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-border bg-accent text-accent-foreground">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          Đối tượng học viên{" "}
                          <span className="text-destructive-foreground">*</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Khóa học này phù hợp nhất với nhóm học viên nào?
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      onClick={handleGenerateTargetAudience}
                      disabled={isGeneratingTargetAudience || !aiReady}
                      isLoading={isGeneratingTargetAudience}
                      loadingText="AI đang tạo..."
                      leftIcon={
                        !isGeneratingTargetAudience ? (
                          <Bot className="h-3.5 w-3.5" />
                        ) : undefined
                      }
                    >
                      AI gợi ý đối tượng
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {formData.target_audience.map((audience, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-foreground">
                          {index + 1}
                        </span>
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddItem("target_audience");
                            }
                          }}
                          placeholder={`Đối tượng ${index + 1}...`}
                          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        {formData.target_audience.length > 1 && (
                          <button
                            aria-label="Xóa đối tượng học"
                            type="button"
                            onClick={() =>
                              handleRemoveItem("target_audience", index)
                            }
                            className="cursor-pointer rounded-xl border border-destructive-border/60 bg-destructive-bg p-2.5 text-destructive-foreground transition-colors hover:opacity-85"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    onClick={() => handleAddItem("target_audience")}
                    leftIcon={<Plus className="h-4 w-4" />}
                    className="mt-3"
                  >
                    Thêm đối tượng
                  </Button>
                  {errors.target_audience && (
                    <p className="mt-2 text-xs font-medium text-destructive-foreground">
                      {errors.target_audience}
                    </p>
                  )}
                </Card>
              </div>
            )}

            {/* ===== PHẦN 4: GIÁ COIN & XUẤT BẢN ===== */}
            {activeStepKey === "pricing" && (
              <Card className="p-6">
                <div className="mb-5 border-b border-border/70 pb-4">
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Học phí Coin & Thiết lập xuất bản
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Thiết lập mức học phí bằng Coin (1 Coin ={" "}
                    {DEFAULT_COIN_VND_RATE.toLocaleString("vi-VN")} đ) và chế độ
                    hiển thị
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-warning-border bg-warning-bg/45 p-5">
                    <label className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                      <Coins className="h-4 w-4 text-[#C98A2C]" />
                      <span>Giá khóa học (Coin)</span>
                    </label>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={currentCoin}
                          onChange={(e) => {
                            const coin = Math.max(
                              0,
                              parseInt(e.target.value, 10) || 0
                            );
                            setFormData((prev) => ({
                              ...prev,
                              base_price: coinToVnd(
                                coin,
                                DEFAULT_COIN_VND_RATE
                              ),
                              currency: "VND",
                            }));
                          }}
                          min="0"
                          step="1"
                          placeholder="0"
                          className={`w-full rounded-xl border bg-surface px-4 py-3 text-base font-bold text-warning-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                            errors.base_price
                              ? "border-destructive-border focus:border-destructive-foreground focus:ring-destructive-border/40"
                              : "border-warning-border focus:border-primary focus:ring-primary/20"
                          }`}
                        />
                      </div>
                      <div className="inline-flex items-center justify-between gap-2 rounded-xl border border-warning-border bg-surface px-4 py-3 text-sm font-bold text-warning-foreground sm:min-w-[180px]">
                        <span className="inline-flex items-center gap-1.5">
                          <Coins className="h-4 w-4 text-[#C98A2C]" />
                          <span>{formatCoin(currentCoin)}</span>
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          ≈ {formData.base_price.toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[11px] font-semibold text-muted-foreground">
                        Gợi ý nhanh:
                      </span>
                      {QUICK_COIN_PRESETS.map((preset) => {
                        const active = currentCoin === preset.coin;
                        return (
                          <button
                            key={preset.coin}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                base_price: coinToVnd(
                                  preset.coin,
                                  DEFAULT_COIN_VND_RATE
                                ),
                                currency: "VND",
                              }))
                            }
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                              active
                                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                : "border-warning-border bg-surface text-warning-foreground hover:bg-warning-bg"
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    {errors.base_price && (
                      <p className="mt-2 text-xs font-medium text-destructive-foreground">
                        {errors.base_price}
                      </p>
                    )}
                  </div>

                  {/* Lock Lessons Toggle */}
                  <div className="rounded-2xl border border-info-border bg-info-bg/55 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <label className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
                          <Lock className="h-4 w-4 text-info-foreground" />
                          <span>Khóa bài học theo thứ tự</span>
                        </label>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {formData.is_lock_lesson
                            ? "Học viên phải hoàn thành từng bài học theo đúng lộ trình, không thể nhảy cóc."
                            : "Học viên có thể mở xem tự do bất kỳ bài học nào trong khóa học."}
                        </p>
                      </div>
                      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_lock_lesson}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              is_lock_lesson: e.target.checked,
                            }))
                          }
                          className="peer sr-only"
                        />
                        <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25" />
                      </label>
                    </div>
                  </div>

                  {/* Publish Toggle */}
                  <div className="rounded-2xl border border-border bg-background/80 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-foreground">
                          Xuất bản khóa học
                        </label>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {formData.is_published
                            ? "Khóa học sẽ được hiển thị công khai sau khi được phê duyệt."
                            : "Khóa học được lưu ở chế độ Bản nháp để bạn tiếp tục soạn bài học."}
                        </p>
                      </div>
                      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_published}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              is_published: e.target.checked,
                            }))
                          }
                          className="peer sr-only"
                        />
                        <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25" />
                      </label>
                    </div>
                  </div>

                  {/* Tóm tắt */}
                  <div className="rounded-2xl border border-primary-pastel bg-primary-light/45 p-5">
                    <h3 className="mb-3 text-sm font-bold text-foreground">
                      Tóm tắt cấu hình khóa học
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                      <div className="flex justify-between rounded-xl bg-surface/80 px-3.5 py-2.5">
                        <span className="text-muted-foreground">
                          Môn học chính
                        </span>
                        <span className="font-semibold text-foreground">
                          {selectedSubjectName || "Chưa chọn"}
                        </span>
                      </div>
                      <div className="flex justify-between rounded-xl bg-surface/80 px-3.5 py-2.5">
                        <span className="text-muted-foreground">Khối lớp</span>
                        <span className="font-semibold text-foreground">
                          {selectedGradeNames.length > 0
                            ? selectedGradeNames.join(", ")
                            : "Chưa chọn"}
                        </span>
                      </div>
                      <div className="flex justify-between rounded-xl bg-surface/80 px-3.5 py-2.5">
                        <span className="text-muted-foreground">Học phí</span>
                        <span className="font-bold text-warning-foreground">
                          {formatCoursePriceCoin(formData.base_price)}
                        </span>
                      </div>
                      <div className="flex justify-between rounded-xl bg-surface/80 px-3.5 py-2.5">
                        <span className="text-muted-foreground">Xuất bản</span>
                        <span className="font-semibold text-primary">
                          {formData.is_published ? "Công khai" : "Bản nháp"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Thanh điều hướng dưới cùng */}
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isSubmitting}
                  leftIcon={<ChevronLeft className="h-4 w-4" />}
                >
                  Phần trước
                </Button>

                <div className="flex flex-wrap items-center gap-2.5">
                  {currentStep < STEP_TABS.length - 1 && (
                    <Button
                      type="button"
                      variant="pastel"
                      size="md"
                      onClick={handleNext}
                      rightIcon={<ChevronRight className="h-4 w-4" />}
                    >
                      Phần tiếp theo
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    loadingText="Đang tạo..."
                    leftIcon={
                      !isSubmitting ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : undefined
                    }
                  >
                    Tạo khóa học
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* CỘT PHẢI (4/12): Live Preview + Readiness Checklist */}
          <div className="lg:col-span-4">
            <EditPreviewSidebar
              formData={formData}
              thumbnailPreview={thumbnailPreview}
              subjectName={selectedSubjectName}
              gradeNames={selectedGradeNames}
              onJumpStep={jumpToStep}
            />
          </div>
        </div>
      </div>

      {/* Modal Hoàn tất & Tải lên Banner (nếu chưa tải lên) */}
      {createdCourseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl border border-primary-pastel bg-surface p-6 shadow-[0_24px_60px_-16px_rgba(53,111,167,0.28)] sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-success-border bg-success-bg text-success-foreground">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">
                    Khóa học đã được tạo thành công!
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {bannerUploaded
                      ? "Ảnh bìa đã được tải lên. Bạn có thể bắt đầu dựng chương & bài học ngay."
                      : "Bạn có thể tải lên ảnh bìa ngay hoặc chuyển thẳng sang dựng chương & bài học."}
                  </p>
                </div>
              </div>
              <button
                aria-label="Đóng"
                type="button"
                disabled={isUploading}
                onClick={() => router.push("/lecturer/courses")}
                className="cursor-pointer rounded-xl p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {uploadError && (
              <Alert variant="destructive" className="mt-4">
                {uploadError}
              </Alert>
            )}

            {!bannerUploaded && (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-primary-pastel bg-background/60 p-5 text-center">
                {thumbnailPreview ? (
                  <div className="space-y-3">
                    <img
                      src={thumbnailPreview}
                      alt="Xem trước banner"
                      className="mx-auto max-h-44 rounded-xl border border-border object-cover"
                    />
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-primary-light/50">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Chọn ảnh khác</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleSelectThumbnailFile(e.target.files?.[0])
                          }
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                      {thumbnailFile && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            uploadBannerForCourse(createdCourseId, thumbnailFile)
                          }
                          disabled={isUploading}
                          isLoading={isUploading}
                          loadingText="Đang tải lên..."
                          leftIcon={
                            !isUploading ? (
                              <Upload className="h-3.5 w-3.5" />
                            ) : undefined
                          }
                        >
                          Tải lên ảnh bìa
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <label className="block cursor-pointer py-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <p className="mt-2.5 text-sm font-semibold text-foreground">
                      Nhấp để chọn ảnh bìa (tùy chọn)
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      PNG, JPG, GIF (tối đa 10MB)
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleSelectThumbnailFile(e.target.files?.[0])
                      }
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-border/70 pt-4">
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={isUploading}
                onClick={() => router.push("/lecturer/courses")}
              >
                Về danh sách khóa học
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={isUploading}
                leftIcon={<Layers className="h-4 w-4" />}
                onClick={() =>
                  router.push(`/lecturer/chapters?course_id=${createdCourseId}`)
                }
              >
                Dựng chương & bài học ngay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCourse;
