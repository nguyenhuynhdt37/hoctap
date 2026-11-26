"use client";

import AuthShell, {
  AuthInput,
  authLinkClass,
  authSubmitClass,
} from "@/components/user/auth/AuthShell";
import { Alert, Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  RefreshCw,
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

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const validateEmail = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "Vui lòng nhập địa chỉ email của bạn.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Địa chỉ email không đúng định dạng.";
    }
    return "";
  };

  async function requestReset(targetEmail: string) {
    setApiError("");
    setSubmitting(true);
    try {
      const res = await api.post("/auth/forgot-password", {
        email: targetEmail.trim().toLowerCase(),
      });
      setSentMessage(
        res.data?.message ||
          "Nếu địa chỉ email tồn tại trong hệ thống, chúng tôi đã gửi mã xác thực và liên kết đặt lại mật khẩu tới hộp thư của bạn.",
      );
      setCooldown(Number(res.data?.resend_cooldown_seconds) || 60);
    } catch (err: unknown) {
      setApiError(
        extractErrorMessage(
          err,
          "Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau ít phút.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errMsg = validateEmail(email);
    setEmailError(errMsg);
    if (errMsg) return;
    await requestReset(email);
  }

  return (
    <AuthShell
      screen="forgot"
      title="Quên mật khẩu?"
      description="Nhập email bạn đã dùng đăng ký Mây Mây. Chúng tôi sẽ gửi mã xác thực 6 chữ số cùng liên kết đặt lại mật khẩu an toàn."
    >
      <div className="space-y-5">
        {apiError && (
          <Alert variant="destructive" title="Không thể gửi yêu cầu">
            {apiError}
          </Alert>
        )}

        {!sentMessage ? (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AuthInput
              id="forgot-email"
              type="email"
              label="Địa chỉ Email"
              placeholder="ban@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              error={emailError}
              leftIcon={<Mail size={17} animated={false} />}
              required
            />

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={submitting}
              loadingText="Đang gửi hướng dẫn..."
              className={authSubmitClass}
              rightIcon={<ArrowRight size={17} />}
            >
              Gửi mã đặt lại mật khẩu
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-success-border bg-success-bg/70 p-4 text-sm text-success-foreground">
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  size={18}
                  animated={false}
                  className="mt-0.5 shrink-0"
                />
                <div className="space-y-1">
                  <p className="font-bold">Đã gửi hướng dẫn khôi phục!</p>
                  <p className="text-xs leading-relaxed opacity-90">
                    {sentMessage}
                  </p>
                  <p className="text-xs leading-relaxed opacity-85">
                    Kiểm tra hộp thư{" "}
                    <strong className="font-semibold">{email.trim()}</strong>{" "}
                    (kể cả mục Spam / Quảng cáo). Mã có hiệu lực trong{" "}
                    <strong>15 phút</strong>.
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
              onClick={() =>
                router.push(
                  `/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`,
                )
              }
            >
              Nhập mã 6 số &amp; Đặt lại mật khẩu
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <button
                type="button"
                disabled={submitting || cooldown > 0}
                onClick={() => void requestReset(email)}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
                  animated={false}
                  className={submitting ? "animate-spin" : ""}
                />
                {cooldown > 0
                  ? `Gửi lại email sau ${cooldown}s`
                  : "Chưa nhận được? Gửi lại email"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSentMessage(null);
                  setApiError("");
                }}
                className="font-semibold text-muted-foreground hover:text-foreground"
              >
                Đổi email khác
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-border/70 pt-3 text-center">
          <Link href="/login" className={`${authLinkClass} gap-1.5 text-sm`}>
            <ArrowLeft size={15} animated={false} />
            Quay lại trang Đăng nhập
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
