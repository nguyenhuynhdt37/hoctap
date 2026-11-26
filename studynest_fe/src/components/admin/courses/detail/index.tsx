"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  GraduationCap,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "pulsoicon-react";
import { renderLearningContent } from "@/components/shared/markdown-renderer/safe-html";
import { Button } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type {
  AdminCourseLessonBrief,
  AdminCourseReviewDetail,
} from "@/types/admin/course";
import AdminLessonPreviewPane, {
  getLessonTypeMeta,
} from "./lesson-preview-pane";

const QUICK_REJECT_REASONS = [
  "Khóa học còn bài giảng trống nội dung hoặc chưa tải tệp video lên.",
  "Thiếu ảnh bìa rõ nét hoặc phần mô tả chưa nêu rõ mục tiêu đầu ra.",
  "Chưa gán phân loại Môn học / Khối lớp phù hợp.",
  "Câu hỏi bài tập chưa cấu hình đầy đủ đáp án đúng và lời giải thích.",
  "Chất lượng âm thanh / hình ảnh ở một số bài giảng cần cải thiện.",
];

function formatDurationTotal(sec?: number | null): string {
  const s = Math.max(0, Math.round(Number(sec || 0)));
  if (s === 0) return "0 phút";
  const h = Math.floor(s / 3600);
  const m = Math.max(1, Math.round((s % 3600) / 60));
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

export default function AdminCourseReviewDetailView({
  courseId,
}: {
  courseId: string;
}) {
  const { mutate: globalMutate } = useSWRConfig();
  const [leftTab, setLeftTab] = useState<"curriculum" | "overview">(
    "curriculum",
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonFilter, setLessonFilter] = useState<"all" | "empty">("all");
  const [lessonSearch, setLessonSearch] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const [decisionModal, setDecisionModal] = useState<
    "approve" | "reject" | null
  >(null);
  const [note, setNote] = useState("");
  const [publishOnApprove, setPublishOnApprove] = useState(true);
  const [busy, setBusy] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<AdminCourseReviewDetail>(
    `/admin/courses/${courseId}`,
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  // Danh sách phẳng toàn bộ bài học để điều hướng Bài trước / Bài tiếp
  const flatLessons = useMemo<AdminCourseLessonBrief[]>(() => {
    if (!data) return [];
    return data.sections.flatMap((sec) => sec.lessons);
  }, [data]);

  // Tự động chọn bài học đầu tiên khi mở Studio
  useEffect(() => {
    if (!selectedLessonId && flatLessons.length > 0) {
      setSelectedLessonId(flatLessons[0].id);
    }
  }, [flatLessons, selectedLessonId]);

  const currentIdx = useMemo(
    () => flatLessons.findIndex((l) => l.id === selectedLessonId),
    [flatLessons, selectedLessonId],
  );

  async function submitDecision() {
    if (!decisionModal || !data) return;
    if (decisionModal === "reject" && note.trim().length < 5) {
      toast.error(
        "Vui lòng nhập lý do / hướng dẫn chỉnh sửa tối thiểu 5 ký tự.",
      );
      return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/courses/${data.id}/review`, {
        action: decisionModal,
        note: note.trim() || null,
        publish_on_approve: publishOnApprove,
      });
      toast.success(
        decisionModal === "approve"
          ? "Đã phê duyệt khóa học thành công!"
          : "Đã gửi yêu cầu chỉnh sửa tới Giảng viên.",
      );
      setDecisionModal(null);
      setNote("");
      await Promise.all([mutate(), globalMutate("/admin/courses/stats")]);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể lưu quyết định thẩm định.";
      toast.error(detail);
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickAction(action: "publish" | "unpublish") {
    if (!data) return;
    setBusy(true);
    try {
      await api.post(`/admin/courses/${data.id}/review`, { action });
      toast.success(
        action === "publish"
          ? "Khóa học đã hiển thị công khai trên sàn!"
          : "Đã tạm ẩn khóa học khỏi danh mục công khai.",
      );
      await Promise.all([mutate(), globalMutate("/admin/courses/stats")]);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể cập nhật trạng thái hiển thị.";
      toast.error(detail);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-[1480px] space-y-6 p-6">
        <div className="h-28 animate-pulse rounded-3xl border border-border bg-surface" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-[560px] animate-pulse rounded-3xl border border-border bg-surface lg:col-span-4" />
          <div className="h-[560px] animate-pulse rounded-3xl border border-border bg-surface lg:col-span-8" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-[1480px] p-6">
        <div className="rounded-3xl border border-destructive-border bg-destructive-bg p-6 text-sm text-destructive-foreground">
          Không tìm thấy khóa học hoặc không tải được dữ liệu thẩm định.{" "}
          <Link href="/admin/courses" className="font-semibold underline">
            Quay lại danh sách khóa học
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1480px] space-y-5 p-4 text-foreground sm:p-6">
      {/* Top Review Command Bar */}
      <section className="rounded-[2rem] border border-white/90 bg-gradient-to-br from-primary-light/90 via-surface/95 to-accent-vanilla/45 p-5 shadow-[0_20px_50px_-20px_rgba(53,111,167,0.18)] backdrop-blur-md sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/admin/courses"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <ArrowLeft size={13} animated={false} />
                Danh sách Khóa học
              </Link>

              {data.approval_status === "pending" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-bg px-3 py-1 font-bold text-warning-foreground">
                  <Clock size={12} animated={false} />
                  Chờ phê duyệt · Vòng #{data.review_round}
                </span>
              ) : data.approval_status === "rejected" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-destructive-border bg-destructive-bg px-3 py-1 font-bold text-destructive-foreground">
                  <XCircle size={12} animated={false} />
                  Yêu cầu chỉnh sửa · Vòng #{data.review_round}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-3 py-1 font-bold text-success-foreground">
                  <CheckCircle2 size={12} animated={false} />
                  Đã phê duyệt{" "}
                  {data.is_published ? "(Đang công khai)" : "(Đang tạm ẩn)"}
                </span>
              )}

              <span className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface px-3 py-1 font-bold text-primary">
                <Coins size={12} animated={false} />
                {data.base_price <= 0
                  ? "Miễn phí"
                  : `${formatVndAsCoin(data.base_price)} (${data.base_price.toLocaleString("vi-VN")} đ)`}
              </span>
            </div>

            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              {data.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Link
                href={`/admin/lecturers/${data.instructor.id}`}
                className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-primary"
              >
                <GraduationCap
                  size={14}
                  animated={false}
                  className="text-primary"
                />
                {data.instructor.fullname} ({data.instructor.email})
                <ArrowUpRight size={12} animated={false} />
              </Link>
              <span>·</span>
              <span>
                <strong>{data.sections_count}</strong> chương ·{" "}
                <strong>{data.lessons_count}</strong> bài học ·{" "}
                {formatDurationTotal(data.total_length_seconds)}
              </span>
              <span>·</span>
              <span>
                Đạt chuẩn{" "}
                <strong className="text-primary">
                  {data.quality_score.passed}/{data.quality_score.total}
                </strong>{" "}
                tiêu chí
              </span>
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {data.is_published && data.approval_status === "approved" && (
              <Link
                href={`/course/${data.slug}`}
                target="_blank"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Trang Học viên
                <ExternalLink size={13} animated={false} />
              </Link>
            )}

            {data.approval_status === "approved" && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void handleQuickAction(
                    data.is_published ? "unpublish" : "publish",
                  )
                }
              >
                {data.is_published ? (
                  <>
                    <EyeOff size={14} />
                    Tạm ẩn khỏi sàn
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    Bật công khai
                  </>
                )}
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => {
                setNote(data.approval_note || "");
                setDecisionModal("reject");
              }}
            >
              <XCircle size={14} />
              Yêu cầu chỉnh sửa
            </Button>

            {data.approval_status !== "approved" && (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => {
                  setNote("");
                  setPublishOnApprove(true);
                  setDecisionModal("approve");
                }}
              >
                <CheckCircle2 size={15} />
                Phê duyệt &amp; Phát hành
              </Button>
            )}
          </div>
        </div>

        {/* Previous Rejection / Approval Note */}
        {data.approval_note && (
          <div className="mt-4 rounded-2xl border border-border/80 bg-surface/90 px-4 py-3 text-xs">
            <span className="font-bold text-foreground">
              Ghi chú thẩm định gần nhất
              {data.approver ? ` (${data.approver.fullname})` : ""}:
            </span>{" "}
            <span className="whitespace-pre-line text-muted-foreground">
              {data.approval_note}
            </span>
          </div>
        )}
      </section>

      {/* Split Studio Workspace */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN (4/12): Curriculum Tree + Automated Quality Gate */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:col-span-4">
          <div className="rounded-3xl border border-primary-pastel/65 bg-surface/95 p-4 shadow-[0_14px_36px_-16px_rgba(53,111,167,0.14)]">
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-background p-1 text-xs">
              <button
                type="button"
                onClick={() => setLeftTab("curriculum")}
                className={`rounded-xl py-2 font-bold transition-all ${
                  leftTab === "curriculum"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Chương trình ({data.lessons_count})
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("overview")}
                className={`rounded-xl py-2 font-bold transition-all ${
                  leftTab === "overview"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Checklist ({data.quality_score.passed}/
                {data.quality_score.total})
              </button>
            </div>

            {leftTab === "curriculum" ? (
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search
                    size={14}
                    animated={false}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={lessonSearch}
                    onChange={(e) => setLessonSearch(e.target.value)}
                    placeholder="Tìm nhanh bài học..."
                    className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                {data.empty_lessons_count > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-warning-border bg-warning-bg/75 px-3 py-2 text-[11px] text-warning-foreground">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <AlertTriangle size={12} animated={false} />
                      {data.empty_lessons_count} bài chưa có nội dung
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLessonFilter((f) => (f === "empty" ? "all" : "empty"))
                      }
                      className="font-bold underline"
                    >
                      {lessonFilter === "empty" ? "Hiện tất cả" : "Lọc xem"}
                    </button>
                  </div>
                )}

                {data.sections.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    Khóa học chưa tạo chương học nào.
                  </p>
                ) : (
                  <div className="max-h-[65vh] space-y-2.5 overflow-y-auto pr-1">
                    {data.sections.map((sec, si) => {
                      const q = lessonSearch.trim().toLowerCase();
                      const filteredLessons = sec.lessons.filter((l) => {
                        if (lessonFilter === "empty" && l.has_content) {
                          return false;
                        }
                        if (q && !l.title.toLowerCase().includes(q)) {
                          return false;
                        }
                        return true;
                      });
                      if (
                        (lessonFilter === "empty" || q) &&
                        filteredLessons.length === 0
                      ) {
                        return null;
                      }
                      const isCollapsed = Boolean(collapsedSections[sec.id]);

                      return (
                        <div
                          key={sec.id}
                          className="overflow-hidden rounded-2xl border border-border/80 bg-background/50"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedSections((prev) => ({
                                ...prev,
                                [sec.id]: !prev[sec.id],
                              }))
                            }
                            className="flex w-full items-center justify-between gap-2 bg-primary-light/45 px-3.5 py-2.5 text-left text-xs font-bold text-foreground hover:bg-primary-light/70"
                          >
                            <span className="truncate">
                              Chương {si + 1}: {sec.title}
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                              {filteredLessons.length} bài
                              {isCollapsed ? (
                                <ChevronRight size={13} animated={false} />
                              ) : (
                                <ChevronDown size={13} animated={false} />
                              )}
                            </span>
                          </button>

                          {!isCollapsed && (
                            <div className="divide-y divide-border/60">
                              {filteredLessons.map((les) => {
                                const active = les.id === selectedLessonId;
                                const meta = getLessonTypeMeta(les.lesson_type);
                                const LIcon = meta.icon;
                                return (
                                  <button
                                    key={les.id}
                                    type="button"
                                    onClick={() => setSelectedLessonId(les.id)}
                                    className={`flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-xs transition-colors ${
                                      active
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-primary-light/40"
                                    }`}
                                  >
                                    <LIcon
                                      size={14}
                                      animated={false}
                                      className={`mt-0.5 shrink-0 ${
                                        active
                                          ? "text-primary-foreground"
                                          : "text-primary"
                                      }`}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="line-clamp-2 font-semibold leading-snug">
                                        {les.title}
                                      </p>
                                      <p
                                        className={`mt-0.5 text-[10px] ${
                                          active
                                            ? "text-primary-foreground/85"
                                            : les.has_content
                                              ? "text-muted-foreground"
                                              : "font-semibold text-warning-foreground"
                                        }`}
                                      >
                                        {les.content_hint}
                                        {les.is_preview ? " · Học thử" : ""}
                                      </p>
                                    </div>
                                    {les.has_content ? (
                                      <CheckCircle2
                                        size={13}
                                        animated={false}
                                        className={`mt-0.5 shrink-0 ${
                                          active
                                            ? "text-primary-foreground"
                                            : "text-success-foreground"
                                        }`}
                                      />
                                    ) : (
                                      <AlertTriangle
                                        size={13}
                                        animated={false}
                                        className={`mt-0.5 shrink-0 ${
                                          active
                                            ? "text-primary-foreground"
                                            : "text-warning-foreground"
                                        }`}
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1 text-xs">
                {/* Automated Quality Gate */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 font-bold text-foreground">
                    <ShieldCheck
                      size={15}
                      animated={false}
                      className="text-primary"
                    />
                    Checklist Thẩm định Tự động
                  </p>
                  {data.quality_score.checks.map((chk) => (
                    <div
                      key={chk.key}
                      className={`flex items-start gap-2.5 rounded-2xl border p-3 ${
                        chk.passed
                          ? "border-success-border/70 bg-success-bg/50"
                          : "border-warning-border bg-warning-bg/65"
                      }`}
                    >
                      {chk.passed ? (
                        <CheckCircle2
                          size={15}
                          animated={false}
                          className="mt-0.5 shrink-0 text-success-foreground"
                        />
                      ) : (
                        <AlertTriangle
                          size={15}
                          animated={false}
                          className="mt-0.5 shrink-0 text-warning-foreground"
                        />
                      )}
                      <div>
                        <p className="font-bold text-foreground">{chk.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {chk.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Thumbnail & Promo Video */}
                {data.thumbnail_url && (
                  <div className="space-y-1.5">
                    <p className="font-bold text-foreground">Ảnh bìa khóa học</p>
                    <img
                      src={getImageUrl(data.thumbnail_url)}
                      alt={data.title}
                      className="aspect-video w-full rounded-2xl border border-border object-cover"
                    />
                  </div>
                )}

                {data.promo_video_url && (
                  <a
                    href={data.promo_video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary-pastel bg-primary-light px-3 py-2 font-semibold text-primary"
                  >
                    <Play size={13} animated={false} />
                    Mở Video giới thiệu (Promo)
                    <ExternalLink size={12} animated={false} />
                  </a>
                )}

                {/* Lecturer Legal Status */}
                <div className="rounded-2xl border border-border bg-background/60 p-3.5">
                  <p className="font-bold text-foreground">
                    Pháp lý Giảng viên
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {data.instructor.fullname} · {data.instructor.email}
                  </p>
                  <div className="mt-2">
                    {data.instructor.master_contract_status ===
                    "countersigned" ? (
                      <Link
                        href={`/admin/contracts?search=${encodeURIComponent(data.instructor.master_contract_number || "")}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-success-border bg-success-bg px-2.5 py-1 text-[11px] font-semibold text-success-foreground"
                      >
                        <FileCheck2 size={12} animated={false} />
                        HĐ {data.instructor.master_contract_number} (Đã đồng ký)
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-warning-border bg-warning-bg px-2.5 py-1 text-[11px] font-semibold text-warning-foreground">
                        <AlertTriangle size={12} animated={false} />
                        Chưa hoàn tất đồng ký Hợp đồng PKI
                      </span>
                    )}
                  </div>
                </div>

                {/* Outcomes & Description */}
                {data.outcomes.length > 0 && (
                  <div className="rounded-2xl border border-border bg-background/60 p-3.5">
                    <p className="font-bold text-foreground">
                      Mục tiêu đầu ra ({data.outcomes.length})
                    </p>
                    <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
                      {data.outcomes.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.description && (
                  <div className="rounded-2xl border border-border bg-background/60 p-3.5">
                    <p className="mb-1.5 font-bold text-foreground">
                      Mô tả khóa học
                    </p>
                    <div
                      className="prose prose-xs max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{
                        __html: renderLearningContent(data.description),
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN (8/12): Full Interactive Lesson Previewer */}
        <section className="lg:col-span-8">
          <AdminLessonPreviewPane
            courseId={data.id}
            lessonId={selectedLessonId}
            hasPrev={currentIdx > 0}
            hasNext={currentIdx >= 0 && currentIdx < flatLessons.length - 1}
            onPrev={() => {
              if (currentIdx > 0) {
                setSelectedLessonId(flatLessons[currentIdx - 1].id);
              }
            }}
            onNext={() => {
              if (currentIdx >= 0 && currentIdx < flatLessons.length - 1) {
                setSelectedLessonId(flatLessons[currentIdx + 1].id);
              }
            }}
          />
        </section>
      </div>

      {/* Decision Modal (Approve / Reject) */}
      {decisionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {decisionModal === "approve"
                    ? "Phê duyệt & Phát hành Khóa học"
                    : "Yêu cầu Giảng viên chỉnh sửa"}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.title} · Vòng thẩm định #{data.review_round}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setDecisionModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-background"
              >
                <X size={16} />
              </button>
            </div>

            {decisionModal === "approve" ? (
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-success-border bg-success-bg/60 px-4 py-3 text-xs">
                <div>
                  <p className="font-bold text-success-foreground">
                    Bật hiển thị công khai lên sàn ngay lập tức
                  </p>
                  <p className="text-[11px] text-success-foreground/85">
                    Học viên có thể tìm kiếm và đăng ký học ngay sau khi xác
                    nhận.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={publishOnApprove}
                  onChange={(e) => setPublishOnApprove(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
              </label>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Chèn nhanh góp ý phổ biến:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REJECT_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() =>
                        setNote((prev) => (prev ? `${prev}\n- ${r}` : `- ${r}`))
                      }
                      className="rounded-xl border border-border bg-background px-2.5 py-1 text-left text-[11px] text-foreground transition-colors hover:border-primary hover:bg-primary-light"
                    >
                      + {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                {decisionModal === "approve"
                  ? "Lời nhắn cho Giảng viên (tùy chọn)"
                  : "Chi tiết nội dung cần chỉnh sửa *"}
              </label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  decisionModal === "approve"
                    ? "Ví dụ: Nội dung khóa học đạt chuẩn xuất sắc, đã duyệt phát hành!"
                    : "Ghi rõ bài học hoặc mục nào giảng viên cần cập nhật trước khi gửi duyệt lại..."
                }
                className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDecisionModal(null)}>
                Hủy
              </Button>
              <Button
                variant={
                  decisionModal === "approve" ? "primary" : "destructive"
                }
                disabled={busy}
                onClick={() => void submitDecision()}
              >
                {busy
                  ? "Đang lưu..."
                  : decisionModal === "approve"
                    ? "Xác nhận Phê duyệt"
                    : "Gửi Yêu cầu chỉnh sửa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
