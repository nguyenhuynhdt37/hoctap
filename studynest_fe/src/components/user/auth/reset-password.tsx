"use client";

import AuthShell, {
  AuthInput,
  PasswordToggle,
  authLinkClass,
  authSubmitClass,
} from "@/components/user/auth/AuthShell";
import { Alert, Button } from "@/components/ui";
import { postAuthSession } from "@/lib/auth/login";
import api from "@/lib/utils/fetcher/client/axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Key,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "pulsoicon-react";

function extractErrorMessage(err: unknown, fallback: string): string {
  const detail = (
    err as {
      response?: { data?: { detail?: string | { message?: string } } };
    }
  )?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (
    detail &&
    typeof detail === "object" &&
    typeof detail.message === "string" &&
    detail.message.trim()
  ) {
    return detail.message;
  }
  return fallback;
}

function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  barClass: string;
} {
  if (!pw) return { score: 0, label: "", barClass: "bg-border" };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) {
    return { score: 1, label: "Yếu (nên từ 8+ ký tự)", barClass: "bg-destructive" };
  }
  if (score === 2) {
    return { score: 2, label: "Trung bình", barClass: "bg-warning-foreground" };
  }
  if (score === 3) {
    return { score: 3, label: "Khá mạnh", barClass: "bg-primary" };
  }
  return { score: 4, label: "Rất mạnh", barClass: "bg-success" };
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState(
    (searchParams.get("code") || "").replace(/\D/g, "").slice(0, 6),
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    code?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const strength = useMemo(
    () => getPasswordStrength(newPassword),
    [newPassword],
  );

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = "Vui lòng nhập email hợp lệ.";
    }
    if (code.trim().length < 6) {
      errs.code = "Vui lòng nhập đủ 6 chữ số xác thực từ Email.";
    }
    if (newPassword.length < 6) {
      errs.newPassword = "Mật khẩu mới cần tối thiểu 6 ký tự.";
    }
    if (confirmPassword !== newPassword) {
      errs.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await api.post("/auth/reset-password", {
        email: cleanEmail,
        code: code.trim(),
        new_password: newPassword,
      });
      // Tự động đăng nhập thẳng bằng mật khẩu mới
      try {
        await postAuthSession("/auth/login", {
          email: cleanEmail,
          password: newPassword,
        });
        setSuccessMsg(
          "Đặt lại mật khẩu thành công! Đang tự động đăng nhập vào hệ thống...",
        );
        setTimeout(() => {
          router.replace("/");
          router.refresh();
        }, 700);
        return;
      } catch {
        setSuccessMsg(
          res.data?.message ||
            "Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.",
        );
      }
    } catch (err: unknown) {
      setApiError(
        extractErrorMessage(
          err,
          "Mã xác thực không đúng hoặc đã hết hạn. Vui lòng yêu cầu mã mới.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      screen="reset"
      title="Đặt lại mật khẩu mới"
      description="Nhập mã xác thực 6 chữ số từ hộp thư Email và tạo mật khẩu mới cho tài khoản Mây Mây của bạn."
    >
      <div className="space-y-5">
        {apiError && (
          <Alert variant="destructive" title="Không thể đặt lại mật khẩu">
            {apiError}
          </Alert>
        )}

        {successMsg ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-success-border bg-success-bg/75 p-4 text-sm text-success-foreground">
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  size={18}
                  animated={false}
                  className="mt-0.5 shrink-0"
                />
                <div className="space-y-1">
                  <p className="font-bold">Đổi mật khẩu thành công!</p>
                  <p className="text-xs leading-relaxed opacity-90">
                    {successMsg}
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              fullWidth
              className={authSubmitClass}
              rightIcon={<ArrowRight size={17} />}
              onClick={() => router.push("/login")}
            >
              Đăng nhập ngay
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AuthInput
              id="reset-email"
              type="email"
              label="Địa chỉ Email"
              placeholder="ban@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((p) => ({ ...p, email: undefined }));
                }
              }}
              error={fieldErrors.email}
              leftIcon={<Mail size={17} animated={false} />}
              required
            />

            <AuthInput
              id="reset-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              label="Mã xác thực 6 chữ số"
              placeholder="000000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (fieldErrors.code) {
                  setFieldErrors((p) => ({ ...p, code: undefined }));
                }
              }}
              error={fieldErrors.code}
              leftIcon={<Key size={17} animated={false} />}
              className="font-mono tracking-[0.25em]"
              required
            />

            <div className="space-y-1.5">
              <AuthInput
                id="reset-new-password"
                type={showNew ? "text" : "password"}
                label="Mật khẩu mới"
                placeholder="Tối thiểu 6 ký tự"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword) {
                    setFieldErrors((p) => ({ ...p, newPassword: undefined }));
                  }
                }}
                error={fieldErrors.newPassword}
                leftIcon={<LockKeyhole size={17} animated={false} />}
                rightIcon={
                  <PasswordToggle
                    visible={showNew}
                    label={showNew ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
                    onClick={() => setShowNew((v) => !v)}
                  />
                }
                required
              />

              {newPassword && (
                <div className="space-y-1 px-1">
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1.5 rounded-full transition-colors ${
                          strength.score >= lvl
                            ? strength.barClass
                            : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Độ mạnh: <strong>{strength.label}</strong>
                  </p>
                </div>
              )}
            </div>

            <AuthInput
              id="reset-confirm-password"
              type={showConfirm ? "text" : "password"}
              label="Nhập lại mật khẩu mới"
              placeholder="Khớp với mật khẩu mới"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((p) => ({
                    ...p,
                    confirmPassword: undefined,
                  }));
                }
              }}
              error={fieldErrors.confirmPassword}
              leftIcon={<ShieldCheck size={17} animated={false} />}
              rightIcon={
                <PasswordToggle
                  visible={showConfirm}
                  label={
                    showConfirm
                      ? "Ẩn mật khẩu xác nhận"
                      : "Hiện mật khẩu xác nhận"
                  }
                  onClick={() => setShowConfirm((v) => !v)}
                />
              }
              required
            />

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={submitting}
              loadingText="Đang cập nhật mật khẩu..."
              className={authSubmitClass}
              rightIcon={<ArrowRight size={17} />}
            >
              Xác nhận đổi mật khẩu
            </Button>
          </form>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs">
          <Link href="/forgot-password" className={authLinkClass}>
            Gửi lại mã mới
          </Link>
          <Link href="/login" className={`${authLinkClass} gap-1`}>
            <ArrowLeft size={14} animated={false} />
            Đăng nhập
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">
          Đang tải trang đặt lại mật khẩu...
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
