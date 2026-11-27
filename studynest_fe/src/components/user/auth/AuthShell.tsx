"use client";

import GitHubSignInButton from "@/components/shared/github-sign-in-button";
import GoogleSignInButton from "@/components/shared/google-sign-in-button";
import { Divider, Input, Progress, type InputProps } from "@/components/ui";
import {
  CloudBlob,
  GlassCard,
  IconBubble,
  Pill,
  Reveal,
  SectionHeader,
} from "@/components/user/home/landing-ui";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { Bot, BookOpen, Check, Eye, EyeOff } from "pulsoicon-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const skyCopy = {
  login: {
    title: "Chào mừng quay lại!",
    mobileTitle: "Chào mừng quay lại!",
  },
  register: {
    title: "Bắt đầu hành trình học tập nhẹ nhàng",
    mobileTitle: "Khởi đầu cùng Mây Mây",
  },
  verify: {
    title: "Thêm một bước để chạm mây",
    mobileTitle: "Sắp tới lớp học rồi!",
  },
  forgot: {
    title: "Khôi phục quyền truy cập an toàn",
    mobileTitle: "Khôi phục mật khẩu",
  },
  reset: {
    title: "Thiết lập mật khẩu mới vững chắc",
    mobileTitle: "Tạo mật khẩu mới",
  },
} as const;

const benefits = [
  "Tiếp nối bài học đúng nơi bạn dừng",
  "Ôn tập với trắc nghiệm có lời giải",
  "Hỏi Trợ lý AI khi gặp bài khó",
];

export const authLinkClass =
  "inline-flex min-h-11 items-center rounded-lg font-semibold text-primary-hover underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const authSubmitClass =
  "rounded-full font-semibold motion-reduce:transition-none motion-reduce:active:translate-y-0 motion-reduce:[&>svg]:animate-none";

export const authDismissibleAlertClass = "items-center [&_button]:size-11";

export type AuthRequestError = {
  status?: unknown;
  response?: { status?: unknown; data?: { detail?: unknown } };
};

export function AuthInput({ className, containerClassName, ...props }: InputProps) {
  return (
    <Input
      className={cn(
        "h-12 border-border-strong text-base placeholder:text-foreground/85 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        props.rightIcon && "pr-14",
        className,
      )}
      containerClassName={cn(
        "min-w-0 [&>[role=alert]]:rounded-lg [&>[role=alert]]:bg-destructive-bg [&>[role=alert]]:px-3 [&>[role=alert]]:py-2 [&>p:not([role=alert])]:text-foreground/85",
        props.rightIcon && "[&>div>span:last-child]:right-0.5",
        containerClassName,
      )}
      {...props}
    />
  );
}

export function PasswordToggle({
  visible,
  label = "Hiện mật khẩu",
  onClick,
}: {
  visible: boolean;
  label?: string;
  onClick: () => void;
}) {
  const Icon = visible ? EyeOff : Eye;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={visible}
      onClick={onClick}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-primary-hover hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}

export function AuthProviders({
  onCredential,
  busy,
  githubRedirect,
  githubError,
}: ComponentProps<typeof GoogleSignInButton> & {
  githubRedirect?: string;
  githubError?: string | null;
}) {
  return (
    <div className="space-y-2.5">
      <div className="rounded-full focus-within:ring-2 focus-within:ring-ring [&>div]:[zoom:1.1] [&_button]:min-h-11 [&_p[role=status]]:text-foreground/85 [&_div:has(>iframe)]:max-w-full [&_iframe]:max-w-full">
        <GoogleSignInButton onCredential={onCredential} busy={busy} />
      </div>
      <div className="[&_button]:rounded-full motion-reduce:[&_button]:transition-none motion-reduce:[&_svg]:animate-none">
        <GitHubSignInButton redirectTo={githubRedirect} callbackError={githubError} />
      </div>
      <Divider label="hoặc" className="py-1 [&>span]:text-foreground/85" />
    </div>
  );
}

