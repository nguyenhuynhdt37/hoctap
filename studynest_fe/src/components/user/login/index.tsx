"use client";

import AuthScenicLayout from "@/components/user/auth/auth-scenic-layout";
import GoogleSignInButton from "@/components/shared/google-sign-in-button";
import { Alert, Button, Card, Divider, Input, Modal } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import {
  calculateRemainingMs,
  formatBanDate,
  formatRemainingTime,
  isLoginErrorDetail,
  LoginErrorDetail,
} from "@/types/shared/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { HiEye, HiEyeOff } from "react-icons/hi";

// ============================================
// VALIDATION FUNCTIONS
// ============================================

const validateEmail = (
  email: string
): { isValid: boolean; message: string } => {
  if (!email.trim()) {
    return { isValid: false, message: "Email không được để trống" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Email không hợp lệ" };
  }
  return { isValid: true, message: "" };
};

const validatePassword = (
  password: string
): { isValid: boolean; message: string } => {
  if (!password.trim()) {
    return { isValid: false, message: "Mật khẩu không được để trống" };
  }
  if (password.length < 6) {
    return { isValid: false, message: "Mật khẩu phải có ít nhất 6 ký tự" };
  }
  return { isValid: true, message: "" };
};

// ============================================
// COUNTDOWN COMPONENT
// ============================================

const Countdown = ({ bannedUntil }: { bannedUntil: string }) => {
  const [remaining, setRemaining] = useState(() =>
    calculateRemainingMs(bannedUntil)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const newRemaining = calculateRemainingMs(bannedUntil);
      setRemaining(newRemaining);
      if (newRemaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [bannedUntil]);

  return (
    <span className="text-warning-foreground font-medium">
      ({formatRemainingTime(remaining)})
    </span>
  );
};

// ============================================
// DIALOG COMPONENT (Reusing Modal + Button from @/components/ui)
// ============================================

interface ErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  variant: "error" | "warning";
  actions?: { label: string; onClick: () => void }[];
}

const ErrorDialog = ({
  isOpen,
  onClose,
  title,
  content,
  variant,
  actions,
}: ErrorDialogProps) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Đóng
          </Button>
          {actions?.map((action, index) => (
            <Button
              key={index}
              variant={variant === "error" ? "destructive" : "primary"}
              onClick={action.onClick}
              className="flex-1"
            >
              {action.label}
            </Button>
          ))}
        </>
      }
    >
      <div className="text-sm text-foreground">{content}</div>
    </Modal>
  );
};

// ============================================
// LOGIN COMPONENT
// ============================================

