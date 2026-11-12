import type { Provider } from "./catalog";
export type ProviderRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";
export interface ProviderRequest {
  id: string;
  requester_id: string;
  name: string;
  provider_type: Provider["provider_type"];
  description: string;
  contact_email: string;
  website_url: string | null;
  reason: string;
  status: ProviderRequestStatus;
  created_at: string;
  decided_at: string | null;
  review_note: string | null;
  provider_id: string | null;
  requester: { id: string; fullname: string };
  reviewer: { id: string; fullname: string } | null;
  provider: { id: string; name: string; slug: string } | null;
}
export interface ProviderPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
export const providerTypeLabels: Record<Provider["provider_type"], string> = {
  school: "Trường THPT",
  individual: "Giáo viên độc lập",
  center: "Trung tâm giáo dục",
  exam_center: "Trung tâm luyện thi",
  organization: "Tổ chức giáo dục",
};
export const requestStatusLabels: Record<ProviderRequestStatus, string> = {
  pending: "Chờ xét duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
};
