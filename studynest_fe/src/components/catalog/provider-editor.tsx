"use client";
import { useState, type FormEvent } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import api from "@/lib/utils/fetcher/client/axios";
import { Button, Input } from "@/components/ui";
import type { Provider } from "@/types/catalog";
import ProviderImageInput from "./provider-image-input";
import ProviderMembers from "./provider-members";
import { selectClass } from "./course-taxonomy-form";
export default function ProviderEditor({
  admin = true,
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
  const [uploading, setUploading] = useState(false);
  const [logo, setLogo] = useState(value.logo_url ?? null);
  const [banner, setBanner] = useState(value.banner_url ?? null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || busy) return;
    setBusy(true);
    const f = new FormData(event.currentTarget);
    const payload = {
      name: String(f.get("name")),
      slug: String(f.get("slug")),
      provider_type: String(f.get("provider_type")),
      description: String(f.get("description")),
      logo_url: logo,
      banner_url: banner,
      province: String(f.get("province") ?? "") || null,
      address: String(f.get("address") ?? "") || null,
      website_url: String(f.get("website_url") ?? "") || null,
      ...(admin
        ? {
            verification_status: "verified",
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
            defaultValue={value.provider_type ?? "center"}
          >
            <option value="school">Trường THPT</option>
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
          name="province"
          label="Tỉnh / thành phố"
          maxLength={160}
          defaultValue={value.province ?? ""}
        />
        <Input
          name="address"
          label="Địa chỉ"
          maxLength={2000}
          defaultValue={value.address ?? ""}
        />
        <Input
          name="website_url"
          type="url"
          label="Website chính thức"
          maxLength={2048}
          defaultValue={value.website_url ?? ""}
        />
        {value.school_code && (
          <p className="text-sm text-muted-foreground">
            Mã trường: {value.province_code} · {value.school_code}
          </p>
        )}
        {value.source_url && (
          <p className="break-words text-sm text-muted-foreground sm:col-span-2">
            Nguồn danh mục:{" "}
            <a
              className="text-primary underline"
              href={value.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Xem bản công bố
            </a>
            . Admin có thể đối chiếu nguồn khi cập nhật thông tin.
          </p>
        )}
        <ProviderImageInput
          kind="avatar"
          value={logo}
          onChange={setLogo}
          onBusy={setUploading}
          disabled={busy || uploading}
        />
        <ProviderImageInput
          kind="banner"
          value={banner}
          onChange={setBanner}
          onBusy={setUploading}
          disabled={busy || uploading}
        />
        {admin && (
          <>
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
          Liên kết đơn vị không tự kích hoạt chi trả cho tổ chức. Doanh thu
          hiện vẫn theo giảng viên của khóa học.
        </p>
        <div className="flex gap-3 sm:col-span-2">
          <Button
            type="submit"
            disabled={uploading}
            isLoading={busy}
            loadingText="Đang lưu…"
          >
            Lưu đơn vị
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || uploading}
            onClick={onCancel}
          >
            Đóng
          </Button>
        </div>
      </form>
      {value.id && admin && <ProviderMembers providerId={value.id} />}
    </section>
  );
}
