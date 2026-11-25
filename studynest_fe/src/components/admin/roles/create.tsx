"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle2, Plus, ShieldCheck } from "pulsoicon-react";
import { Button, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import {
  ROLE_PRESETS,
  RoleAvatarIcon,
  getRoleVisual,
  validateRoleNameCode,
} from "./role-visuals";

export default function CreateRole() {
  const router = useRouter();
  const [roleName, setRoleName] = useState("");
  const [details, setDetails] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const liveError = roleName ? validateRoleNameCode(roleName) : undefined;
  const previewVisual = getRoleVisual(roleName || "CUSTOM");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = roleName.trim().toUpperCase();
    const err = validateRoleNameCode(cleaned);
    if (err) {
      setErrorMsg(err);
      return;
    }
    if (!details.trim()) {
      setErrorMsg("Vui lòng nhập mô tả phạm vi quyền hạn.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await api.post("/admin/roles", {
        role_name: cleaned,
        details: details.trim(),
      });
      toast.success(`Đã tạo vai trò ${cleaned} thành công!`);
      router.push("/admin/roles");
      router.refresh();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.detail ||
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        "Không thể tạo vai trò mới.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      <div>
        <Link
          href="/admin/roles"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
        >
          <ArrowLeft size={13} />
          Quay lại Kiến trúc Vai trò
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Khởi tạo Vai trò Phân quyền Mới
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn nhanh từ các mẫu vai trò chuẩn vận hành hoặc tự định nghĩa vai trò mở rộng riêng cho Mây Mây.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <div className="space-y-6 lg:col-span-7">
          {/* Quick Presets */}
          <section className="space-y-3 rounded-[2rem] border border-primary-pastel/60 bg-surface/95 p-6 shadow-[0_14px_36px_-16px_rgba(53,111,167,0.14)]">
            <h2 className="text-sm font-bold text-foreground">
              Mẫu Vai trò Đề xuất (1 chạm điền sẵn)
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ROLE_PRESETS.map((preset) => (
                <button
                  key={preset.role_name}
                  type="button"
                  onClick={() => {
                    setRoleName(preset.role_name);
                    setDetails(preset.details);
                    setErrorMsg(null);
                  }}
                  className={`rounded-2xl border p-3.5 text-left transition-all ${
                    roleName === preset.role_name
                      ? "border-primary bg-primary-light/70"
                      : "border-border bg-background/60 hover:border-primary-pastel hover:bg-surface"
                  }`}
                >
                  <p className="font-mono text-xs font-bold text-primary">
                    {preset.role_name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {preset.details}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Form Fields */}
          <section className="space-y-4 rounded-[2rem] border border-primary-pastel/60 bg-surface/95 p-6 shadow-[0_14px_36px_-16px_rgba(53,111,167,0.14)]">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <ShieldCheck size={18} className="text-primary" />
              Thông tin Vai trò
            </h2>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive-border bg-destructive-bg px-4 py-3 text-xs font-medium text-destructive-foreground"
              >
                {errorMsg}
              </div>
            )}

            <Input
              label="Mã vai trò (CHỮ_IN_HOA_KHÔNG_DẤU)"
              required
              value={roleName}
              onChange={(e) => {
                setRoleName(e.target.value.toUpperCase().replace(/\s+/g, "_"));
                setErrorMsg(null);
              }}
              error={liveError}
              placeholder="VD: CONTENT_REVIEWER"
            />

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">
                Mô tả phạm vi &amp; trách nhiệm
              </span>
              <textarea
                rows={4}
                required
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Mô tả rõ vai trò này phụ trách mảng nào và được thao tác gì..."
                className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/roles")}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || Boolean(liveError)}
              >
                <Plus size={15} />
                {isSubmitting ? "Đang khởi tạo..." : "Khởi tạo Vai trò"}
              </Button>
            </div>
          </section>
        </div>

        {/* Sticky Live Card Preview */}
        <aside className="lg:col-span-5">
          <div className="sticky top-20 rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/70 via-surface to-accent/35 p-6 shadow-[0_18px_42px_-16px_rgba(53,111,167,0.16)]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
              Xem trước Thẻ Vai trò
            </p>
            <div className="overflow-hidden rounded-3xl border border-white/90 bg-surface shadow-sm">
              <div className={`p-4 ${previewVisual.softBg}`}>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border bg-surface ${previewVisual.border} ${previewVisual.text}`}
                  >
                    <RoleAvatarIcon
                      roleName={roleName || "CUSTOM"}
                      size={22}
                    />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-semibold text-muted-foreground">
                      {previewVisual.tier}
                    </span>
                    <p className="truncate text-lg font-bold text-foreground">
                      {roleName.trim().toUpperCase() || "TEN_VAI_TRO"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {details.trim() ||
                    "Mô tả chi tiết phạm vi quyền hạn sẽ hiển thị tại đây..."}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-success-foreground">
                  <CheckCircle2 size={13} animated={false} />
                  Sẵn sàng gắn cho thành viên ngay sau khi tạo
                </div>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
