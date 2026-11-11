"use client";
import { useState, type FormEvent } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import api from "@/lib/utils/fetcher/client/axios";
import { Button, Input } from "@/components/ui";
import type { Provider } from "@/types/catalog";
import { selectClass } from "./course-taxonomy-form";
export default function ProviderEditor({
  admin = false,
  value,
  onSaved,
  onCancel,
}: {
  admin?: boolean;
  value: Partial<Provider>;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const f = new FormData(event.currentTarget);
    const payload = {
      name: String(f.get("name")),
      slug: String(f.get("slug")),
      provider_type: String(f.get("provider_type")),
      description: String(f.get("description")),
      logo_url: String(f.get("logo_url") ?? "") || null,
      banner_url: String(f.get("banner_url") ?? "") || null,
      ...(admin
        ? {
            verification_status: String(f.get("verification_status")),
            is_active: f.get("is_active") === "on",
          }
        : {}),
    };
    try {
      const url = `/${admin ? "admin" : "lecturer"}/providers${value.id ? `/${value.id}` : ""}`;
      if (value.id) await api.put(url, payload);
      else await api.post(url, payload);
      toast.success("Đã lưu đơn vị");
      onSaved();
    } catch (error) {
      toast.error(
        axios.isAxiosError(error) &&
          typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "Không lưu được đơn vị",
      );
    } finally {
      setBusy(false);
    }
  }
  async function member(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const f = new FormData(event.currentTarget);
    try {
      await api.put(`/providers/${value.id}/members`, {
        user_id: String(f.get("user_id")),
        role: String(f.get("role")),
        status: String(f.get("status")),
      });
      toast.success("Đã cập nhật thành viên");
    } catch (error) {
      toast.error(
        axios.isAxiosError(error) &&
          typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "Không cập nhật được thành viên",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 text-foreground">
      <h2 className="text-lg font-semibold">
        {value.id ? "Quản lý đơn vị" : "Tạo đơn vị cung cấp"}
      </h2>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label="Tên đơn vị"
          required
          minLength={2}
          maxLength={160}
          defaultValue={value.name}
        />
        <Input
          name="slug"
          label="Đường dẫn · trống để tự tạo"
          readOnly={!!value.id}
          defaultValue={value.slug}
        />
        <label className="space-y-2">
          <span>Loại đơn vị</span>
          <select
            className={selectClass}
            name="provider_type"
            defaultValue={value.provider_type ?? "individual"}
          >
            <option value="individual">Giáo viên độc lập</option>
            <option value="center">Trung tâm giáo dục</option>
            <option value="exam_center">Trung tâm luyện thi</option>
            <option value="organization">Đơn vị đào tạo</option>
          </select>
        </label>
        <Input
          name="description"
          label="Giới thiệu"
          maxLength={10000}
          defaultValue={value.description ?? ""}
        />
        <Input
          name="logo_url"
          label="Logo từ kho file Mây Mây"
          defaultValue={value.logo_url ?? ""}
        />
        <Input
          name="banner_url"
          label="Banner từ kho file Mây Mây"
          defaultValue={value.banner_url ?? ""}
        />
        {admin && (
          <>
            <label className="space-y-2">
              <span>Xác minh</span>
              <select
                className={selectClass}
                name="verification_status"
                defaultValue={value.verification_status ?? "pending"}
              >
                <option value="pending">Chờ xác minh</option>
                <option value="verified">Đã xác minh</option>
                <option value="rejected">Từ chối</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={value.is_active ?? true}
              />
              Hoạt động
            </label>
          </>
        )}
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Xác minh thông tin không tự kích hoạt chi trả cho tổ chức. Doanh thu
          hiện vẫn theo giảng viên của khóa học.
        </p>
        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit" disabled={busy}>
            Lưu đơn vị
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Đóng
          </Button>
        </div>
      </form>
      {value.id && (
        <form
          onSubmit={member}
          className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">
            Cấp hoặc thu hồi quyền thành viên
          </h3>
          <Input name="user_id" label="ID tài khoản" required />
          <label className="space-y-2">
            <span>Vai trò</span>
            <select name="role" className={selectClass}>
              {[
                ["instructor", "Giáo viên"],
                ["editor", "Biên tập viên"],
                ["manager", "Quản lý"],
                ["owner", "Chủ sở hữu"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span>Trạng thái</span>
            <select name="status" className={selectClass}>
              <option value="active">Hoạt động</option>
              <option value="inactive">Thu hồi</option>
            </select>
          </label>
          <Button type="submit" disabled={busy}>
            Cập nhật quyền
          </Button>
        </form>
      )}
    </section>
  );
}
