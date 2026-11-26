"use client";

import AuthShell, {
  AuthInput,
  authDismissibleAlertClass,
  authLinkClass,
  authSubmitClass,
  type AuthRequestError,
} from "@/components/user/auth/AuthShell";
import { IconBubble, Pill } from "@/components/user/home/landing-ui";
import { Alert, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { postAuthSession } from "@/lib/auth/login";
import api from "@/lib/utils/fetcher/client/axios";
import { formatApiError } from "@/lib/utils/helpers/error";
import { validateOTP } from "@/lib/utils/validators";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Mail, RotateCw } from "pulsoicon-react";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";

const EmailAuthentication = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = (searchParams.get("email") || "").trim();
  const justRegistered = searchParams.get("registered") === "true";
  const justSentFromLogin = searchParams.get("sent") === "1";
  const redirectUrl = sanitizeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string>(
    justSentFromLogin
      ? "Tài khoản của bạn chưa xác thực email. Hệ thống vừa gửi mã 6 chữ số mới tới hộp thư của bạn."
      : justRegistered
        ? "Đăng ký thành công! Vui lòng nhập mã 6 chữ số vừa được gửi tới email của bạn để đăng nhập ngay."
        : "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const [countdown, setCountdown] = useState(
    justRegistered || justSentFromLogin ? 60 : 0,
  );
  const [canResend, setCanResend] = useState(
    !(justRegistered || justSentFromLogin),
  );

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

  const fillOtp = (code: string) => {
    setOtp(code.split(""));
    validateOtpInput(code);
    inputRefs.current[5]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");

    if (pastedData.length >= 6) {
      fillOtp(pastedData.slice(0, 6));
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
      await postAuthSession("/auth/verify-email", {
        email: targetEmail.toLowerCase(),
        code: otpString,
      });
      setIsVerified(true);
      localStorage.removeItem("pending_verify_email");
      setTimeout(() => {
        router.replace(redirectUrl);
        router.refresh();
      }, 600);
    } catch (cause) {
      const error = cause as AuthRequestError | undefined;
      const status = error?.response?.status ?? error?.status;
      if (status === 400) {
        setOtpError(
          formatApiError(error, "Mã xác thực không đúng hoặc đã hết hạn.")
        );
      } else if (status === 404) {
        setOtpError(
          "Thông tin tài khoản không chính xác (Email chưa được đăng ký trên hệ thống)."
        );
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
    } catch (cause) {
      const e = cause as AuthRequestError | undefined;
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
      <AuthShell screen="verify" title="Xác thực thành công!">
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-success-border bg-success-bg p-4 text-sm leading-relaxed text-success-foreground">
          <IconBubble tone="success" shape="circle" className="size-10! bg-surface!">
            <CheckCircle2 aria-hidden="true" className="size-5" />
          </IconBubble>
          <p>Email của bạn đã được xác thực. Đang chuyển hướng vào không gian học tập…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      screen="verify"
      title="Xác thực email"
      description={
        emailFromQuery ? (
          <p>
            Mã xác thực 6 chữ số đã được gửi đến{" "}
            <strong className="font-semibold break-all text-primary-hover">{emailFromQuery}</strong>.
          </p>
        ) : (
          <p>Nhập email và mã 6 chữ số trong hộp thư để xác thực tài khoản.</p>
        )
      }
    >
      {!emailFromQuery && (
        <AuthInput
          id="verifyEmailInput"
          name="email"
          type="email"
          label="Email cần xác thực"
          autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (otpError) setOtpError("");
          }}
          placeholder="you@example.com"
          leftIcon={<Mail aria-hidden="true" className="size-4" />}
          containerClassName="mb-4"
          required
        />
      )}

      {infoMessage && (
        <Alert
          variant="success"
          role="status"
          className={`mb-4 ${authDismissibleAlertClass}`}
          onClose={() => setInfoMessage("")}
        >
          {infoMessage}
        </Alert>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <fieldset className="min-w-0">
          <legend className="mb-2.5 text-sm font-semibold text-foreground">
            Nhập mã xác thực 6 chữ số
          </legend>

          <div className="grid grid-cols-6 gap-1 sm:gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                name={`otp-digit-${index + 1}`}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Chữ số xác thực thứ ${index + 1}`}
                aria-invalid={otpError ? true : undefined}
                aria-describedby={otpError ? "verify-code-error" : "verify-code-hint"}
                maxLength={index === 0 ? otp.length : 1}
                value={digit}
                onChange={(e) => {
                  const value = e.target.value;
                  if (index === 0 && /^\d{6}$/.test(value)) {
                    fillOtp(value);
                  } else {
                    handleOtpChange(index, value);
                  }
                }}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={cn(
                  "h-14 min-w-0 w-full rounded-xl border text-center text-xl font-semibold tabular-nums text-foreground transition-colors focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring focus-visible:ring-2 focus-visible:ring-ring disabled:bg-disabled disabled:text-disabled-foreground motion-reduce:transition-none",
                  otpError
                    ? "border-destructive-foreground bg-destructive-bg"
                    : "border-border-strong bg-background",
                  !otpError && digit && "border-primary-pastel bg-primary-light text-primary-hover",
                )}
                disabled={isLoading}
              />
            ))}
          </div>

          {otpError && (
            <Alert
              variant="destructive"
              className={`mt-3 ${authDismissibleAlertClass}`}
              onClose={() => setOtpError("")}
            >
              <span id="verify-code-error">{otpError}</span>
            </Alert>
          )}
        </fieldset>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isLoading || !targetEmail || otp.some((digit) => digit === "")}
          isLoading={isLoading}
          loadingText="Đang xác thực..."
          className={authSubmitClass}
          rightIcon={<ArrowRight aria-hidden="true" className="size-4" />}
        >
          Xác thực
        </Button>

        <div className="flex min-h-11 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
          <p className="text-foreground/85">Không nhận được mã?</p>

          {canResend ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={handleResendCode}
              disabled={isResending}
              isLoading={isResending}
              loadingText="Đang gửi lại..."
              className={`${authSubmitClass} h-11 px-3 text-sm text-primary-hover`}
              leftIcon={<RotateCw aria-hidden="true" className="size-4" />}
            >
              Gửi lại mã
            </Button>
          ) : countdown > 0 ? (
            <Pill className="min-h-9 tabular-nums">
              <Clock aria-hidden="true" className="size-4" />
              Gửi lại sau {formatCountdown(countdown)}
            </Pill>
          ) : null}
        </div>
      </form>

      <div className="mt-2 border-t border-border pt-3 text-center">
        <p id="verify-code-hint" className="text-xs leading-relaxed text-foreground/85">
          Mã có hiệu lực trong 10 phút. Kiểm tra thư mục spam nếu chưa thấy email.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-foreground/85">
          <span>Đã xác thực tài khoản?</span>
          <Link href="/login" className={authLinkClass}>Đăng nhập</Link>
        </div>
      </div>
    </AuthShell>
  );
};

export default EmailAuthentication;