function FloatingLearningCards() {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none relative mt-5 hidden h-[21.5rem] w-full max-w-md lg:block">
      <div className="absolute inset-x-1 top-10 h-52 -rotate-12 rounded-[50%] border border-surface" />
      <div className="absolute inset-x-5 top-16 h-48 -rotate-12 rounded-[50%] border border-primary-pastel/70" />
      <div className="absolute top-16 right-4 size-2 rounded-full bg-surface shadow-md" />
      <div className="absolute right-[9%] top-8 size-2.5 rounded-full bg-primary-pastel" />
      <div className="absolute bottom-20 left-[7%] size-2 rounded-full bg-primary-pastel" />

      <motion.div
        className="absolute top-4 left-[3%] z-10 w-[69%] motion-reduce:transform-none!"
        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 4.4, ease: "easeInOut" }}
      >
        <GlassCard tilt={false} className="-rotate-3 p-4">
          <Pill className="absolute -top-3.5 right-4 rotate-2 shadow-sm">Đang học</Pill>
          <div className="flex items-center gap-3">
            <IconBubble className="size-10!">
              <BookOpen className="size-5" />
            </IconBubble>
            <div>
              <p className="text-sm font-semibold">Dãy số và quy luật</p>
              <p className="mt-0.5 text-xs text-foreground/85">Toán · Bài 3</p>
            </div>
          </div>
          <Progress className="mt-3.5" value={68} size="sm" label="Tiến độ bài học" showValue />
        </GlassCard>
      </motion.div>

      <motion.div
        className="absolute top-[6.75rem] right-[3%] z-20 w-[57%] motion-reduce:transform-none!"
        animate={reduceMotion ? undefined : { y: [0, 7, 0] }}
        transition={{ delay: 0.12, duration: 4.4, ease: "easeInOut" }}
      >
        <GlassCard tilt={false} className="rotate-3 p-3.5">
          <p className="text-xs font-semibold text-primary-hover">Câu hỏi nhanh</p>
          <p className="mt-1 text-sm font-semibold">7 × 8 bằng bao nhiêu?</p>
          <ul className="mt-2.5 space-y-1">
            {["54", "56", "64"].map((answer) => (
              <li
                key={answer}
                className={cn(
                  "flex h-6.5 items-center justify-between rounded-lg border px-2.5 text-xs tabular-nums",
                  answer === "56"
                    ? "border-primary-pastel bg-primary-light font-semibold text-primary-hover"
                    : "border-border bg-background text-foreground",
                )}
              >
                {answer}
                {answer === "56" && <Check animated={false} className="size-3.5" />}
              </li>
            ))}
          </ul>
        </GlassCard>
      </motion.div>

      <motion.div
        className="absolute bottom-2 left-[6%] z-30 w-[68%] motion-reduce:transform-none!"
        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ delay: 0.24, duration: 4.4, ease: "easeInOut" }}
      >
        <GlassCard tilt={false} className="flex -rotate-2 items-start gap-2.5 rounded-bl-lg! border-accent-border! bg-accent! p-3 text-accent-foreground">
          <IconBubble tone="lavender" shape="circle" className="size-8! border-0! bg-surface!">
            <Bot className="size-4" />
          </IconBubble>
          <div className="min-w-0">
            <p className="text-xs font-semibold">Trợ lý AI</p>
            <p className="mt-0.5 text-xs leading-relaxed">Mình gợi ý bước tiếp theo nhé?</p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

export default function AuthShell({
  screen,
  title,
  description,
  children,
}: {
  screen: keyof typeof skyCopy;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const copy = skyCopy[screen];

  return (
    <main className="grid min-h-[var(--auth-screen-min-height,100dvh)] w-full flex-1 grid-rows-[auto_1fr] bg-surface lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] lg:grid-rows-1">
      <div className="relative z-10 row-start-2 flex min-w-0 items-center justify-center px-5 py-7 sm:px-8 lg:col-start-2 lg:row-start-1 lg:px-12 lg:py-10">
        <Reveal className="mx-auto w-full max-w-md min-w-0">
          <div className="mb-5">
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Image src="/logo/maymay-logo.svg" alt="" width={32} height={32} />
              Mây Mây
            </div>
            <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {description && (
              <div className="mt-2 text-sm leading-relaxed text-foreground/85">
                {description}
              </div>
            )}
          </div>
          {children}

          <nav aria-label="Điều khoản và chính sách" className="mt-2 flex flex-wrap justify-center gap-x-4 text-xs">
            <Link href="/help/terms" className={authLinkClass}>Điều khoản sử dụng</Link>
            <Link href="/help/privacy-policy" className={authLinkClass}>Chính sách bảo mật</Link>
          </nav>
        </Reveal>
      </div>

      <div className="relative isolate row-start-1 min-w-0 overflow-hidden border-b border-border bg-linear-to-br from-primary-pastel via-primary-light to-background px-5 py-5 sm:px-8 lg:col-start-1 lg:flex lg:items-center lg:justify-center lg:border-r lg:border-b-0 lg:px-10 lg:py-10">
        <CloudBlob className="-top-24 -left-24 h-60 w-[26rem] bg-surface/80!" />
        <CloudBlob className="top-[46%] -right-36 h-72 w-[28rem] bg-surface/90! lg:top-[30%]" />
        <CloudBlob className="bottom-0 left-[10%] hidden h-36 w-72 bg-surface/75! lg:block" />
        <div aria-hidden="true" className="absolute -top-20 -right-12 size-52 rotate-12 rounded-[45%] border border-surface/90 lg:size-72" />
        <div className="relative w-full max-w-lg">
          <SectionHeader
            align="left"
            title={
              <>
                <span className="lg:hidden">{copy.mobileTitle}</span>
                <span className="hidden lg:inline">{copy.title}</span>
              </>
            }
            className="mb-0! [&>h2]:text-balance [&>h2]:leading-[1.15] lg:[&>h2]:text-5xl xl:[&>h2]:text-[clamp(3rem,3.65vw,3.75rem)]"
          />
          <ul className="mt-5 hidden space-y-2.5 lg:block">
            {benefits.map((benefit, index) => (
              <Reveal as="li" key={benefit} delay={index * 0.08} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                <IconBubble shape="circle" className="size-6! bg-surface!">
                  <Check animated={false} aria-hidden="true" className="size-3.5" />
                </IconBubble>
                {benefit}
              </Reveal>
            ))}
          </ul>
          <FloatingLearningCards />
        </div>
      </div>
    </main>
  );
}
