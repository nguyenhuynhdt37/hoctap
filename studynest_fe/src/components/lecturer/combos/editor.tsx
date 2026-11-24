"use client";

import {
  coinToVnd,
  DEFAULT_COIN_VND_RATE,
  vndToCoin,
} from "@/lib/learning-hub/coin-logic";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Coins,
  ExternalLink,
  Eye,
  FileText,
  ImagePlus,
  Layers,
  Tag,
  TrendingDown,
  Upload,
} from "pulsoicon-react";
import CouponManager from "@/components/admin/learning-paths/coupon-manager";
import {
  fetchLearning,
  LoadError,
  message,
  price,
} from "@/components/learning-paths/shared";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Skeleton,
  Textarea,
} from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import TiptapEditor from "@/components/shared/tiptap_editor";
import type { Bundle } from "@/types/learning-paths";
import LecturerCoursePicker, {
  type CourseInfo,
  type SelectedCourseItem,
} from "./course-picker";

const learningFields = {
  target_audience: "Đối tượng phù hợp",
  requirements: "Yêu cầu đầu vào",
  outcomes: "Kết quả học tập",
} as const;
const learningKeys = Object.keys(
  learningFields,
) as (keyof typeof learningFields)[];

const points = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type ComboDetail = Pick<
  Bundle,
  "subtitle" | "target_audience" | "requirements" | "outcomes"
> & {
  id: string;
  bundle_id: string;
  title: string;
  description: string;
  thumbnail_url?: string | null;
  price: string | number;
  original_price?: string | number;
  slug: string;
  status: string;
  is_active?: boolean;
  items: (SelectedCourseItem & { position: number })[];
};

