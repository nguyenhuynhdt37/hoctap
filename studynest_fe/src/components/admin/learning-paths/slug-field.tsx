"use client";
import { Input } from "@/components/ui";
function preview(title: string) {
  return title
    .toLowerCase()
    .replaceAll("đ", "d")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}
export default function SlugField({
  title,
  value,
  prefix,
  locked,
  onChange,
}: {
  title: string;
  value: string;
  prefix: string;
  locked?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        label="Đường dẫn"
        value={value}
        readOnly={locked}
        maxLength={180}
        placeholder={preview(title) || "Tự tạo từ tên"}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="break-all text-xs text-muted-foreground">
        {prefix}
        {value || preview(title) || "…"}
      </p>
      <p className="text-xs text-muted-foreground">
        {locked
          ? "Đường dẫn được giữ ổn định giữa các phiên bản."
          : "Để trống để tự tạo. Nếu trùng, hệ thống tự thêm 8 ký tự UUID khi lưu."}
      </p>
    </div>
  );
}
