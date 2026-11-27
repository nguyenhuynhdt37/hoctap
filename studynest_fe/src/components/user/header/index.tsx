"use client";

/**
 * Header duy nhất của khu vực người dùng: logo, điều hướng chính, tìm kiếm,
 * thông báo, avatar và bảng "Tiện ích". Mọi trang dùng chung một header để
 * vị trí và kích thước không đổi khi chuyển trang.
 * Mọi lối đi đọc từ `@/lib/navigation/user-nav`.
 */
import FlatHeader from "./flat-header";

export default function Header() {
  return <FlatHeader />;
}
