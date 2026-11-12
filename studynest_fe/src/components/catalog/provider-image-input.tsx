"use client";

import { prepareImageUpload } from "@/lib/prepare-image-upload";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { providerError } from "./provider-utils";

export default function ProviderImageInput({
  kind,
  value,
  onChange,
  onBusy,
  disabled,
}: {
  kind: "avatar" | "banner";
  value: string | null;
  onChange: (url: string | null) => void;
  onBusy: (busy: boolean) => void;
  disabled: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const label = kind === "avatar" ? "Ảnh đại diện đơn vị" : "Ảnh bìa đơn vị";
  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-border p-4">
      {value && (
        <img
          src={value}
          alt={label}
          className={
            kind === "avatar"
              ? "h-20 w-20 rounded-2xl border border-border object-contain"
              : "h-28 w-full rounded-xl object-cover"
          }
        />
      )}
      <Input
        type="file"
        label={label}
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || uploading}
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            toast.error("Ảnh tối đa 5 MB");
            input.value = "";
            return;
          }
          setUploading(true);
          onBusy(true);
          try {
            const payload = new FormData();
            payload.append(
              "file",
              await prepareImageUpload(file, kind === "avatar" ? "providerLogo" : "providerBanner"),
            );
            const { data } = await api.post(
              `/admin/providers/assets/${kind}`,
              payload,
              { headers: { "Content-Type": "multipart/form-data" } },
            );
            onChange(data.url);
            toast.success("Đã tải ảnh lên kho lưu trữ");
          } catch (error) {
            toast.error(
              providerError(error, "Không tải được ảnh. Vui lòng thử lại."),
            );
          } finally {
            setUploading(false);
            onBusy(false);
            input.value = "";
          }
        }}
      />
      <p className="text-xs text-muted-foreground" role="status">
        {uploading
          ? "Đang tải ảnh…"
          : "JPEG, PNG hoặc WebP · tối đa 5 MB. Logo tự chuẩn hóa 512×512, giữ tỉ lệ. Bấm Lưu đơn vị để áp dụng."}
      </p>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => onChange(null)}
        >
          Gỡ ảnh
        </Button>
      )}
    </div>
  );
}
