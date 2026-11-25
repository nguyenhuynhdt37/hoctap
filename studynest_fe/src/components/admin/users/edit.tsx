"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { ArrowLeft, Mail, Save, UserCheck } from "pulsoicon-react";
import { Button, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { UserDetailResponse } from "@/types/admin/user-detail";
import { getRoleBadge } from "./user-visuals";

interface EditUserProps {
  userId: string;
}

export default function EditUser({ userId }: EditUserProps) {
  const router = useRouter();
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<UserDetailResponse>(
    `/admin/users/${userId}`,
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (data?.profile) {
      setFullname(data.profile.fullname || "");
      setEmail(data.profile.email || "");
    }
  }, [data]);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isDirty = Boolean(
    data?.profile &&
      (fullname.trim() !== (data.profile.fullname || "") ||
        email.trim() !== data.profile.email),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmailValid) {
      toast.error("Địa chỉ email không đúng định dạng.");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/users/${userId}`, {
        fullname: fullname.trim() || null,
        email: email.trim(),
      });
      await mutate();
      toast.success("Đã cập nhật thông tin thành viên!");
      router.push(`/admin/users/${userId}`);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể cập nhật thông tin người dùng.";
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="h-64 animate-pulse rounded-3xl border border-border bg-surface" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="rounded-3xl border border-destructive-border bg-destructive-bg p-6 text-sm text-destructive-foreground">
          Không tải được dữ liệu người dùng.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      <div>
        <Link
          href={`/admin/users/${userId}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
        >
          <ArrowLeft size={13} />
          Quay lại hồ sơ 360°
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Chỉnh sửa Hồ sơ Thành viên
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <section className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)] lg:col-span-7">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <UserCheck size={17} className="text-primary" />
            Thông tin Định danh
          </h2>

          <Input
            label="Họ và tên"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            placeholder="Nhập họ tên thành viên"
          />

          <Input
            label="Địa chỉ Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={
              email && !isEmailValid
                ? "Email không đúng định dạng hợp lệ"
                : undefined
            }
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/users/${userId}`)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={saving || !isDirty || !isEmailValid}
            >
              <Save size={15} />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </section>

        {/* Live Identity Preview */}
        <aside className="rounded-3xl border border-primary-pastel/75 bg-primary-light/35 p-6 lg:col-span-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
            Xem trước Thẻ Thành viên
          </p>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light text-lg font-bold text-primary">
                {(fullname || email || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">
                  {fullname.trim() || "Chưa đặt tên"}
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Mail size={11} animated={false} />
                  {email.trim() || "email@example.com"}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.roles.map((r) => {
                const rb = getRoleBadge(r);
                return (
                  <span
                    key={r}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${rb.cls}`}
                  >
                    {rb.label}
                  </span>
                );
              })}
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
