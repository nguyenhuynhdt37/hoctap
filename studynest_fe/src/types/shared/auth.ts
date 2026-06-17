// Auth API Types

export type LoginErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_DELETED"
  | "ACCOUNT_BANNED_TEMPORARY"
  | "ACCOUNT_BANNED_PERMANENT";

export interface LoginErrorDetail {
  error_code: LoginErrorCode;
  message: string;
  // Optional fields based on error type
  email?: string; // EMAIL_NOT_VERIFIED
  deleted_at?: string; // ACCOUNT_DELETED
  reason?: string; // DELETED, BANNED_*
  banned_until?: string | null; // BANNED_*
  is_permanent?: boolean; // BANNED_*
}

export interface LoginErrorResponse {
  detail: LoginErrorDetail;
}

// Helper function to check if error has valid error_code
export function isLoginErrorDetail(detail: any): detail is LoginErrorDetail {
  return (
    detail &&
    typeof detail === "object" &&
    "error_code" in detail &&
    typeof detail.error_code === "string"
  );
}

// Helper function to format date
export function formatBanDate(dateString: string | null | undefined): string {
  if (!dateString) return "Không xác định";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

// Helper function to calculate remaining time in milliseconds
export function calculateRemainingMs(bannedUntil: string): number {
  const banDate = new Date(bannedUntil);
  const now = new Date();
  return banDate.getTime() - now.getTime();
}

// Helper function to format remaining time với đầy đủ ngày/giờ/phút/giây
export function formatRemainingTime(diffMs: number): string {
  if (diffMs <= 0) return "đã hết hạn";

  const seconds = Math.floor(diffMs / 1000) % 60;
  const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
  const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} giây`);

  return `còn ${parts.join(" ")}`;
}
