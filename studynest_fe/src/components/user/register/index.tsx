"use client";

import AuthShell, {
  AuthInput,
  AuthProviders,
  PasswordToggle,
  authDismissibleAlertClass,
  authLinkClass,
  authSubmitClass,
  type AuthRequestError,
} from "@/components/user/auth/AuthShell";
import { Alert, Button } from "@/components/ui";
import { postAuthSession } from "@/lib/auth/login";
import api from "@/lib/utils/fetcher/client/axios";
import { formatApiError } from "@/lib/utils/helpers/error";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useState } from "react";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "pulsoicon-react";

const Register = () => {
  const router = useRouter();
  const finishRegister = () => {
    router.push("/");
    router.refresh();
  };
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [gradeLevel, setGradeLevel] = useState<number | null>(null);

  const validateEmail = (value: string) => {
    if (!value.trim())
      return { isValid: false, message: "Email không được để trống" };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value))
      return { isValid: false, message: "Email không hợp lệ" };
    return { isValid: true, message: "" };
  };

  const validateFullName = (value: string) => {
    if (!value.trim())
      return { isValid: false, message: "Họ và tên không được để trống" };
    if (value.trim().length < 2)
      return { isValid: false, message: "Họ và tên quá ngắn" };
    return { isValid: true, message: "" };
  };

  const validatePassword = (value: string) => {
    if (!value.trim())
      return { isValid: false, message: "Mật khẩu không được để trống" };
    if (value.length < 6)
      return { isValid: false, message: "Mật khẩu phải có ít nhất 6 ký tự" };
    if (value.length > 72)
      return { isValid: false, message: "Mật khẩu không được vượt quá 72 ký tự" };
    return { isValid: true, message: "" };
  };

  const validatePasswordConfirmation = (pass: string, confirm: string) => {
    if (!confirm.trim())
      return { isValid: false, message: "Vui lòng xác nhận mật khẩu" };
    if (pass !== confirm)
      return { isValid: false, message: "Mật khẩu xác nhận không khớp" };
    return { isValid: true, message: "" };
  };

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      if (!response.credential) return;
      setIsGoogleLoading(true);
      setGeneralError("");
      try {
        await postAuthSession("/auth/google", { credential: response.credential });
        finishRegister();
      } catch (error) {
        setGeneralError(
          formatApiError(error, "Đăng ký với Google thất bại. Vui lòng thử lại.")
        );
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [router]
  );

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (generalError) setGeneralError("");
    if (touched.email) {
      const validation = validateEmail(value);
      setErrors((prev) => ({
        ...prev,
        email: validation.isValid ? "" : validation.message,
      }));
    }
  };

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    if (touched.fullName) {
      const validation = validateFullName(value);
      setErrors((prev) => ({
        ...prev,
        fullName: validation.isValid ? "" : validation.message,
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
    if (confirmPassword || touched.confirmPassword) {
      const confirmValidation = validatePasswordConfirmation(
        value,
        confirmPassword
      );
      setErrors((prev) => ({
        ...prev,
        confirmPassword: confirmValidation.isValid
          ? ""
          : confirmValidation.message,
      }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      const validation = validatePasswordConfirmation(password, value);
      setErrors((prev) => ({
        ...prev,
        confirmPassword: validation.isValid ? "" : validation.message,
      }));
    }
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    switch (field) {
      case "fullName": {
        const validation = validateFullName(fullName);
        setErrors((prev) => ({
          ...prev,
          fullName: validation.isValid ? "" : validation.message,
        }));
        break;
      }
      case "email": {
        const validation = validateEmail(email);
        setErrors((prev) => ({
          ...prev,
          email: validation.isValid ? "" : validation.message,
        }));
        break;
      }
      case "password": {
        const validation = validatePassword(password);
        setErrors((prev) => ({
          ...prev,
          password: validation.isValid ? "" : validation.message,
        }));
        break;
      }
      case "confirmPassword": {
        const validation = validatePasswordConfirmation(
          password,
          confirmPassword
        );
        setErrors((prev) => ({
          ...prev,
          confirmPassword: validation.isValid ? "" : validation.message,
        }));
        break;
      }
    }
  };

  const validateForm = () => {
    const nameValidation = validateFullName(fullName);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const confirmValidation = validatePasswordConfirmation(
      password,
      confirmPassword
    );

    const newErrors: typeof errors = {};
    if (!nameValidation.isValid) newErrors.fullName = nameValidation.message;
    if (!emailValidation.isValid) newErrors.email = emailValidation.message;
    if (!passwordValidation.isValid) newErrors.password = passwordValidation.message;
    if (!confirmValidation.isValid)
      newErrors.confirmPassword = confirmValidation.message;

    setErrors(newErrors);

    return (
      nameValidation.isValid &&
      emailValidation.isValid &&
      passwordValidation.isValid &&
      confirmValidation.isValid
    );
  };

  // React 19 form action: pending state without manual flags; stays client-side like login.
  const [, submitAction, isLoading] = useActionState(async () => {
    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    setGeneralError("");

    if (!validateForm()) return null;

    try {
      await api.post("/auth/register", {
        email: email.trim(),
        full_name: fullName.trim(),
        password,
        ...(gradeLevel ? { grade_level: gradeLevel } : {}),
      });
      const verifyUrl =
        "/email_authentication?registered=true&email=" +
        encodeURIComponent(email.trim());
      router.push(verifyUrl);
    } catch (cause) {
      const e = cause as AuthRequestError | undefined;
      const status = e?.response?.status ?? e?.status;
      if (status === 409) {
        setErrors((prev) => ({
          ...prev,
          email: "Email đã được sử dụng. Vui lòng thử email khác.",
        }));
      } else {
        setGeneralError(
          formatApiError(e, "Không thể tạo tài khoản lúc này. Vui lòng thử lại.")
        );
      }
    }
    return null;
  }, null);

  const passwordStrength = validatePassword(password).isValid
    ? 1 +
      Number(password.length >= 10) +
      Number(password.length >= 14) +
      Number(new Set(password).size >= 8)
    : 0;
  const strengthLabel = ["Chưa đủ điều kiện", "Yếu", "Vừa", "Tốt", "Mạnh"][passwordStrength];

  return (
    <AuthShell
      screen="register"
      title="Đăng ký"
      description="Tạo tài khoản để bắt đầu học cùng Mây Mây."
    >
      {generalError && (
        <Alert
          variant="destructive"
          className={`mb-3 ${authDismissibleAlertClass}`}
          onClose={() => setGeneralError("")}
        >
          {generalError}
        </Alert>
      )}

      <AuthProviders onCredential={handleGoogleCredentialResponse} busy={isGoogleLoading} />

      <form noValidate className="mt-3 space-y-3" action={submitAction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <AuthInput
            id="fullName"
            name="fullName"
            type="text"
            label="Họ và tên"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            required
            value={fullName}
            onChange={(e) => handleFullNameChange(e.target.value)}
            onBlur={() => handleBlur("fullName")}
            error={touched.fullName ? errors.fullName : undefined}
            placeholder="Nguyễn Văn A"
            leftIcon={<UserRound aria-hidden="true" className="size-4" />}
          />

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
            placeholder="ten@vidu.vn"
            leftIcon={<Mail aria-hidden="true" className="size-4" />}
          />
        </div>

        <div>
          <AuthInput
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            label="Mật khẩu"
            autoComplete="new-password"
            enterKeyHint="next"
            required
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            onBlur={() => handleBlur("password")}
            error={touched.password ? errors.password : undefined}
            hint="Dùng từ 6 đến 72 ký tự."
            leftIcon={<LockKeyhole aria-hidden="true" className="size-4" />}
            rightIcon={
              <PasswordToggle visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
            }
            placeholder="••••••••"
          />

          {password && (
            <div
              role="meter"
              aria-label="Độ mạnh mật khẩu ước tính"
              aria-valuemin={0}
              aria-valuemax={4}
              aria-valuenow={passwordStrength}
              aria-valuetext={strengthLabel}
              className="mt-2.5"
            >
              <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4].map((segment) => (
                  <span key={segment} className={`h-1 rounded-full ${segment <= passwordStrength ? "bg-primary" : "bg-primary-light"}`} />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-foreground/85">
                Độ mạnh ước tính · <span className="font-semibold text-foreground">{strengthLabel}</span>
              </p>
            </div>
          )}
        </div>

        <AuthInput
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          label="Xác nhận mật khẩu"
          autoComplete="new-password"
          enterKeyHint="go"
          required
          value={confirmPassword}
          onChange={(e) => handleConfirmPasswordChange(e.target.value)}
          onBlur={() => handleBlur("confirmPassword")}
          error={touched.confirmPassword ? errors.confirmPassword : undefined}
          leftIcon={<LockKeyhole aria-hidden="true" className="size-4" />}
          rightIcon={
            <PasswordToggle
              visible={showConfirmPassword}
              label="Hiện mật khẩu xác nhận"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          }
          placeholder="••••••••"
        />

        {/* Chọn nhanh Lớp học (1 → 12) để cá nhân hóa lộ trình ngay khi tạo tài khoản */}
        <div className="rounded-2xl border border-border bg-background/70 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-foreground">
              Bạn đang học lớp mấy? <span className="font-normal text-muted-foreground">(tùy chọn)</span>
            </label>
            {gradeLevel && (
              <button
                type="button"
                onClick={() => setGradeLevel(null)}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                <span>Bỏ chọn</span>
              </button>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Mây Mây sẽ tự thiết kế sẵn lộ trình Lớp 1 → 12 phù hợp cho bạn.
          </p>
          <div className="mt-2.5 grid grid-cols-6 gap-1.5">
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((g) => {
              const selected = gradeLevel === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGradeLevel((prev) => (prev === g ? null : g))}
                  className={`rounded-xl border py-1.5 text-xs font-bold transition cursor-pointer tabular-nums ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                      : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
                  }`}
                >
                  <span>L{g}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isLoading || isGoogleLoading}
          isLoading={isLoading}
          loadingText="Đang tạo tài khoản..."
          className={`mt-2 ${authSubmitClass}`}
          rightIcon={<ArrowRight aria-hidden="true" className="size-4" />}
        >
          Tạo tài khoản
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 border-t border-border pt-1 text-sm text-foreground/85">
        <span>Đã có tài khoản?</span>
        <Link href="/login" className={authLinkClass}>Đăng nhập ngay</Link>
      </div>
    </AuthShell>
  );
};

export default Register;
