"use client";

import GoogleSignInButton from "@/components/shared/google-sign-in-button";
import api from "@/lib/utils/fetcher/client/axios";
import Image from "next/image";
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
    if (!value.trim()) return { isValid: false, message: "Email không được để trống" };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return { isValid: false, message: "Email không hợp lệ" };
    return { isValid: true, message: "" };
  };

  const validateFullName = (value: string) => {
    if (!value.trim()) return { isValid: false, message: "Họ và tên không được để trống" };
    if (value.trim().length < 2) return { isValid: false, message: "Họ và tên quá ngắn" };
    return { isValid: true, message: "" };
  };

  const validatePassword = (value: string) => {
    if (!value.trim()) return { isValid: false, message: "Mật khẩu không được để trống" };
    if (value.length < 6) return { isValid: false, message: "Mật khẩu phải có ít nhất 6 ký tự" };
    return { isValid: true, message: "" };
  };

  const validatePasswordConfirmation = (pass: string, confirm: string) => {
    if (!confirm.trim()) return { isValid: false, message: "Vui lòng xác nhận mật khẩu" };
    if (pass !== confirm) return { isValid: false, message: "Mật khẩu xác nhận không khớp" };
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
      const confirmValidation = validatePasswordConfirmation(value, confirmPassword);
      setConfirmPasswordError(confirmValidation.isValid ? "" : confirmValidation.message);
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
        const validation = validatePasswordConfirmation(password, confirmPassword);
        setConfirmPasswordError(validation.isValid ? "" : validation.message);
        break;
      }
    }
  };

  const isFormValid = () => {
    const emailValidation = validateEmail(email);
    const nameValidation = validateFullName(fullName);
    const passwordValidation = validatePassword(password);
    const confirmValidation = validatePasswordConfirmation(password, confirmPassword);
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
    const confirmValidation = validatePasswordConfirmation(password, confirmPassword);

    setEmailError(emailValidation.isValid ? "" : emailValidation.message);
    setFullNameError(nameValidation.isValid ? "" : nameValidation.message);
    setPasswordError(passwordValidation.isValid ? "" : passwordValidation.message);
    setConfirmPasswordError(confirmValidation.isValid ? "" : confirmValidation.message);

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
    <div className="min-h-screen bg-[#F6FAFF] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[24px] shadow-md border border-[#E7EEF7] p-8 sm:p-10 space-y-7">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E8F2FA] border border-[#BFD7ED]/60 flex items-center justify-center shadow-2xs">
                <Image
                  src="/logo/studynest-logo.svg"
                  alt="StudyNest Logo"
                  width={48}
                  height={48}
                  className="w-12 h-12"
                />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold text-[#3D4A5A]">
              Đăng ký
            </h1>
            <p className="text-[#6F7C8C] text-sm">
              Tạo tài khoản mới và bắt đầu hành trình học tập của bạn
            </p>
          </div>

          {/* Google Register */}
          <GoogleSignInButton
            onCredential={handleGoogleCredentialResponse}
            busy={isGoogleLoading}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E7EEF7]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="px-4 bg-white text-[#8190A3]">hoặc</span>
            </div>
          </div>

          {/* Register Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-semibold text-[#3D4A5A] mb-2"
              >
                Họ và tên
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => handleFullNameChange(e.target.value)}
                onBlur={() => handleBlur("fullName")}
                className={`block w-full px-4 py-3 border rounded-xl text-sm text-[#3D4A5A] placeholder:text-[#8190A3] transition-all focus:outline-none focus:ring-2 ${
                  fullNameError
                    ? "border-[#A23C46] focus:border-[#A23C46] focus:ring-[#A23C46]/20"
                    : "border-[#E7EEF7] bg-[#F6FAFF]/50 focus:bg-white focus:border-[#356FA7] focus:ring-[#356FA7]/20"
                }`}
                placeholder="Nguyễn Văn A"
              />
              {fullNameError && (
                <div className="text-[#A23C46] text-xs mt-1.5">
                  {fullNameError}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[#3D4A5A] mb-2"
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
                className={`block w-full px-4 py-3 border rounded-xl text-sm text-[#3D4A5A] placeholder:text-[#8190A3] transition-all focus:outline-none focus:ring-2 ${
                  emailError
                    ? "border-[#A23C46] focus:border-[#A23C46] focus:ring-[#A23C46]/20"
                    : "border-[#E7EEF7] bg-[#F6FAFF]/50 focus:bg-white focus:border-[#356FA7] focus:ring-[#356FA7]/20"
                }`}
                placeholder="you@example.com"
              />
              {emailError && (
                <div className="text-[#A23C46] text-xs mt-1.5">
                  {emailError}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[#3D4A5A] mb-2"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => handleBlur("password")}
                  className={`block w-full px-4 py-3 pr-12 border rounded-xl text-sm text-[#3D4A5A] placeholder:text-[#8190A3] transition-all focus:outline-none focus:ring-2 ${
                    passwordError
                      ? "border-[#A23C46] focus:border-[#A23C46] focus:ring-[#A23C46]/20"
                      : "border-[#E7EEF7] bg-[#F6FAFF]/50 focus:bg-white focus:border-[#356FA7] focus:ring-[#356FA7]/20"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <HiEyeOff className="h-5 w-5 text-[#8190A3] hover:text-[#3D4A5A]" />
                  ) : (
                    <HiEye className="h-5 w-5 text-[#8190A3] hover:text-[#3D4A5A]" />
                  )}
                </button>
              </div>
              {passwordError && (
                <div className="text-[#A23C46] text-xs mt-1.5">
                  {passwordError}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-[#3D4A5A] mb-2"
              >
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  onBlur={() => handleBlur("confirmPassword")}
                  className={`block w-full px-4 py-3 pr-12 border rounded-xl text-sm text-[#3D4A5A] placeholder:text-[#8190A3] transition-all focus:outline-none focus:ring-2 ${
                    confirmPasswordError && touched.confirmPassword
                      ? "border-[#A23C46] focus:border-[#A23C46] focus:ring-[#A23C46]/20"
                      : "border-[#E7EEF7] bg-[#F6FAFF]/50 focus:bg-white focus:border-[#356FA7] focus:ring-[#356FA7]/20"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <HiEyeOff className="h-5 w-5 text-[#8190A3] hover:text-[#3D4A5A]" />
                  ) : (
                    <HiEye className="h-5 w-5 text-[#8190A3] hover:text-[#3D4A5A]" />
                  )}
                </button>
              </div>
              {confirmPasswordError && touched.confirmPassword && (
                <div className="text-[#A23C46] text-xs mt-1.5">
                  {confirmPasswordError}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading || !isFormValid()}
              className="w-full py-3.5 px-4 text-sm font-semibold rounded-xl text-white bg-[#356FA7] hover:bg-[#285C90] focus:outline-none focus:ring-2 focus:ring-[#356FA7]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
            >
              {isLoading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center text-sm text-[#6F7C8C]">
            Đã có tài khoản?{" "}
            <a
              href="/login"
              className="text-[#356FA7] hover:text-[#285C90] font-semibold"
            >
              Đăng nhập ngay
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