const Login = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Dialog state
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    variant: "error" | "warning";
    actions?: { label: string; onClick: () => void }[];
  }>({
    isOpen: false,
    title: "",
    content: null,
    variant: "error",
    actions: [],
  });

  // ============================================
  // GOOGLE LOGIN
  // ============================================

  const handleGoogleCredentialResponse = useCallback(
    async (response: any) => {
      if (!response.credential) return;
      setIsGoogleLoading(true);
      setErrors((prev) => ({ ...prev, general: "" }));
      try {
        await api.post("/auth/google", { credential: response.credential });
        router.push(redirectUrl);
        router.refresh();
      } catch (error: any) {
        handleLoginError(error);
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [router, redirectUrl]
  );

  // ============================================
  // FORM HANDLERS
  // ============================================

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      const validation = validateEmail(value);
      setErrors((prev) => ({
        ...prev,
        email: validation.isValid ? "" : validation.message,
      }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      const validation = validatePassword(value);
      setErrors((prev) => ({
        ...prev,
        password: validation.isValid ? "" : validation.message,
      }));
    }
  };

  const handleBlur = (field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") {
      const validation = validateEmail(email);
      setErrors((prev) => ({
        ...prev,
        email: validation.isValid ? "" : validation.message,
      }));
    } else if (field === "password") {
      const { isValid, message } = validatePassword(password);
      if (!isValid) {
        setErrors((prev) => ({ ...prev, password: message }));
      }
    }
  };

  const validateForm = () => {
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const newErrors: typeof errors = {};
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.message;
    }
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.message;
    }
    setErrors(newErrors);
    return emailValidation.isValid && passwordValidation.isValid;
  };

  // ============================================
  // ERROR HANDLING
  // ============================================

  const handleLoginError = (error: any) => {
    const detail = error?.response?.data?.detail;

    if (isLoginErrorDetail(detail)) {
      handleErrorByCode(detail);
      return;
    }

    if (error?.status === 401 || error?.response?.status === 401) {
      const redirectParam =
        redirectUrl !== "/"
          ? `&redirect=${encodeURIComponent(redirectUrl)}`
          : "";
      router.push(
        "/email_authentication?email=" +
          encodeURIComponent(email) +
          redirectParam
      );
    } else if (error?.status === 404 || error?.response?.status === 404) {
      setErrors((prev) => ({
        ...prev,
        general: "Tài khoản hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.",
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        general:
          typeof detail === "string"
            ? detail
            : "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
      }));
    }
  };

  const handleErrorByCode = (detail: LoginErrorDetail) => {
    switch (detail.error_code) {
      case "INVALID_CREDENTIALS":
        setErrors((prev) => ({
          ...prev,
          general: detail.message || "Email hoặc mật khẩu không đúng",
        }));
        break;

      case "EMAIL_NOT_VERIFIED":
        if (detail.email) {
          localStorage.setItem("pending_verify_email", detail.email);
        }
        const redirectParam =
          redirectUrl !== "/"
            ? `&redirect=${encodeURIComponent(redirectUrl)}`
            : "";
        router.push(
          "/email_authentication?email=" +
            encodeURIComponent(detail.email || email) +
            redirectParam
        );
        break;

      case "ACCOUNT_DELETED":
        setDialogState({
          isOpen: true,
          title: "🚫 Tài khoản đã bị xóa",
          variant: "error",
          content: (
            <div className="space-y-3">
              <p>Tài khoản của bạn đã bị xóa khỏi hệ thống.</p>
              {detail.deleted_at && (
                <p>
                  <span className="font-medium">📅 Ngày xóa:</span>{" "}
                  {formatBanDate(detail.deleted_at)}
                </p>
              )}
              {detail.reason && (
                <p>
                  <span className="font-medium">📋 Lý do:</span> {detail.reason}
                </p>
              )}
              <p className="text-muted-foreground text-xs mt-2">
                Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ bộ phận hỗ
                trợ.
              </p>
            </div>
          ),
          actions: [
            {
              label: "Liên hệ Support",
              onClick: () => router.push("/support"),
            },
          ],
        });
        break;

      case "ACCOUNT_BANNED_TEMPORARY":
        setDialogState({
          isOpen: true,
          title: "⚠️ Tài khoản bị tạm khóa",
          variant: "warning",
          content: (
            <div className="space-y-3">
              <p>Tài khoản của bạn đang bị tạm khóa.</p>
              {detail.reason && (
                <p>
                  <span className="font-medium">📋 Lý do:</span> {detail.reason}
                </p>
              )}
              {detail.banned_until && (
                <p>
                  <span className="font-medium">⏰ Thời gian mở khóa:</span>{" "}
                  {formatBanDate(detail.banned_until)}{" "}
                  <Countdown bannedUntil={detail.banned_until} />
                </p>
              )}
              <p className="text-muted-foreground text-xs mt-2">
                Vui lòng đợi đến khi tài khoản được mở khóa hoặc liên hệ support
                nếu cần hỗ trợ.
              </p>
            </div>
          ),
          actions: [
            {
              label: "Liên hệ Support",
              onClick: () => router.push("/support"),
            },
          ],
        });
        break;

      case "ACCOUNT_BANNED_PERMANENT":
        setDialogState({
          isOpen: true,
          title: "🚫 Tài khoản bị khóa vĩnh viễn",
          variant: "error",
          content: (
            <div className="space-y-3">
              <p>Tài khoản của bạn đã bị khóa vĩnh viễn.</p>
              {detail.reason && (
                <p>
                  <span className="font-medium">📋 Lý do:</span> {detail.reason}
                </p>
              )}
              <p className="text-muted-foreground text-xs mt-2">
                Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ bộ phận hỗ
                trợ.
              </p>
            </div>
          ),
          actions: [
            {
              label: "Liên hệ Support",
              onClick: () => window.open("/support", "_blank"),
            },
          ],
        });
        break;

      default:
        setErrors((prev) => ({
          ...prev,
          general: detail.message || "Đã xảy ra lỗi, vui lòng thử lại",
        }));
    }
  };

  // ============================================
  // SUBMIT HANDLER
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setErrors((prev) => ({ ...prev, general: "" }));
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await api.post("/auth/login", { email, password });
      router.push(redirectUrl);
      router.refresh();
    } catch (error: any) {
      handleLoginError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      <AuthScenicLayout>
          <Card className="rounded-[24px] p-6 sm:p-8 space-y-5">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Đăng nhập
              </h1>
              <p className="text-muted-foreground text-sm">
                Chào mừng trở lại! Vui lòng đăng nhập vào tài khoản của bạn
              </p>
            </div>

            {/* Google Login */}
            <GoogleSignInButton
              onCredential={handleGoogleCredentialResponse}
              busy={isGoogleLoading}
            />

            {/* Divider */}
            <Divider label="HOẶC" />

            {/* Error Message */}
            {errors.general && (
              <Alert variant="destructive">{errors.general}</Alert>
            )}

            {/* Login Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                id="email"
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => handleBlur("email")}
                error={touched.email ? errors.email : undefined}
                placeholder="you@example.com"
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-foreground"
                  >
                    Mật khẩu
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:text-primary-hover font-medium"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => handleBlur("password")}
                  error={touched.password ? errors.password : undefined}
                  rightIcon={
                    <button
                      type="button"
                      className="text-subtle-foreground hover:text-foreground transition-colors cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                      }
                    >
                      {showPassword ? (
                        <HiEyeOff className="h-5 w-5" />
                      ) : (
                        <HiEye className="h-5 w-5" />
                      )}
                    </button>
                  }
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isGoogleLoading || !email || !password}
                isLoading={isLoading}
                loadingText="Đang đăng nhập..."
              >
                Đăng nhập
              </Button>
            </form>

            {/* Footer Link */}
            <div className="text-center text-sm text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link
                href="/register"
                className="text-primary hover:text-primary-hover font-semibold"
              >
                Đăng ký ngay
              </Link>
            </div>
          </Card>
      </AuthScenicLayout>

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        title={dialogState.title}
        content={dialogState.content}
        variant={dialogState.variant}
        actions={dialogState.actions}
      />
    </>
  );
};

export default Login;
