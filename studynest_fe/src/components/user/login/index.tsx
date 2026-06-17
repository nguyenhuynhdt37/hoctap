"use client";

import api from "@/lib/utils/fetcher/client/axios";
import {
  calculateRemainingMs,
  formatBanDate,
  formatRemainingTime,
  isLoginErrorDetail,
  LoginErrorDetail,
} from "@/types/shared/auth";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaGoogle } from "react-icons/fa";
import { HiEye, HiEyeOff } from "react-icons/hi";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

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
    <span className="text-yellow-600 font-medium">
      ({formatRemainingTime(remaining)})
    </span>
  );
};

// ============================================
// DIALOG COMPONENT
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        {/* Title */}
        <h3
          className={`text-lg font-semibold mb-4 ${
            variant === "error" ? "text-red-600" : "text-yellow-600"
          }`}
        >
          {title}
        </h3>

        {/* Content */}
        <div className="text-sm text-gray-700 mb-6">{content}</div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-gray-600 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Đóng
          </button>
          {actions?.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors text-sm font-medium ${
                variant === "error"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-yellow-600 hover:bg-yellow-700"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
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
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleLoginUrl = process.env.NEXT_PUBLIC_URL_GOOGLE_LOGIN;

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

  useEffect(() => {
    if (typeof window !== "undefined" && !window.google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => setIsGoogleLoaded(true);
      document.head.appendChild(script);
    } else if (window.google) {
      setIsGoogleLoaded(true);
    }
  }, []);

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
        // Xử lý error cho Google login giống như email login
        handleLoginError(error);
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [router, redirectUrl]
  );

  useEffect(() => {
    if (
      isGoogleLoaded &&
      window.google &&
      googleLoginUrl &&
      googleButtonRef.current
    ) {
      window.google.accounts.id.initialize({
        client_id: googleLoginUrl,
        callback: handleGoogleCredentialResponse,
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: googleButtonRef.current.offsetWidth || 300,
      });
    }
  }, [isGoogleLoaded, googleLoginUrl, handleGoogleCredentialResponse]);

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

    // Check if it's the new error format with error_code
    if (isLoginErrorDetail(detail)) {
      handleErrorByCode(detail);
      return;
    }

    // Fallback: handle legacy error format
    if (error?.status === 401 || error?.response?.status === 401) {
      // Legacy: EMAIL_NOT_VERIFIED
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
        // Lưu email và redirect đến trang verify
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
              <p className="text-gray-500 text-xs mt-2">
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
              <p className="text-gray-500 text-xs mt-2">
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
              <p className="text-gray-500 text-xs mt-2">
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
      <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                  <Image
                    src="/logo/studynest-logo.svg"
                    alt="StudyNest Logo"
                    width={64}
                    height={64}
                    className="w-16 h-16"
                  />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Đăng nhập</h1>
              <p className="text-gray-600 text-sm">
                Chào mừng trở lại! Vui lòng đăng nhập vào tài khoản của bạn
              </p>
            </div>

            {/* Google Login */}
            {isGoogleLoaded && googleLoginUrl ? (
              <div
                ref={googleButtonRef}
                className="w-full flex justify-center"
              />
            ) : (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm font-medium text-gray-500 cursor-not-allowed"
              >
                <FaGoogle className="w-5 h-5 text-red-500" />
                {isGoogleLoading ? "Đang xử lý..." : "Đang tải..."}
              </button>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">hoặc</span>
              </div>
            </div>

            {/* Error Message */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {errors.general}
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => handleBlur("email")}
                  className={`block w-full px-4 py-3 border-2 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.email && touched.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-green-500 focus:ring-green-200"
                  }`}
                  placeholder="you@example.com"
                />
                {errors.email && touched.email && (
                  <div className="text-red-600 text-xs mt-1.5">
                    {errors.email}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Mật khẩu
                  </label>
                  <a
                    href="#"
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    Quên mật khẩu?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={() => handleBlur("password")}
                    className={`block w-full px-4 py-3 pr-12 border-2 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                      errors.password && touched.password
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-green-500 focus:ring-green-200"
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <HiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <HiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && touched.password && (
                  <div className="text-red-600 text-xs mt-1.5">
                    {errors.password}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading || !email || !password}
                className="w-full py-3.5 px-4 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>

            {/* Footer Link */}
            <div className="text-center text-sm text-gray-600">
              Chưa có tài khoản?{" "}
              <a
                href="/register"
                className="text-green-600 hover:text-green-700 font-bold"
              >
                Đăng ký ngay
              </a>
            </div>
          </div>
        </div>
      </div>

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
