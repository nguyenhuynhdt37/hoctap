"use client";

import AuthShell, {
  AuthInput,
  AuthProviders,
  PasswordToggle,
  authLinkClass,
  authSubmitClass,
  type AuthRequestError,
} from "@/components/user/auth/AuthShell";
import { Alert, Button, Modal } from "@/components/ui";
import { postAuthSession } from "@/lib/auth/login";
import { isDpopMode } from "@/lib/auth/mode";
import {
  calculateRemainingMs,
  formatBanDate,
  formatRemainingTime,
  isLoginErrorDetail,
  LoginErrorDetail,
} from "@/types/shared/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "pulsoicon-react";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";

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
      className="rounded-[2rem] [&_button]:min-h-11 [&_button]:min-w-11"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="flex-1 rounded-full">
            Đóng
          </Button>
          {actions?.map((action, index) => (
            <Button
              key={index}
              variant={variant === "error" ? "destructive" : "primary"}
              onClick={action.onClick}
              className="flex-1 rounded-full"
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
  const redirectUrl = sanitizeRedirect(searchParams.get("redirect"));
  const finishLogin = () => {
    router.push(redirectUrl);
    router.refresh();
  };
  const goToVerification = (target: string) => router.push(target);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    async (response: { credential: string }) => {
      if (!response.credential) return;
      setIsGoogleLoading(true);
      setErrors((prev) => ({ ...prev, general: "" }));
      try {
        await postAuthSession("/auth/google", { credential: response.credential });
        finishLogin();
      } catch (error) {
        handleLoginError(error, "google");
      } finally {
        setIsGoogleLoading(false);
      }
    },
    // finishLogin/handleLoginError only close over router and redirectUrl.
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

  const handleLoginError = (cause: unknown, method: "password" | "google" = "password") => {
    const error = cause as (AuthRequestError & { response?: { data?: { code?: string } } }) | undefined;
    const detail = error?.response?.data?.detail;

    if (isDpopMode && method === "password" && error?.response?.data?.code === "invalid_token") {
      setErrors((prev) => ({ ...prev, general: "Email hoặc mật khẩu không đúng" }));
      return;
    }

    if (isLoginErrorDetail(detail)) {
      handleErrorByCode(detail);
      return;
    }

    if (!isDpopMode && (error?.status === 401 || error?.response?.status === 401)) {
      const redirectParam =
        redirectUrl !== "/"
          ? `&redirect=${encodeURIComponent(redirectUrl)}`
          : "";
      goToVerification(
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
        goToVerification(
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
              <p className="text-foreground/85 text-xs mt-2">
                Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ bộ phận hỗ
                trợ.
              </p>
            </div>
          ),
          actions: [
            {
              label: "Trung tâm trợ giúp",
              onClick: () => router.push("/help"),
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
              <p className="text-foreground/85 text-xs mt-2">
                Vui lòng đợi đến khi tài khoản được mở khóa hoặc liên hệ support
                nếu cần hỗ trợ.
              </p>
            </div>
          ),
          actions: [
            {
              label: "Trung tâm trợ giúp",
              onClick: () => router.push("/help"),
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
              <p className="text-foreground/85 text-xs mt-2">
                Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ bộ phận hỗ
                trợ.
              </p>
            </div>
          ),
          actions: [
            {
              label: "Trung tâm trợ giúp",
              onClick: () => router.push("/help"),
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

  // React 19 form action: the transition gives `isLoading` and keeps the dialog open on errors.
  // Login stays client-side on purpose: the DPoP key lives in the browser, not on the server.
  const [, submitAction, isLoading] = useActionState(async () => {
    setTouched({ email: true, password: true });
    setErrors((prev) => ({ ...prev, general: "" }));
    if (!validateForm()) return null;

    try {
      await postAuthSession("/auth/login", { email, password });
      finishLogin();
    } catch (error) {
      handleLoginError(error);
    }
    return null;
  }, null);

  const closeDialog = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      <AuthShell
        screen="login"
        title="Đăng nhập"
        description="Đăng nhập để tiếp tục học cùng Mây Mây."
      >
        <AuthProviders
          onCredential={handleGoogleCredentialResponse}
          busy={isGoogleLoading}
          githubRedirect={redirectUrl}
          githubError={searchParams.get("github_error")}
        />

        {errors.general && (
          <Alert variant="destructive" className="mt-3">{errors.general}</Alert>
        )}

        <form className="mt-3 space-y-3" action={submitAction}>
          <AuthInput
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
            enterKeyHint="next"
            required
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={() => handleBlur("email")}
            error={touched.email ? errors.email : undefined}
            placeholder="you@example.com"
            leftIcon={<Mail aria-hidden="true" className="size-4" />}
          />

          <div>
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Mật khẩu
              </label>
              <Link href="/forgot-password" className={`${authLinkClass} text-xs`}>
                Quên mật khẩu?
              </Link>
            </div>
            <AuthInput
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              enterKeyHint="go"
              required
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={() => handleBlur("password")}
              error={touched.password ? errors.password : undefined}
              leftIcon={<LockKeyhole aria-hidden="true" className="size-4" />}
              rightIcon={
                <PasswordToggle visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
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
            className={`mt-2 ${authSubmitClass}`}
            rightIcon={<ArrowRight aria-hidden="true" className="size-4" />}
          >
            Đăng nhập
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 border-t border-border pt-1 text-sm text-foreground/85">
          <span>Chưa có tài khoản?</span>
          <Link href="/register" className={authLinkClass}>Đăng ký ngay</Link>
        </div>
      </AuthShell>

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