export default function ComboEditor({ versionId }: { versionId?: string }) {
  const router = useRouter();
  const { data, error, mutate, isLoading } = useSWR<ComboDetail>(
    versionId ? `/lecturer/bundles/versions/${versionId}` : null,
    fetchLearning,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [learning, setLearning] = useState({
    target_audience: "",
    requirements: "",
    outcomes: "",
  });
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [amount, setAmount] = useState("0");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [coursesInfo, setCoursesInfo] = useState<Record<string, CourseInfo>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const loadedId = useRef("");

  useEffect(() => {
    if (!data || loadedId.current === data.id) return;
    loadedId.current = data.id;
    setTitle(data.title);
    setDescription(data.description || "");
    setSubtitle(data.subtitle ?? "");
    setLearning({
      target_audience: data.target_audience?.join("\n") ?? "",
      requirements: data.requirements?.join("\n") ?? "",
      outcomes: data.outcomes?.join("\n") ?? "",
    });
    setThumbnailUrl(data.thumbnail_url ?? null);
    setAmount(String(data.price));
    setCourseIds(data.items.map((item) => item.course_id));

    const initialMap: Record<string, CourseInfo> = {};
    for (const item of data.items) {
      initialMap[item.course_id] = {
        id: item.course_id,
        title: item.title,
        price: Number(item.list_price || 0),
        thumbnail_url: item.thumbnail,
      };
    }
    setCoursesInfo((prev) => ({ ...prev, ...initialMap }));
  }, [data]);

  // Tính toán các chỉ số giá realtime
  const {
    totalOriginalPrice,
    comboPrice,
    savings,
    discountPercent,
    isPriceInvalid,
    priceRatioPercent,
  } = useMemo(() => {
    const orig = courseIds.reduce((sum, id) => {
      const item = coursesInfo[id];
      return sum + (item?.price || 0);
    }, 0);
    const cp = Number(amount) || 0;
    const sav = Math.max(0, orig - cp);
    const pct = orig > 0 ? Math.round(((orig - cp) / orig) * 100) : 0;
    const invalid = orig > 0 && cp > orig;
    const ratio =
      orig > 0 ? Math.min(100, Math.max(0, Math.round((cp / orig) * 100))) : 0;

    return {
      totalOriginalPrice: orig,
      comboPrice: cp,
      savings: sav,
      discountPercent: pct,
      isPriceInvalid: invalid,
      priceRatioPercent: ratio,
    };
  }, [courseIds, coursesInfo, amount]);

  // Checklist mức độ sẵn sàng mở bán
  const readiness = useMemo(() => {
    const plainDesc = stripHtml(description);
    const checks = [
      { key: "title", label: "Tên lộ trình", ok: title.trim().length >= 3 },
      {
        key: "desc",
        label: "Mô tả ≥ 20 ký tự",
        ok: description.trim().length >= 20 && plainDesc.length >= 10,
      },
      { key: "courses", label: "Tối thiểu 2 khóa", ok: courseIds.length >= 2 },
      {
        key: "price",
        label: "Giá hợp lệ",
        ok: !isPriceInvalid && amount !== "",
      },
    ];
    const done = checks.filter((c) => c.ok).length;
    const percent = Math.round((done / checks.length) * 100);
    return { checks, done, total: checks.length, percent };
  }, [title, description, courseIds.length, isPriceInvalid, amount]);

  // Ảnh xem trước cho Live Preview Card
  const previewThumb = useMemo(() => {
    if (thumbnailUrl) return thumbnailUrl;
    for (const id of courseIds) {
      const thumb = coursesInfo[id]?.thumbnail_url;
      if (thumb) return thumb;
    }
    return null;
  }, [thumbnailUrl, courseIds, coursesInfo]);

  const applyQuickDiscount = (rate: number) => {
    if (totalOriginalPrice <= 0) return;
    const discounted = Math.round(totalOriginalPrice * (1 - rate));
    setAmount(String(discounted));
  };

  const handleCourseSelect = (course: CourseInfo) => {
    setCoursesInfo((prev) => ({
      ...prev,
      [course.id]: course,
    }));
  };

  async function uploadThumbnail(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setFailure("Ảnh bìa combo tối đa 5 MB.");
      return;
    }
    setUploadingThumbnail(true);
    setFailure("");
    try {
      const form = new FormData();
      form.append("file", file);
      const { data: uploaded } = await api.post<{ thumbnail_url: string }>(
        "/lecturer/bundles/thumbnail",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setThumbnailUrl(uploaded.thumbnail_url);
      showToast.success("Đã tải ảnh bìa combo lên thành công.");
    } catch (uploadError) {
      setFailure(message(uploadError));
    } finally {
      setUploadingThumbnail(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || uploadingThumbnail) return;

    if (courseIds.length < 2) {
      setFailure("Combo lộ trình cần có tối thiểu 2 khóa học.");
      return;
    }

    if (description.trim().length < 20) {
      setFailure(
        "Mục tiêu và giới thiệu lộ trình học tập cần có tối thiểu 20 ký tự.",
      );
      return;
    }

    if (isPriceInvalid) {
      setFailure(
        `Giá combo (${price(comboPrice)}) không được cao hơn tổng giá bán lẻ (${price(totalOriginalPrice)}).`,
      );
      return;
    }

    const learningPoints = {
      target_audience: points(learning.target_audience),
      requirements: points(learning.requirements),
      outcomes: points(learning.outcomes),
    };
    for (const key of learningKeys) {
      const entries = learningPoints[key];
      if (entries.length > 12 || entries.some((line) => line.length > 500)) {
        setFailure(
          `${learningFields[key]} cho phép tối đa 12 dòng, mỗi dòng tối đa 500 ký tự.`,
        );
        return;
      }
    }

    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        subtitle: subtitle.trim() || null,
        ...learningPoints,
        thumbnail_url: thumbnailUrl,
        price: amount,
        course_ids: courseIds,
        bundle_id: data?.bundle_id,
      };
      const response = await api.request<ComboDetail>({
        url: versionId
          ? `/lecturer/bundles/versions/${versionId}`
          : "/lecturer/bundles",
        method: versionId ? "PUT" : "POST",
        data: payload,
      });

      const successMsg = versionId
        ? "Đã lưu thông tin combo lộ trình thành công."
        : "Lộ trình của bạn đã được khởi tạo và sẵn sàng mở bán!";
      setNotice(successMsg);
      showToast.success(successMsg);

      if (response.data.id !== versionId) {
        router.push(`/lecturer/combos/${response.data.id}`);
      } else {
        await mutate();
      }
    } catch (saveError) {
      const errMsg = message(saveError);
      setFailure(errMsg);
      showToast.error(errMsg);
    } finally {
      setBusy(false);
    }
  }

  if (versionId && error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <LoadError error={error} retry={() => mutate()} />
      </div>
    );
  }

  if (versionId && (isLoading || !data)) {
    return (
      <div
        className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6"
        role="status"
        aria-label="Đang tải thông tin combo"
      >
        <Skeleton className="h-8 w-44 rounded-full" />
        <Skeleton className="h-36 w-full rounded-[28px]" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-96 rounded-[24px]" />
          <Skeleton className="h-80 rounded-[24px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/lecturer/combos")}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại xưởng combo</span>
          </button>

          {data?.status === "published" && data.is_active && data.slug && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-surface"
              onClick={() => window.open(`/combo/${data.slug}`, "_blank")}
              leftIcon={<ExternalLink className="h-4 w-4" />}
            >
              Xem trang học viên
            </Button>
          )}
        </div>

        {/* Hero Tiêu đề + Readiness Checklist Bar */}
        <section className="relative overflow-hidden rounded-[28px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-accent-vanilla/70 p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Layers animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{versionId ? "Biên tập lộ trình" : "Khởi tạo lộ trình mới"}</span>
                </span>
                {data?.status === "published" && (
                  <Badge variant={data.is_active ? "success" : "neutral"} dot>
                    {data.is_active ? "Đang mở bán" : "Tạm dừng"}
                  </Badge>
                )}
                {data?.status === "draft" && (
                  <Badge variant="info" dot>
                    Bản nháp
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {versionId
                  ? title || "Chỉnh sửa combo lộ trình"
                  : "Tạo combo lộ trình mới"}
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Hoàn thiện thông tin hiển thị, sắp xếp thứ tự khóa học tuần tự và
                thiết lập mức giá ưu đãi để thu hút học viên đăng ký trọn gói.
              </p>
            </div>

            {/* Mức độ sẵn sàng mở bán */}
            <div className="w-full rounded-2xl border border-border/80 bg-surface/90 p-4 backdrop-blur-xs lg:w-80">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Mức độ sẵn sàng mở bán</span>
                <span className="text-primary tabular-nums">
                  {readiness.done}/{readiness.total} ({readiness.percent}%)
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary-light">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${readiness.percent}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {readiness.checks.map((item) => (
                  <div
                    key={item.key}
                    className={`flex items-center gap-1.5 text-[11px] font-medium ${
                      item.ok ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <CheckCircle2
                      animated={false}
                      className={`h-3.5 w-3.5 shrink-0 ${
                        item.ok ? "text-primary" : "text-border"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {failure && (
          <Alert variant="destructive" title="Chưa thể cập nhật combo">
            {failure}
          </Alert>
        )}

        {notice && (
          <Alert variant="success" title="Thành công">
            {notice}
          </Alert>
        )}

        {/* Form 2 cột */}
        <form onSubmit={save}>
          <fieldset
            disabled={busy}
            className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"
          >
            {/* Cột trái: Các chặng biên tập */}
            <div className="min-w-0 space-y-6">
              {/* Chặng 01: Danh tính & Nội dung */}
              <Card
                variant="surface"
                density="none"
                className="overflow-hidden rounded-[24px] border border-border"
              >
                <div className="flex items-center gap-3 border-b border-border bg-primary-light/35 px-6 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-surface font-display text-sm font-bold text-primary">
                    01
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      Danh tính &amp; Nội dung lộ trình
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Tiêu đề, ảnh bìa, mô tả chi tiết và giá trị học viên nhận được.
                    </p>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <Input
                    label="Tên combo lộ trình"
                    required
                    minLength={3}
                    maxLength={180}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ví dụ: Lộ trình C++ từ cơ bản đến thuật toán thực chiến"
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="combo-subtitle"
                        className="text-sm font-medium text-foreground"
                      >
                        Giới thiệu ngắn
                      </label>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {subtitle.length}/240
                      </span>
                    </div>
                    <Input
                      id="combo-subtitle"
                      value={subtitle}
                      maxLength={240}
                      placeholder="Một câu ngắn gọn nêu bật điểm khác biệt của lộ trình..."
                      onChange={(event) => setSubtitle(event.target.value)}
                    />
                  </div>

                  {/* Khu vực ảnh bìa */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">
                      Ảnh bìa combo (tỷ lệ 16:9)
                    </h3>
                    <div className="grid items-center gap-4 rounded-2xl border border-dashed border-primary-pastel bg-primary-light/20 p-4 sm:grid-cols-[minmax(0,220px)_1fr]">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt="Xem trước ảnh bìa combo"
                          className="aspect-video w-full rounded-xl border border-border object-cover shadow-2xs"
                        />
                      ) : (
                        <div className="grid aspect-video place-items-center rounded-xl border border-border/70 bg-surface text-primary">
                          <div className="flex flex-col items-center gap-1.5 text-center">
                            <ImagePlus
                              animated={false}
                              className="size-7 stroke-[1.5]"
                              aria-hidden="true"
                            />
                            <span className="text-xs text-muted-foreground">
                              Chưa có ảnh bìa riêng
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        <input
                          id="combo-thumbnail"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          aria-label="Ảnh bìa combo"
                          aria-describedby="combo-thumbnail-hint"
                          disabled={uploadingThumbnail}
                          className="peer sr-only"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = "";
                            if (file) void uploadThumbnail(file);
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            htmlFor="combo-thumbnail"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-4 py-2 text-xs font-semibold text-primary shadow-2xs transition-colors hover:bg-primary-light/60 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-default peer-disabled:opacity-60"
                          >
                            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {thumbnailUrl ? "Thay ảnh bìa" : "Tải ảnh bìa lên"}
                            </span>
                          </label>
                          {thumbnailUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-full text-destructive-foreground hover:bg-destructive-bg"
                              disabled={uploadingThumbnail}
                              onClick={() => setThumbnailUrl(null)}
                            >
                              Bỏ ảnh bìa
                            </Button>
                          )}
                        </div>
                        <p
                          id="combo-thumbnail-hint"
                          className="text-xs text-muted-foreground"
                          aria-live="polite"
                        >
                          {uploadingThumbnail
                            ? "Đang tải ảnh lên máy chủ…"
                            : "Hỗ trợ JPEG, PNG hoặc WebP, tối đa 5 MB. Nếu để trống hệ thống sẽ dùng ảnh khóa học đầu tiên."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mô tả lộ trình */}
                  <div className="space-y-2 [&_.tiptap-editor-content]:min-h-36! [&_.tiptap-editor-content_.ProseMirror]:min-h-36!">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <FileText
                          animated={false}
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                        <span>Mô tả chi tiết lộ trình</span>
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        Tối thiểu 20 ký tự
                      </span>
                    </div>
                    <TiptapEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Tóm tắt lộ trình và giải thích cách các khóa học bổ trợ lẫn nhau..."
                      minHeight="180px"
                      maxHeight="340px"
                    />
                  </div>

                  {/* 3 cột mục tiêu học tập */}
                  <div className="grid gap-4 pt-2 sm:grid-cols-3">
                    {learningKeys.map((key) => {
                      const lineCount = points(learning[key]).length;
                      return (
                        <div
                          key={key}
                          className="space-y-2 rounded-2xl border border-border/80 bg-background/60 p-3.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label
                              htmlFor={`combo-${key}`}
                              className="text-xs font-semibold text-foreground"
                            >
                              {learningFields[key]}
                            </label>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                                lineCount > 12
                                  ? "bg-destructive-bg text-destructive-foreground"
                                  : "bg-surface text-muted-foreground"
                              }`}
                            >
                              {lineCount}/12 dòng
                            </span>
                          </div>
                          <Textarea
                            id={`combo-${key}`}
                            value={learning[key]}
                            onChange={(event) => {
                              const value = event.target.value;
                              setLearning((current) => ({
                                ...current,
                                [key]: value,
                              }));
                            }}
                            placeholder="Mỗi ý trên một dòng..."
                            rows={4}
                            className="bg-surface text-xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Chặng 02: Bản đồ khóa học trong combo */}
              <Card
                variant="surface"
                density="none"
                className="overflow-hidden rounded-[24px] border border-border"
              >
                <div className="flex items-center gap-3 border-b border-border bg-secondary-light/35 px-6 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-secondary-pastel bg-surface font-display text-sm font-bold text-secondary-foreground">
                    02
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      Khóa học trong combo
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Chọn các khóa học thành phần và sắp xếp thứ tự học tuần tự.
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  <LecturerCoursePicker
                    value={courseIds}
                    onChange={setCourseIds}
                    disabled={busy}
                    selectedCourses={data?.items}
                    coursesInfo={coursesInfo}
                    onCourseSelect={handleCourseSelect}
                  />
                </div>
              </Card>
            </div>

            {/* Cột phải Sticky: Live Preview Card & Trạm Định Giá */}
            <div className="min-w-0 space-y-5 xl:sticky xl:top-6">
              {/* Live Preview phía học viên */}
              <Card
                variant="surface"
                density="none"
                className="overflow-hidden rounded-[24px] border border-primary-pastel/80 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-border bg-primary-light/40 px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Eye animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                    Xem trước thẻ trên sàn học viên
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Live Preview
                  </span>
                </div>

                <div className="p-4">
                  <div className="overflow-hidden rounded-2xl border border-border bg-background">
                    <div className="relative aspect-video w-full overflow-hidden bg-primary-light/60">
                      {previewThumb ? (
                        <img
                          src={previewThumb}
                          alt="Xem trước thẻ combo"
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-primary/70">
                          <BookOpen
                            animated={false}
                            className="h-8 w-8 stroke-[1.4]"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                      <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-2xs">
                        <Layers
                          animated={false}
                          className="h-3 w-3 text-primary"
                          aria-hidden="true"
                        />
                        {courseIds.length} khóa học
                      </span>
                      {discountPercent > 0 && !isPriceInvalid && (
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground shadow-2xs">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 p-3.5">
                      <p className="font-display text-base font-semibold leading-snug text-foreground line-clamp-2">
                        {title.trim() || "Tên combo lộ trình của bạn..."}
                      </p>
                      {subtitle.trim() && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {subtitle.trim()}
                        </p>
                      )}
                      <div className="flex flex-wrap items-baseline gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 font-display text-lg font-bold text-primary tabular-nums">
                          <Coins
                            animated={false}
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          {price(comboPrice)}
                        </span>
                        {totalOriginalPrice > comboPrice &&
                          totalOriginalPrice > 0 && (
                            <span className="text-xs text-muted-foreground line-through tabular-nums">
                              {price(totalOriginalPrice)}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Trạm Định Giá & Mở Bán */}
              <Card
                variant="surface"
                density="none"
                className="overflow-hidden rounded-[24px] border border-border shadow-sm"
              >
                <div className="border-b border-border bg-accent-vanilla/60 px-5 py-3.5">
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                    <TrendingDown
                      animated={false}
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    <span>Định giá &amp; Ưu đãi Combo</span>
                  </h2>
                </div>

                <div className="space-y-4 p-5">
                  <Input
                    label="Giá combo trọn gói (Coin)"
                    required
                    type="number"
                    min={0}
                    step="1"
                    value={amount === "" ? "" : String(vndToCoin(amount))}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === "") {
                        setAmount("");
                        return;
                      }
                      const coin = Math.max(0, Math.round(Number(raw) || 0));
                      setAmount(String(coinToVnd(coin, DEFAULT_COIN_VND_RATE)));
                    }}
                    placeholder="VD: 80"
                  />

                  {/* Gợi ý chiết khấu nhanh */}
                  {totalOriginalPrice > 0 && (
                    <div className="space-y-2 rounded-2xl border border-border bg-background/70 p-3">
                      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Áp dụng nhanh mức giảm so với giá lẻ
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { rate: 0.1, label: "-10%" },
                          { rate: 0.2, label: "-20%" },
                          { rate: 0.3, label: "-30%", recommended: true },
                          { rate: 0.5, label: "-50%" },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => applyQuickDiscount(preset.rate)}
                            className={`rounded-full border px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                              preset.recommended
                                ? "border-primary-pastel bg-primary-light/80 text-primary hover:bg-primary-light"
                                : "border-border bg-surface text-foreground hover:border-primary-pastel hover:text-primary"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thanh trực quan Giá bán vs Tiết kiệm */}
                  {totalOriginalPrice > 0 && !isPriceInvalid && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                        <span>Giá bán ({priceRatioPercent}%)</span>
                        <span className="text-secondary-foreground font-semibold">
                          Tiết kiệm ({Math.max(0, 100 - priceRatioPercent)}%)
                        </span>
                      </div>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary-light">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${priceRatioPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 3 chỉ số phân tích */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3.5 py-2.5 text-xs">
                      <span className="text-muted-foreground">
                        Tổng giá lẻ ({courseIds.length} khóa)
                      </span>
                      <strong className="font-semibold text-foreground tabular-nums">
                        {price(totalOriginalPrice)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-primary-pastel bg-primary-light/50 px-3.5 py-2.5 text-xs">
                      <span className="font-medium text-primary">
                        Giá bán Combo
                      </span>
                      <strong className="font-display text-base font-bold text-primary tabular-nums">
                        {price(comboPrice)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-secondary-pastel bg-secondary-light/55 px-3.5 py-2.5 text-xs">
                      <span className="font-medium text-secondary-foreground">
                        Học viên tiết kiệm
                      </span>
                      <strong className="inline-flex items-center gap-1.5 font-semibold text-secondary-foreground tabular-nums">
                        {price(savings)}
                        {discountPercent > 0 && (
                          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold">
                            -{discountPercent}%
                          </span>
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* Cảnh báo hợp lệ */}
                  {isPriceInvalid && (
                    <div className="flex items-start gap-2 rounded-xl border border-destructive-border bg-destructive-bg p-3 text-xs text-destructive-foreground">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <strong className="font-semibold">
                          Giá combo vượt tổng giá lẻ:
                        </strong>{" "}
                        Giá trọn gói ({price(comboPrice)}) phải nhỏ hơn hoặc
                        bằng tổng giá lẻ ({price(totalOriginalPrice)}).
                      </div>
                    </div>
                  )}

                  {courseIds.length < 2 && (
                    <div className="flex items-center gap-2 rounded-xl border border-warning-border bg-warning-bg p-3 text-xs text-warning-foreground">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        Cần chọn tối thiểu 2 khóa học để có thể mở bán combo.
                      </span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    className="rounded-full shadow-sm"
                    isLoading={busy}
                    disabled={
                      busy ||
                      uploadingThumbnail ||
                      isPriceInvalid ||
                      courseIds.length < 2
                    }
                  >
                    {versionId ? "Lưu thay đổi lộ trình" : "Tạo và mở bán combo"}
                  </Button>
                </div>
              </Card>
            </div>
          </fieldset>
        </form>

        {/* Chặng 03: Mã ưu đãi riêng của combo */}
        {data?.bundle_id && (
          <Card
            variant="surface"
            density="none"
            className="overflow-hidden rounded-[24px] border border-border"
          >
            <div className="flex items-center gap-3 border-b border-border bg-accent-vanilla/50 px-6 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface font-display text-sm font-bold text-primary">
                03
              </span>
              <div className="flex-1">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                  <Tag animated={false} className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>Mã ưu đãi dành riêng cho combo</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tạo mã giảm giá áp dụng trực tiếp cho lộ trình này để thúc đẩy
                  tỷ lệ đăng ký.
                </p>
              </div>
            </div>
            <div className="p-6">
              <CouponManager
                bundleId={data.bundle_id}
                couponUrl={`/lecturer/bundles/${data.bundle_id}/coupons`}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
