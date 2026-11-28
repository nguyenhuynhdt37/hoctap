"use client";

import { Alert } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "pulsoicon-react";
import { useMemo, useState } from "react";

function evaluatePasswordStrength(password: string): {
  score: number;
  label: string;
  barClass: string;
  textClass: string;
} {
  if (!password) {
    return { score: 0, label: "", barClass: "bg-border", textClass: "text-muted-foreground" };
  }
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { score: 1, label: "Yếu", barClass: "bg-destructive-foreground", textClass: "text-destructive-foreground" };
  }
  if (score === 2) {
    return { score: 2, label: "Trung bình", barClass: "bg-warning-foreground", textClass: "text-warning-foreground" };
  }
  if (score === 3) {
    return { score: 3, label: "Khá mạnh", barClass: "bg-primary", textClass: "text-primary" };
  }
  return { score: 4, label: "Mạnh", barClass: "bg-success-foreground", textClass: "text-success-foreground" };
}

function extractErrorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    const msg = (detail as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (Array.isArray(detail) && detail[0]?.msg) {
    return String(detail[0].msg);
  }
  return "Không thể đổi mật khẩu lúc này. Vui lòng thử lại.";
}

export default function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoutOtherSessions, setLogoutOtherSessions] = useState(true);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const strength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);

  const confirmError =
    confirmPassword && newPassword !== confirmPassword
      ? "Mật khẩu xác nhận chưa khớp."
      : undefined;

  const newPasswordError =
    newPassword && newPassword.length < 6
      ? "Mật khẩu mới cần tối thiểu 6 ký tự."
      : newPassword && currentPassword && newPassword === currentPassword
        ? "Mật khẩu mới phải khác mật khẩu hiện tại."
        : undefined;

  const canSubmit =
    Boolean(currentPassword.trim()) &&
    newPassword.length >= 6 &&
    newPassword.length <= 72 &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword &&
    !saving;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data } = await api.post<{ message?: string }>("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
        logout_other_sessions: logoutOtherSessions,
      });
      const msg = data?.message || "Đổi mật khẩu thành công!";
      setSuccess(msg);
      showToast.success(msg);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      showToast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="profile-security" className="scroll-mt-24">
      <Card density="none">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-primary-pastel bg-primary-light text-primary">
                <KeyRound className="size-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Bảo mật &amp; Đổi mật khẩu</CardTitle>
                <CardDescription>
                  Cập nhật mật khẩu định kỳ để bảo vệ tài khoản học tập của bạn.
                </CardDescription>
              </div>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full border border-success-border bg-success-bg px-3 py-1 text-xs font-semibold text-success-foreground sm:inline-flex">
              <ShieldCheck className="size-3.5" animated={false} aria-hidden="true" />
              Bảo vệ phiên đăng nhập
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            {error && <Alert variant="destructive" title={error} />}
            {success && <Alert variant="success" title={success} />}

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Mật khẩu hiện tại"
                type={showCurrent ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Nhập mật khẩu hiện tại"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setError(null);
                }}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    aria-label={showCurrent ? "Ẩn mật khẩu hiện tại" : "Hiện mật khẩu hiện tại"}
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                  >
                    {showCurrent ? (
                      <EyeOff className="size-4" animated={false} aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" animated={false} aria-hidden="true" />
                    )}
                  </button>
                }
              />

              <div className="space-y-2">
                <Input
                  label="Mật khẩu mới"
                  type={showNew ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  error={newPasswordError}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setError(null);
                  }}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowNew((prev) => !prev)}
                      aria-label={showNew ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
                      className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                    >
                      {showNew ? (
                        <EyeOff className="size-4" animated={false} aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" animated={false} aria-hidden="true" />
                      )}
                    </button>
                  }
                />
                {newPassword && (
                  <div className="space-y-1">
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={`h-1.5 rounded-full transition-colors ${
                            step <= strength.score ? strength.barClass : "bg-primary-light"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-semibold ${strength.textClass}`}>
                      Độ mạnh mật khẩu: {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <Input
                label="Xác nhận mật khẩu mới"
                type={showConfirm ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                error={confirmError}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError(null);
                }}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? "Ẩn xác nhận mật khẩu" : "Hiện xác nhận mật khẩu"}
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" animated={false} aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" animated={false} aria-hidden="true" />
                    )}
                  </button>
                }
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-primary-light/40 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={logoutOtherSessions}
                  onChange={(event) => setLogoutOtherSessions(event.target.checked)}
                  className="size-4 rounded border-primary-pastel accent-primary"
                />
                <span>Đăng xuất khỏi các thiết bị khác (giữ nguyên phiên hiện tại)</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Quên mật khẩu / Tài khoản Google, GitHub?
              </Link>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!canSubmit}
                isLoading={saving}
                loadingText="Đang cập nhật..."
              >
                Đổi mật khẩu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
