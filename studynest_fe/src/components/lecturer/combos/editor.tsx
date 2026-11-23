"use client";

import { useEffect, useRef, useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  ImagePlus,
  TrendingDown,
} from "lucide-react";
import CouponManager from "@/components/admin/learning-paths/coupon-manager";
import {
  fetchLearning,
  LoadError,
  message,
  price,
  control,
} from "@/components/learning-paths/shared";
import { Alert, Badge, Button, Card, Input, Textarea } from "@/components/ui";
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
const learningKeys = Object.keys(learningFields) as (keyof typeof learningFields)[];
const points = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

type ComboDetail = Pick<Bundle, "subtitle" | "target_audience" | "requirements" | "outcomes"> & {
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
  const [coursesInfo, setCoursesInfo] = useState<Record<string, CourseInfo>>({});
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

    // Nạp thông tin các khóa học ban đầu từ detail
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
  const { totalOriginalPrice, comboPrice, savings, discountPercent, isPriceInvalid } =
    useMemo(() => {
      const orig = courseIds.reduce((sum, id) => {
        const item = coursesInfo[id];
        return sum + (item?.price || 0);
      }, 0);
      const cp = Number(amount) || 0;
      const sav = Math.max(0, orig - cp);
      const pct = orig > 0 ? Math.round(((orig - cp) / orig) * 100) : 0;
      const invalid = orig > 0 && cp > orig;

      return {
        totalOriginalPrice: orig,
        comboPrice: cp,
        savings: sav,
        discountPercent: pct,
        isPriceInvalid: invalid,
      };
    }, [courseIds, coursesInfo, amount]);

  // Hàm áp dụng nhanh mức giảm giá (%)
  const applyQuickDiscount = (rate: number) => {
    if (totalOriginalPrice <= 0) return;
    const discounted = Math.round(totalOriginalPrice * (1 - rate));
    setAmount(String(discounted));
  };

  // Cập nhật thông tin khi giảng viên chọn thêm khóa học mới
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
      setFailure("Mục tiêu và giới thiệu lộ trình học tập cần có tối thiểu 20 ký tự.");
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
        setFailure(`${learningFields[key]} cho phép tối đa 12 dòng, mỗi dòng tối đa 500 ký tự.`);
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

  if (versionId && error)
    return <LoadError error={error} retry={() => mutate()} />;
  if (versionId && (isLoading || !data))
    return <p className="text-sm text-muted-foreground">Đang tải thông tin combo…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      {/* Nút quay lại danh sách */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/lecturer/combos")}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          className="text-muted-foreground hover:text-foreground"
        >
          Quay lại danh sách combo
        </Button>
      </div>

      {/* Header trang */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-sans text-2xl font-bold text-foreground">
              {versionId ? title || "Chỉnh sửa combo lộ trình" : "Tạo combo lộ trình mới"}
            </h1>
            {data?.status === "published" && (
              <Badge variant={data.is_active ? "success" : "neutral"} dot>
                {data.is_active ? "Đang mở bán" : "Tạm dừng"}
              </Badge>
            )}
            {data?.status === "draft" && (
              <Badge variant="info">
                Bản nháp
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Sắp xếp khóa học theo thứ tự bạn muốn học viên theo dõi.
          </p>
        </div>

        {data?.status === "published" && data.is_active && data.slug && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/combo/${data.slug}`, "_blank")}
            leftIcon={<ExternalLink className="h-4 w-4" />}
          >
            Xem trang công khai
          </Button>
        )}
      </div>

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

      <form onSubmit={save}>
        <fieldset disabled={busy} className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            <Card className="space-y-5">
              <h2 className="text-lg font-semibold">Thông tin hiển thị</h2>
              <Input
                label="Tên combo"
                required
                minLength={3}
                maxLength={180}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ví dụ: Toán 10 từ cơ bản đến nâng cao"
              />
              <div className="space-y-2">
                <label htmlFor="combo-subtitle" className="block text-sm font-medium text-foreground">
                  Giới thiệu ngắn
                </label>
                <Input
                  id="combo-subtitle"
                  value={subtitle}
                  maxLength={240}
                  onChange={(event) => setSubtitle(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Ảnh bìa combo</h3>
                <div className="grid items-center gap-4 rounded-2xl border border-border bg-surface-muted p-3 sm:grid-cols-[minmax(0,180px)_1fr]">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt="Xem trước ảnh bìa combo"
                      className="aspect-video w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid aspect-video place-items-center rounded-xl bg-primary-light text-primary">
                      <ImagePlus className="size-7 stroke-[1.5]" aria-hidden="true" />
                    </div>
                  )}
                  <div className="space-y-2">
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
                    <label htmlFor="combo-thumbnail" className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-default peer-disabled:opacity-60">
                      {thumbnailUrl ? "Thay ảnh" : "Chọn ảnh"}
                    </label>
                    <p id="combo-thumbnail-hint" className="text-xs text-muted-foreground" aria-live="polite">
                      {uploadingThumbnail ? "Đang tải ảnh lên…" : "JPEG, PNG hoặc WebP, tối đa 5 MB."}
                    </p>
                    {thumbnailUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={uploadingThumbnail}
                        onClick={() => setThumbnailUrl(null)}
                      >
                        Bỏ ảnh bìa
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 [&_.tiptap-editor-content]:min-h-32! [&_.tiptap-editor-content_.ProseMirror]:min-h-32!">
                <h3 className="text-sm font-medium">Mô tả lộ trình</h3>
                <TiptapEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Tóm tắt lộ trình và giải thích cách các khóa học nối tiếp nhau."
                  minHeight="180px"
                  maxHeight="320px"
                />
                <span className="text-xs text-muted-foreground block">
                  Mô tả tối thiểu 20 ký tự.
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {learningKeys.map((key) => (
                  <div key={key} className="space-y-2">
                    <label htmlFor={`combo-${key}`} className="block text-sm font-medium text-foreground">
                      {learningFields[key]}
                    </label>
                    <Textarea
                      id={`combo-${key}`}
                      value={learning[key]}
                      onChange={(event) => {
                        const value = event.target.value;
                        setLearning((current) => ({ ...current, [key]: value }));
                      }}
                      placeholder="Mỗi ý trên một dòng"
                      rows={4}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="text-lg font-semibold">Khóa học trong combo</h2>
              <LecturerCoursePicker
                value={courseIds}
                onChange={setCourseIds}
                disabled={busy}
                selectedCourses={data?.items}
                coursesInfo={coursesInfo}
                onCourseSelect={handleCourseSelect}
              />
            </Card>
          </div>

          <Card className="min-w-0 space-y-4 xl:sticky xl:top-24">
            <h2 className="text-lg font-semibold">Giá và mở bán</h2>
            <Input
              label="Giá combo (VND)"
              required
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="VD: 799000"
            />
            {/* Bộ gợi ý giảm giá nhanh */}
            {totalOriginalPrice > 0 && (
              <div className="rounded-xl border border-border bg-surface-muted p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Gợi ý thiết lập giá ưu đãi theo tỷ lệ:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickDiscount(0.1)}
                      className="h-7 text-xs px-2.5"
                    >
                      Giảm 10%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickDiscount(0.2)}
                      className="h-7 text-xs px-2.5"
                    >
                      Giảm 20%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickDiscount(0.3)}
                      className="h-7 text-xs px-2.5 font-semibold text-primary border-primary-pastel"
                    >
                      Giảm 30%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickDiscount(0.5)}
                      className="h-7 text-xs px-2.5"
                    >
                      Giảm 50%
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* WIDGET TÍNH GIÁ & TIẾT KIỆM REALTIME */}
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-2xs">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <TrendingDown className="h-4 w-4 text-primary" />
                Bảng phân tích giá & Ưu đãi học viên
              </h3>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                {/* Cột 1: Tổng giá lẻ */}
                <div className="rounded-xl bg-surface-muted p-3 border border-border/70">
                  <p className="text-xs text-muted-foreground">Tổng giá bán lẻ ({courseIds.length} khóa)</p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {price(totalOriginalPrice)}
                  </p>
                </div>

                {/* Cột 2: Giá combo đề xuất */}
                <div className="rounded-xl bg-primary-light/60 p-3 border border-primary-pastel">
                  <p className="text-xs text-primary font-medium">Giá bán Combo trọn gói</p>
                  <p className="mt-1 text-xl font-extrabold text-primary">
                    {price(comboPrice)}
                  </p>
                </div>

                {/* Cột 3: Tiết kiệm */}
                <div className="rounded-xl bg-secondary-light/60 p-3 border border-secondary-pastel">
                  <p className="text-xs text-secondary-foreground font-medium">Học viên tiết kiệm</p>
                  <p className="mt-1 text-lg font-bold text-secondary-foreground flex items-center gap-1.5">
                    {price(savings)}
                    {discountPercent > 0 && (
                      <span className="text-xs font-normal px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                        -{discountPercent}%
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Cảnh báo lỗi giá nếu giá combo > tổng giá lẻ */}
              {isPriceInvalid && (
                <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-destructive-border bg-destructive-bg p-3 text-xs text-destructive-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Giá combo vượt quá tổng giá lẻ: </strong>
                    Quy định sàn yêu cầu giá trọn gói của combo ({price(comboPrice)}) phải nhỏ hơn hoặc bằng tổng giá bán lẻ của các khóa học thành phần ({price(totalOriginalPrice)}). Vui lòng hạ giá combo.
                  </div>
                </div>
              )}

              {/* Thông báo nếu chưa đủ 2 khóa */}
              {courseIds.length < 2 && (
                <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-warning-border bg-warning-bg p-3 text-xs text-warning-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Combo cần tối thiểu 2 khóa học để có thể mở bán lộ trình.</span>
                </div>
              )}

            </div>
            <Button
              type="submit"
              fullWidth
              isLoading={busy}
              disabled={busy || uploadingThumbnail || isPriceInvalid || courseIds.length < 2}
            >
              {versionId ? "Lưu thay đổi" : "Tạo và mở bán combo"}
            </Button>
          </Card>
        </fieldset>
      </form>

      {/* Quản lý mã coupon dành riêng cho combo */}
      {data?.bundle_id && (
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Mã ưu đãi của combo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tạo các mã giảm giá áp dụng trực tiếp cho combo lộ trình này để thúc đẩy chuyển đổi.
            </p>
          </div>
          <CouponManager
            bundleId={data.bundle_id}
            couponUrl={`/lecturer/bundles/${data.bundle_id}/coupons`}
          />
        </Card>
      )}
    </div>
  );
}
