"use client";

import AuthScenicLayout from "@/components/user/auth/auth-scenic-layout";
import GoogleSignInButton from "@/components/shared/google-sign-in-button";
import { Button, Card, Divider, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { HiEye, HiEyeOff } from "react-icons/hi";

const Register = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    return { isValid: true, message: "" };
  };

  const validatePasswordConfirmation = (pass: string, confirm: string) => {
    if (!confirm.trim())
      return { isValid: false, message: "Vui lòng xác nhận mật khẩu" };
    if (pass !== confirm)
      return { isValid: false, message: "Mật khẩu xác nhận không khớp" };
    return { isValid: true, message: "" };
  };

  const [emailError, setEmailError] = useState<string>("");
  const [fullNameError, setFullNameError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<string>("");
  const [touched, setTouched] = useState({
    email: false,
    fullName: false,
    password: false,
    confirmPassword: false,
  });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleCredentialResponse = useCallback(
    async (response: any) => {
      if (!response.credential) return;
      setIsGoogleLoading(true);
      try {
        await api.post("/auth/google", { credential: response.credential });
        router.push("/");
        router.refresh();
      } catch (error: any) {
        if (error?.response?.data?.detail) {
          alert(error.response.data.detail);
        } else {
          alert("Đăng ký với Google thất bại. Vui lòng thử lại.");
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [router]
  );

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      const validation = validateEmail(value);
      setEmailError(validation.isValid ? "" : validation.message);
    }
  };

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    if (touched.fullName) {
      const validation = validateFullName(value);
      setFullNameError(validation.isValid ? "" : validation.message);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      const validation = validatePassword(value);
      setPasswordError(validation.isValid ? "" : validation.message);
    }
    if (confirmPassword && touched.confirmPassword) {
      const confirmValidation = validatePasswordConfirmation(
        value,
        confirmPassword
      );
      setConfirmPasswordError(
        confirmValidation.isValid ? "" : confirmValidation.message
      );
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      const validation = validatePasswordConfirmation(password, value);
      setConfirmPasswordError(validation.isValid ? "" : validation.message);
    }
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched({ ...touched, [field]: true });
    switch (field) {
      case "email": {
        const validation = validateEmail(email);
        setEmailError(validation.isValid ? "" : validation.message);
        break;
      }
      case "fullName": {
        const validation = validateFullName(fullName);
        setFullNameError(validation.isValid ? "" : validation.message);
        break;
      }
      case "password": {
        const validation = validatePassword(password);
        setPasswordError(validation.isValid ? "" : validation.message);
        break;
      }
      case "confirmPassword": {
        const validation = validatePasswordConfirmation(
          password,
          confirmPassword
        );
        setConfirmPasswordError(validation.isValid ? "" : validation.message);
        break;
      }
    }
  };

  const isFormValid = () => {
    const emailValidation = validateEmail(email);
    const nameValidation = validateFullName(fullName);
    const passwordValidation = validatePassword(password);
    const confirmValidation = validatePasswordConfirmation(
      password,
      confirmPassword
    );
    return (
      emailValidation.isValid &&
      nameValidation.isValid &&
      passwordValidation.isValid &&
      confirmValidation.isValid
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      email: true,
      fullName: true,
      password: true,
      confirmPassword: true,
    });

    const emailValidation = validateEmail(email);
    const nameValidation = validateFullName(fullName);
    const passwordValidation = validatePassword(password);
    const confirmValidation = validatePasswordConfirmation(
      password,
      confirmPassword
    );

    setEmailError(emailValidation.isValid ? "" : emailValidation.message);
    setFullNameError(nameValidation.isValid ? "" : nameValidation.message);
    setPasswordError(
      passwordValidation.isValid ? "" : passwordValidation.message
    );
    setConfirmPasswordError(
      confirmValidation.isValid ? "" : confirmValidation.message
    );

    if (!isFormValid()) return;

    setIsLoading(true);
    try {
      await api.post("/auth/register", {
        email,
        full_name: fullName,
        password,
      });
      router.push(
        "/email_authentication?registered=true&email=" +
          encodeURIComponent(email)
      );
    } catch (e: any) {
      if (e?.status === 409) {
        setEmailError("Email đã được sử dụng. Vui lòng thử email khác.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScenicLayout>
        <Card className="rounded-[24px] p-6 sm:p-8 space-y-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Đăng ký
            </h1>
            <p className="text-muted-foreground text-sm">
              Tạo tài khoản mới và bắt đầu hành trình học tập của bạn
            </p>
          </div>

          {/* Google Register */}
          <GoogleSignInButton
            onCredential={handleGoogleCredentialResponse}
            busy={isGoogleLoading}
          />

          {/* Divider */}
          <Divider label="HOẶC" />

          {/* Register Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              label="Họ và tên"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => handleFullNameChange(e.target.value)}
              onBlur={() => handleBlur("fullName")}
              error={fullNameError}
              placeholder="Nguyễn Văn A"
            />

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
              error={emailError}
              placeholder="you@example.com"
            />

            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              label="Mật khẩu"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={() => handleBlur("password")}
              error={passwordError}
              rightIcon={
                <button
                  type="button"
                  className="text-subtle-foreground hover:text-foreground transition-colors cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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

            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              label="Xác nhận mật khẩu"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              onBlur={() => handleBlur("confirmPassword")}
              error={touched.confirmPassword ? confirmPasswordError : undefined}
              rightIcon={
                <button
                  type="button"
                  className="text-subtle-foreground hover:text-foreground transition-colors cursor-pointer"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                  }
                >
                  {showConfirmPassword ? (
                    <HiEyeOff className="h-5 w-5" />
                  ) : (
                    <HiEye className="h-5 w-5" />
                  )}
                </button>
              }
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isGoogleLoading || !isFormValid()}
              isLoading={isLoading}
              loadingText="Đang tạo tài khoản..."
            >
              Tạo tài khoản
            </Button>
          </form>

          {/* Footer Link */}
          <div className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary-hover font-semibold"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </Card>
    </AuthScenicLayout>
  );
};

export default Register;
