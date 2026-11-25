"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Coins,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  History,
  Layers,
  Pencil,
  Percent,
  ShieldCheck,
  Users,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { DiscountDetail } from "@/types/admin/discount";
import {
  VoucherTicketPreview,
  formatDiscountCoin,
  formatDiscountDateTime,
  getAppliesToLabel,
} from "../discount-visuals";

interface DiscountDetailsProps {
  data: DiscountDetail;
}

export default function DiscountDetails({ data }: DiscountDetailsProps) {
  const router = useRouter();
  const { discount, targets = [], usage_history = [] } = data;
  const [isActive, setIsActive] = useState(discount.is_active);
  const [toggling, setToggling] = useState(false);

  const totalDiscounted = usage_history.reduce(
    (sum, item) => sum + Number(item.discounted_amount || 0),
    0,
  );

  async function toggleStatus() {
    setToggling(true);
    try {
      await api.patch(`/admin/discounts/${discount.id}/toggle`, null, {
        params: { is_active: !isActive },
      });
      setIsActive((v) => !v);
      toast.success(
        !isActive ? "Đã bật lại mã giảm giá" : "Đã tạm tắt mã giảm giá",
      );
    } catch {
      toast.error("Không thể cập nhật trạng thái mã.");
    } finally {
      setToggling(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/discounts"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <ArrowLeft size={14} />
          Danh sách mã giảm giá
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={toggling}
            onClick={() => void toggleStatus()}
          >
            {isActive ? <EyeOff size={14} /> : <Eye size={14} />}
            {isActive ? "Tạm tắt mã" : "Kích hoạt lại"}
          </Button>
          <Button
            size="sm"
            onClick={() => router.push(`/admin/discounts/${discount.id}/edit`)}
          >
            <Pencil size={14} />
            Chỉnh sửa chiến dịch
          </Button>
        </div>
      </div>

      {/* Hero Split: Ticket + 4 Performance KPIs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <VoucherTicketPreview
            name={discount.name}
            code={discount.code}
            discountType={discount.discount_type}
            percentValue={discount.percent_value}
            fixedValue={discount.fixed_value}
            appliesTo={discount.applies_to}
            isActive={isActive}
            isHidden={discount.is_hidden}
            startAt={discount.start_at}
            endAt={discount.end_at}
            usageCount={discount.usage_count}
            usageLimit={discount.usage_limit}
            createdRole={discount.created_role}
            creator={discount.creator}
            targetCount={targets.length}
          />
        </div>

        <div className="flex flex-col justify-between gap-4 lg:col-span-7">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_32px_-14px_rgba(53,111,167,0.12)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {discount.created_role === "LECTURER" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent/80 px-3 py-1 text-xs font-semibold text-accent-foreground">
                      <GraduationCap size={13} animated={false} />
                      Mã do Giảng viên tạo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                      <ShieldCheck size={13} animated={false} />
                      Chiến dịch Nền tảng
                    </span>
                  )}
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {discount.name}
                </h1>
              </div>

              {discount.creator && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-border/80 bg-background/70 px-3 py-2">
                  {discount.creator.avatar ? (
                    <img
                      src={getImageUrl(discount.creator.avatar)}
                      alt={discount.creator.fullname}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                      {(discount.creator.fullname || "G").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 text-xs">
                    <p className="truncate font-semibold text-foreground">
                      {discount.creator.fullname}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {discount.creator.email || "Chủ sở hữu mã"}
                    </p>
                  </div>
                  {discount.created_role === "LECTURER" && (
                    <Link
                      href={`/admin/lecturers/${discount.creator.id}`}
                      className="ml-1 inline-flex items-center gap-1 rounded-xl border border-primary-pastel bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-light"
                    >
                      Hồ sơ GV
                      <ExternalLink size={11} animated={false} />
                    </Link>
                  )}
                </div>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {discount.description ||
                "Chiến dịch khuyến mãi chưa có mô tả chi tiết."}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-primary-light/60 p-3.5">
                <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  {discount.discount_type === "percent" ? (
                    <Percent size={12} className="text-primary" />
                  ) : (
                    <Coins size={12} className="text-primary" />
                  )}
                  Mức ưu đãi
                </p>
                <p className="mt-1 text-lg font-bold text-primary">
                  {discount.discount_type === "percent"
                    ? `${discount.percent_value ?? 0}%`
                    : formatDiscountCoin(discount.fixed_value ?? 0)}
                </p>
              </div>

              <div className="rounded-2xl bg-background p-3.5">
                <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Users size={12} className="text-primary" />
                  Lượt sử dụng
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {discount.usage_count}
                  <span className="text-xs font-medium text-muted-foreground">
                    {discount.usage_limit ? ` / ${discount.usage_limit}` : " / ∞"}
                  </span>
                </p>
              </div>

              <div className="rounded-2xl bg-accent-vanilla/50 p-3.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Tổng đã trợ giá
                </p>
                <p className="mt-1 text-lg font-bold text-accent-vanilla-foreground">
                  {formatDiscountCoin(totalDiscounted)}
                </p>
              </div>

              <div className="rounded-2xl bg-background p-3.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Mỗi học viên
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {discount.per_user_limit} lượt
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-xs">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <Calendar size={16} />
              </span>
              <div>
                <p className="text-muted-foreground">Bắt đầu hiệu lực</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {formatDiscountDateTime(discount.start_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-xs">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-light text-secondary-foreground">
                <Calendar size={16} />
              </span>
              <div>
                <p className="text-muted-foreground">Kết thúc hiệu lực</p>
                <p className="mt-0.5 font-semibold text-foreground">
                  {formatDiscountDateTime(discount.end_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 2-Column: Scope Targets + Usage History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Targets */}
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] lg:col-span-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            {discount.applies_to === "global" ? (
              <Globe size={18} className="text-primary" />
            ) : (
              <Layers size={18} className="text-primary" />
            )}
            Phạm vi Áp dụng ({getAppliesToLabel(discount.applies_to)})
          </h2>

          {discount.applies_to === "global" ? (
            <div className="mt-4 rounded-2xl border border-primary-pastel/70 bg-primary-light/40 p-5 text-xs leading-relaxed text-foreground">
              Mã giảm giá này áp dụng cho <strong>toàn bộ khóa học</strong> đang
              mở bán trên hệ thống Mây Mây.
            </div>
          ) : targets.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Chưa có mục tiêu cụ thể nào được gắn vào mã này.
            </p>
          ) : (
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
              {targets.map((t, idx) => (
                <div
                  key={t.course_id || t.category_id || idx}
                  className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/50 p-3 text-xs"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <BookOpen size={15} animated={false} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {t.course_title || t.category_name || "Mục tiêu"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.course_id ? "Khóa học" : "Danh mục"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Usage History */}
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] lg:col-span-7">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <History size={18} className="text-primary" />
            Lịch sử Học viên Đổi Mã ({usage_history.length})
          </h2>

          {usage_history.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
              Chưa có học viên nào áp dụng mã giảm giá này.
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {usage_history.map((u, idx) => (
                <div
                  key={`${u.user_id}-${u.used_at}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 p-3.5 text-xs"
                >
                  <div className="flex items-center gap-3">
                    {u.avatar ? (
                      <img
                        src={getImageUrl(u.avatar)}
                        alt={u.user_name}
                        className="h-9 w-9 rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light font-bold text-primary">
                        {u.user_name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {u.user_name}
                      </p>
                      <p className="max-w-xs truncate text-muted-foreground">
                        {u.course_title}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-secondary-foreground">
                      -{formatDiscountCoin(u.discounted_amount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDiscountDateTime(u.used_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
