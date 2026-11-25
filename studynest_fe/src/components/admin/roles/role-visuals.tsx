"use client";

import { Crown, GraduationCap, ShieldCheck, Users } from "pulsoicon-react";
import type { Role } from "@/types/admin/role";

export const SYSTEM_CORE_ROLES = new Set(["ADMIN", "LECTURER", "USER"]);

export interface RoleVisualConfig {
  label: string;
  tier: string;
  softBg: string;
  border: string;
  text: string;
  barClass: string;
  badgeClass: string;
  capabilities: string[];
}

export const ROLE_VISUAL_MAP: Record<string, RoleVisualConfig> = {
  ADMIN: {
    label: "Quản trị viên Hệ thống",
    tier: "Tầng Điều hành Tối cao",
    softBg: "bg-accent/55",
    border: "border-accent-border",
    text: "text-accent-foreground",
    barClass: "bg-accent-border",
    badgeClass: "border-accent-border bg-accent text-accent-foreground",
    capabilities: [
      "Toàn quyền hệ thống",
      "Kho bạc & Đối soát",
      "Cấu hình AI 9Router",
      "Phân xử Hoàn tiền & Rút tiền",
    ],
  },
  LECTURER: {
    label: "Giảng viên & Đối tác",
    tier: "Tầng Sáng tạo Học liệu",
    softBg: "bg-accent-vanilla/60",
    border: "border-accent-vanilla-border",
    text: "text-accent-vanilla-foreground",
    barClass: "bg-accent-vanilla-border",
    badgeClass:
      "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
    capabilities: [
      "Tạo & Xuất bản Khóa học",
      "Studio Listening / Speaking AI",
      "Quản lý Mã giảm giá riêng",
      "Yêu cầu rút doanh thu",
    ],
  },
  USER: {
    label: "Học viên Mây Mây",
    tier: "Tầng Học tập Cộng đồng",
    softBg: "bg-primary-light/75",
    border: "border-primary-pastel",
    text: "text-primary",
    barClass: "bg-primary",
    badgeClass: "border-primary-pastel bg-primary-light text-primary",
    capabilities: [
      "Học Video, Quiz & Flashcard 3D",
      "Luyện nghe, Điền từ & Giao tiếp AI",
      "Ví Coin & Mua khóa học",
      "Bình luận, Ghi chú & Hỏi đáp",
    ],
  },
};

export function getRoleVisual(roleName: string): RoleVisualConfig {
  const key = (roleName || "").toUpperCase();
  return (
    ROLE_VISUAL_MAP[key] ?? {
      label: key || "Vai trò tùy chỉnh",
      tier: "Tầng Phân quyền Mở rộng",
      softBg: "bg-info-bg/70",
      border: "border-info-border",
      text: "text-info-foreground",
      barClass: "bg-info-border",
      badgeClass: "border-info-border bg-info-bg text-info-foreground",
      capabilities: [
        "Vai trò mở rộng do Admin định nghĩa",
        "Áp dụng linh hoạt theo nghiệp vụ",
      ],
    }
  );
}

export function RoleAvatarIcon({
  roleName,
  size = 20,
}: {
  roleName: string;
  size?: number;
}) {
  const key = (roleName || "").toUpperCase();
  if (key === "ADMIN") return <Crown size={size} aria-hidden="true" />;
  if (key === "LECTURER")
    return <GraduationCap size={size} aria-hidden="true" />;
  if (key === "USER") return <Users size={size} aria-hidden="true" />;
  return <ShieldCheck size={size} aria-hidden="true" />;
}

export const ROLE_PRESETS = [
  {
    role_name: "CONTENT_REVIEWER",
    details:
      "Kiểm duyệt viên học liệu, phụ trách rà soát chất lượng khóa học, bài giảng và nội dung tương tác trước khi xuất bản.",
  },
  {
    role_name: "FINANCE_AUDITOR",
    details:
      "Kiểm toán viên tài chính, theo dõi sổ cái ví nền tảng, đối soát giao dịch và hỗ trợ thẩm định yêu cầu hoàn/rút tiền.",
  },
  {
    role_name: "SUPPORT_AGENT",
    details:
      "Chuyên viên hỗ trợ học viên, tiếp nhận phản hồi, hướng dẫn sử dụng nền tảng và phối hợp xử lý khiếu nại.",
  },
  {
    role_name: "COMMUNITY_MOD",
    details:
      "Điều phối viên cộng đồng, quản lý thảo luận, hỏi đáp và duy trì môi trường học tập tích cực trên Mây Mây.",
  },
] as const;

export const CAPABILITY_MATRIX_ROWS = [
  {
    domain: "Quản trị Hệ thống & Cài đặt AI",
    ADMIN: "full",
    LECTURER: "none",
    USER: "none",
  },
  {
    domain: "Kho bạc Ví, Giao dịch & Đối soát",
    ADMIN: "full",
    LECTURER: "self",
    USER: "self",
  },
  {
    domain: "Phân xử Hoàn tiền & Duyệt Rút tiền",
    ADMIN: "full",
    LECTURER: "partial",
    USER: "none",
  },
  {
    domain: "Kiến trúc Catalog (Cấp học, Lớp × Môn)",
    ADMIN: "full",
    LECTURER: "read",
    USER: "read",
  },
  {
    domain: "Tạo Khóa học & Studio Listening/Speaking",
    ADMIN: "full",
    LECTURER: "full",
    USER: "none",
  },
  {
    domain: "Chiến dịch Voucher & Mã giảm giá",
    ADMIN: "full",
    LECTURER: "self",
    USER: "read",
  },
  {
    domain: "Học tập tương tác, Flashcard & AI Roleplay",
    ADMIN: "full",
    LECTURER: "full",
    USER: "full",
  },
] as const;

export function validateRoleNameCode(value: string): string | undefined {
  if (!value.trim()) return "Tên vai trò không được để trống";
  const vietnameseRegex =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  if (vietnameseRegex.test(value))
    return "Tên vai trò không được chứa dấu tiếng Việt";
  if (value.includes(" ")) return "Tên vai trò không được chứa khoảng trắng";
  if (/[^A-Z0-9_]/.test(value))
    return "Chỉ dùng chữ in hoa A–Z, số 0–9 và dấu gạch dưới (_)";
  return undefined;
}

export function exportRolesCsv(items: Role[]) {
  const header = ["Role ID", "Mã vai trò", "Mô tả", "Số thành viên"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(","),
    ...items.map((r) =>
      [r.id, r.role_name, r.details || "", String(r.total_users ?? 0)]
        .map(esc)
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `may-may-roles-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
