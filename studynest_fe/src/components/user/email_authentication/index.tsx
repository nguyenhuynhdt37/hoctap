"use client";

import { validateOTP } from "@/lib/utils/validators";
import api from "@/lib/utils/fetcher/client/axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HiCheckCircle, HiMail, HiRefresh } from "react-icons/hi";

const EmailAuthentication = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered"); // "true"
  const email_register = searchParams.get("email"); // "nguyenhuynhtk37@gmail.com"
  const redirectUrl = searchParams.get("redirect") || "/";
  // Email state - bạn có thể lấy từ context, state management, hoặc API
  const [email, setEmail] = useState("user@example.com");
  // OTP state
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Countdown state
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  // Refs for input focus management
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Clear error when user starts typing
    if (otpError) setOtpError("");

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto validate when all fields are filled
    if (newOtp.every((digit) => digit !== "") && !value) {
      validateOtpInput(newOtp.join(""));
    }
  };

  // Handle backspace and navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // If current field is empty, focus previous field
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");

    if (pastedData.length === 6) {
      const newOtp = pastedData.split("").slice(0, 6);
      setOtp(newOtp);
      validateOtpInput(pastedData);
      // Focus last input
      inputRefs.current[5]?.focus();
    }
  };

  // Validate OTP
  const validateOtpInput = (otpString: string) => {
    const validation = validateOTP(otpString);
    if (!validation.isValid) {
      setOtpError(validation.message);
    } else {
      setOtpError("");
    }
    return validation.isValid;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpString = otp.join("");
    if (!validateOtpInput(otpString)) return;

    setIsLoading(true);

    try {
      await api.post("/auth/verify-email", {
        email: email_register,
        otp: otpString,
      });
      setIsVerified(true);
      // Redirect về URL được chỉ định hoặc về trang chủ sau khi xác thực thành công
      setTimeout(() => {
        router.push(redirectUrl);
        router.refresh();
      }, 1000);
    } catch (error: any) {
      if (error?.response?.status === 400 || error?.response?.status === 404) {
        setOtpError("Mã xác thực không đúng. Vui lòng thử lại.");
      } else {
        setOtpError("Đã có lỗi xảy ra. Vui lòng thử lại sau.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    if (!canResend) return;
    try {
      const res = await api.post("/auth/refesh-email", {
        email: email_register,
      });
      setCanResend(false);
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      setOtpError("");
    } catch (e: any) {
      if (e?.status === 429) {
        setOtpError(
          "Bạn đã gửi yêu cầu quá 5 lần. Vui lòng thử lại vào ngày mai."
        );
      } else if (e?.status === 404) {
        setOtpError("Email không tồn tại trong hệ thống.");
      } else if (e?.status === 409) {
        setOtpError("Email đã được xác thực.");
      } else {
        setOtpError("Không thể gửi lại mã. Vui lòng thử lại.");
      }
      setCanResend(false);
    }
    // Focus first input
    inputRefs.current[0]?.focus();
  };

  // Format countdown time
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-24 w-24 bg-green-100 rounded-full flex items-center justify-center">
              <HiCheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Xác thực thành công!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Email của bạn đã được xác thực thành công.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center">
            <HiMail className="h-8 w-8 text-teal-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Xác thực email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Chúng tôi đã gửi mã xác thực 6 chữ số đến
          </p>
          <p className="text-center text-sm font-medium text-teal-600">
            {email_register}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              Nhập mã xác thực
            </label>

            {/* OTP Input Fields */}
            <div className="flex justify-center space-x-2 mb-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-12 h-12 text-center text-xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:z-10 ${
                    otpError
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-teal-500 focus:border-teal-500"
                  }`}
                  disabled={isLoading}
                />
              ))}
            </div>

            {/* Error Message */}
            {otpError && (
              <div className="text-red-600 text-sm text-center mb-4">
                {otpError}
              </div>
            )}
          </div>

          {/* Verify Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || otp.some((digit) => digit === "")}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang xác thực...
                </div>
              ) : (
                "Xác thực"
              )}
            </button>
          </div>

          {/* Resend Code */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Không nhận được mã?</p>

            {canResend ? (
              <button
                type="button"
                onClick={handleResendCode}
                className="inline-flex items-center text-sm text-teal-600 hover:text-teal-500 font-medium transition-colors"
              >
                <HiRefresh className="h-4 w-4 mr-1" />
                Gửi lại mã
              </button>
            ) : (
              <div className="inline-flex items-center text-sm text-gray-500">
                <HiRefresh className="h-4 w-4 mr-1" />
                Gửi lại sau {formatCountdown(countdown)}
              </div>
            )}
          </div>
        </form>

        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Mã xác thực có hiệu lực trong 10 phút.
            <br />
            Kiểm tra thư mục spam nếu không thấy email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailAuthentication;
