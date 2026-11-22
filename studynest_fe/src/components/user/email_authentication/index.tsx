"use client";

import AuthScenicLayout from "@/components/user/auth/auth-scenic-layout";
import { Alert, Button, Card, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { formatApiError } from "@/lib/utils/helpers/error";
import { validateOTP } from "@/lib/utils/validators";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HiCheckCircle, HiMail, HiRefresh } from "react-icons/hi";

const EmailAuthentication = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = (searchParams.get("email") || "").trim();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [emailFromQuery]);

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  const validateOtpInput = (otpString: string) => {
    const validation = validateOTP(otpString);
    if (!validation.isValid) {
      setOtpError(validation.message);
    } else {
      setOtpError("");
    }
    return validation.isValid;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (otpError) setOtpError("");
    if (infoMessage) setInfoMessage("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && newOtp.every((digit) => digit !== "")) {
      validateOtpInput(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");

    if (pastedData.length >= 6) {
      const codeSlice = pastedData.slice(0, 6);
      setOtp(codeSlice.split(""));
      validateOtpInput(codeSlice);
      inputRefs.current[5]?.focus();
    }
  };

  const targetEmail = (emailFromQuery || email).trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetEmail) {
      setOtpError("Vui lòng nhập địa chỉ email cần xác thực.");
      return;
    }

    const otpString = otp.join("");
    if (!validateOtpInput(otpString)) return;

    setIsLoading(true);
    setInfoMessage("");

    try {
      await api.post("/auth/verify-email", {
        email: targetEmail,
        code: otpString,
      });
      setIsVerified(true);
      setTimeout(() => {
        router.push(redirectUrl);
        router.refresh();
      }, 1000);
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      if (status === 400) {
        setOtpError(
          formatApiError(error, "Mã xác thực không đúng hoặc đã hết hạn.")
        );
      } else if (status === 404) {
        setOtpError("Không tìm thấy tài khoản với email này.");
      } else if (status === 409) {
        setOtpError("Email này đã được xác thực. Bạn có thể đăng nhập ngay.");
      } else {
        setOtpError(
          formatApiError(error, "Đã có lỗi xảy ra. Vui lòng thử lại sau.")
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || isResending) return;
    if (!targetEmail) {
      setOtpError("Vui lòng nhập địa chỉ email trước khi gửi lại mã.");
      return;
    }

    setIsResending(true);
    setOtpError("");
    setInfoMessage("");
    try {
      await api.post("/auth/refesh-email", {
        email: targetEmail,
      });
      setCanResend(false);
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      setInfoMessage("Đã gửi mã xác thực mới tới hộp thư của bạn.");
      inputRefs.current[0]?.focus();
    } catch (e: any) {
      const status = e?.response?.status ?? e?.status;
      if (status === 429) {
        setOtpError(
          "Bạn đã gửi yêu cầu quá 5 lần trong hôm nay. Vui lòng thử lại vào ngày mai."
        );
        setCanResend(false);
        setCountdown(0);
      } else if (status === 404) {
        setOtpError("Email không tồn tại trong hệ thống.");
      } else if (status === 409) {
        setOtpError("Email đã được xác thực. Bạn có thể đăng nhập ngay.");
        setCanResend(false);
        setCountdown(0);
      } else {
        setOtpError(
          formatApiError(e, "Không thể gửi lại mã lúc này. Vui lòng thử lại.")
        );
      }
    } finally {
      setIsResending(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isVerified) {
    return (
      <AuthScenicLayout>
        <Card className="rounded-[24px] p-6 sm:p-8 text-center space-y-4">
          <div className="mx-auto h-20 w-20 bg-success-bg rounded-full flex items-center justify-center border border-success-border">
            <HiCheckCircle className="h-11 w-11 text-success-foreground" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Xác thực thành công!
          </h1>
          <p className="text-sm text-muted-foreground">
            Email của bạn đã được xác thực. Đang chuyển hướng vào không gian học tập...
          </p>
        </Card>
      </AuthScenicLayout>
    );
  }

  return (
    <AuthScenicLayout>
      <Card className="rounded-[24px] p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 bg-primary-soft rounded-full flex items-center justify-center border border-border">
            <HiMail className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Xác thực email
          </h1>
          <p className="text-sm text-muted-foreground">
            Chúng tôi đã gửi mã xác thực 6 chữ số đến
          </p>
          {emailFromQuery ? (
            <p className="text-sm font-semibold text-primary break-all">
              {emailFromQuery}
            </p>
          ) : null}
        </div>

        {!emailFromQuery && (
          <Input
            id="verifyEmailInput"
            name="email"
            type="email"
            label="Email cần xác thực"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (otpError) setOtpError("");
            }}
            placeholder="you@example.com"
            required
          />
        )}

        {infoMessage && (
          <Alert variant="success" onClose={() => setInfoMessage("")}>
            {infoMessage}
          </Alert>
        )}

        {otpError && (
          <Alert variant="destructive" onClose={() => setOtpError("")}>
            {otpError}
          </Alert>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-3 text-center">
              Nhập mã xác thực 6 chữ số
            </label>

            <div className="flex justify-center gap-2 sm:gap-2.5">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  aria-label={`Chữ số xác thực thứ ${index + 1}`}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-11 h-12 sm:w-12 sm:h-13 text-center text-xl font-bold bg-surface text-foreground border rounded-xl transition-all focus:outline-none focus:ring-2 ${
                    otpError
                      ? "border-destructive-border focus:ring-destructive/25"
                      : "border-border focus:border-primary focus:ring-primary/25"
                  }`}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isLoading || !targetEmail || otp.some((digit) => digit === "")}
            isLoading={isLoading}
            loadingText="Đang xác thực..."
          >
            Xác thực
          </Button>

          <div className="text-center space-y-1.5">
            <p className="text-sm text-muted-foreground">Không nhận được mã?</p>

            {canResend ? (
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="inline-flex items-center text-sm text-primary hover:text-primary-hover font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <HiRefresh
                  className={`h-4 w-4 mr-1.5 ${isResending ? "animate-spin" : ""}`}
                />
                {isResending ? "Đang gửi lại..." : "Gửi lại mã"}
              </button>
            ) : countdown > 0 ? (
              <div className="inline-flex items-center text-sm text-subtle-foreground">
                <HiRefresh className="h-4 w-4 mr-1.5" />
                Gửi lại sau {formatCountdown(countdown)}
              </div>
            ) : null}
          </div>
        </form>

        <div className="text-center space-y-2 pt-1 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            Mã xác thực có hiệu lực trong 10 phút. Kiểm tra thư mục spam nếu chưa thấy email.
          </p>
          <div className="text-sm text-muted-foreground">
            Đã xác thực tài khoản?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary-hover font-semibold"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </Card>
    </AuthScenicLayout>
  );
};

export default EmailAuthentication;
