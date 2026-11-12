"use client";
import { useState, type FormEvent } from "react";
import { Alert, Button, Input, Modal, Select, Textarea } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import { providerTypeLabels, type ProviderRequest } from "@/types/provider";
import { providerError } from "./provider-utils";

export default function ProviderRequestForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (request: ProviderRequest) => void;
}) {
  const email = useUserStore((s) => s.user?.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const fields = Object.fromEntries(
      ["name", "provider_type", "description", "contact_email", "reason"].map(
        (key) => [key, String(form.get(key) || "").trim()],
      ),
    );
    setBusy(true);
    setError("");
    try {
      const response = await api.post<ProviderRequest>(
        "/lecturer/provider-requests",
        {
          ...fields,
          website_url: String(form.get("website_url") || "").trim() || null,
        },
      );
      onCreated(response.data);
    } catch (error) {
      setError(providerError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Yêu cầu tạo đơn vị cung cấp"
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tra cứu danh sách trước khi gửi. Admin sẽ kiểm tra thông tin; đơn vị
          chỉ xuất hiện sau khi được duyệt.
        </p>
        {error && (
          <Alert variant="destructive" title="Chưa gửi được yêu cầu">
            {error}
          </Alert>
        )}
        <Input
          name="name"
          label="Tên đầy đủ của đơn vị"
          required
          minLength={2}
          maxLength={160}
          disabled={busy}
        />
        <Select
          name="provider_type"
          label="Loại đơn vị"
          defaultValue="center"
          disabled={busy}
        >
          {Object.entries(providerTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Textarea
          name="description"
          label="Giới thiệu đơn vị"
          required
          minLength={10}
          maxLength={10000}
          rows={4}
          disabled={busy}
          hint="Lĩnh vực giảng dạy, địa chỉ và thông tin giúp xác định đúng đơn vị."
        />
        <Input
          name="contact_email"
          type="email"
          label="Email liên hệ"
          required
          maxLength={320}
          defaultValue={email}
          disabled={busy}
        />
        <Input
          name="website_url"
          type="url"
          label="Website hoặc liên kết minh chứng (tùy chọn)"
          maxLength={2048}
          disabled={busy}
          placeholder="https://..."
        />
        <Textarea
          name="reason"
          label="Lý do đề nghị tạo đơn vị"
          required
          minLength={10}
          maxLength={2000}
          rows={3}
          disabled={busy}
          hint="Nêu mối liên hệ của bạn với đơn vị để admin xác minh."
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button type="submit" isLoading={busy} loadingText="Đang gửi…">
            Gửi yêu cầu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
