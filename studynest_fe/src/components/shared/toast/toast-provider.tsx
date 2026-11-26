"use client";

import { useEffect, useState } from "react";
import toast, { Toaster, resolveValue, type Toast } from "react-hot-toast";
import {
  AlertTriangle,
  CircleAlert,
  CircleCheck,
  Info,
  Loader2,
  X,
} from "pulsoicon-react";

type ToastTone = "success" | "error" | "warning" | "loading" | "info";

interface ToastToneStyle {
  label: string;
  cardBorder: string;
  cardAura: string;
  iconBox: string;
  labelColor: string;
  dotColor: string;
  progressColor: string;
}

const TOAST_TONES: Record<ToastTone, ToastToneStyle> = {
  success: {
    label: "Hoàn tất",
    cardBorder: "border-success-border",
    cardAura: "from-success-bg/55 via-surface/95 to-surface/95",
    iconBox: "bg-success-bg border-success-border text-success-foreground",
    labelColor: "text-success-foreground",
    dotColor: "bg-success-foreground",
    progressColor: "bg-success-foreground/65",
  },
  error: {
    label: "Có lỗi xảy ra",
    cardBorder: "border-destructive-border",
    cardAura: "from-destructive-bg/55 via-surface/95 to-surface/95",
    iconBox:
      "bg-destructive-bg border-destructive-border text-destructive-foreground",
    labelColor: "text-destructive-foreground",
    dotColor: "bg-destructive-foreground",
    progressColor: "bg-destructive-foreground/65",
  },
  warning: {
    label: "Lưu ý",
    cardBorder: "border-warning-border",
    cardAura: "from-warning-bg/60 via-surface/95 to-surface/95",
    iconBox: "bg-warning-bg border-warning-border text-warning-foreground",
    labelColor: "text-warning-foreground",
    dotColor: "bg-warning-foreground",
    progressColor: "bg-warning-foreground/65",
  },
  loading: {
    label: "Đang xử lý",
    cardBorder: "border-primary-pastel",
    cardAura: "from-primary-light/70 via-surface/95 to-surface/95",
    iconBox: "bg-primary-light border-primary-pastel text-primary",
    labelColor: "text-primary",
    dotColor: "bg-primary",
    progressColor: "bg-primary/65",
  },
  info: {
    label: "Thông báo",
    cardBorder: "border-primary-pastel",
    cardAura: "from-primary-light/65 via-surface/95 to-surface/95",
    iconBox: "bg-primary-light border-primary-pastel text-primary",
    labelColor: "text-primary",
    dotColor: "bg-primary",
    progressColor: "bg-primary/65",
  },
};

function resolveToastTone(t: Toast): ToastTone {
  if (t.className?.includes("cloudy-toast-warning")) {
    return "warning";
  }
  if (t.type === "success") return "success";
  if (t.type === "error") return "error";
  if (t.type === "loading") return "loading";
  return "info";
}

function ToastToneIcon({ tone }: { tone: ToastTone }) {
  switch (tone) {
    case "success":
      return <CircleCheck size={18} animated={false} aria-hidden="true" />;
    case "error":
      return <CircleAlert size={18} animated={false} aria-hidden="true" />;
    case "warning":
      return <AlertTriangle size={18} animated={false} aria-hidden="true" />;
    case "loading":
      return (
        <Loader2
          size={18}
          animated={false}
          aria-hidden="true"
          className="animate-spin"
        />
      );
    default:
      return <Info size={18} animated={false} aria-hidden="true" />;
  }
}

function CloudyToastCard({ item }: { item: Toast }) {
  const tone = resolveToastTone(item);
  const style = TOAST_TONES[tone];
  const duration =
    typeof item.duration === "number" && Number.isFinite(item.duration)
      ? item.duration
      : 4000;
  const showProgress = tone !== "loading" && duration > 0;
  const content = resolveValue(item.message, item);

  return (
    <div
      role={item.ariaProps.role}
      aria-live={item.ariaProps["aria-live"]}
      className={`group pointer-events-auto relative w-[min(392px,calc(100vw-2rem))] overflow-hidden rounded-[1.25rem] border bg-gradient-to-br backdrop-blur-xl shadow-[0_18px_40px_-14px_rgba(53,111,167,0.22),0_4px_12px_-4px_rgba(61,74,90,0.08)] transition-transform duration-200 ${style.cardBorder} ${style.cardAura} ${
        item.visible ? "cloudy-toast-enter" : "cloudy-toast-leave"
      }`}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${style.iconBox}`}
        >
          <ToastToneIcon tone={tone} />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span
              className={`inline-block size-1.5 rounded-full ${style.dotColor}`}
              aria-hidden="true"
            />
            <span
              className={`text-[10.5px] font-bold uppercase tracking-[0.07em] ${style.labelColor}`}
            >
              {style.label}
            </span>
          </div>
          <div className="break-words text-[13.5px] font-medium leading-[1.45] text-foreground">
            {content}
          </div>
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(item.id)}
          aria-label="Đóng thông báo"
          className="-mr-1 -mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-primary-light/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={14} animated={false} aria-hidden="true" />
        </button>
      </div>

      {/* Thanh tiến trình tự ẩn siêu mảnh bên trong đáy thẻ */}
      <div
        className="h-[3px] w-full overflow-hidden bg-border/50"
        aria-hidden="true"
      >
        {tone === "loading" ? (
          <div
            className={`cloudy-toast-indeterminate h-full w-1/3 rounded-full ${style.progressColor}`}
          />
        ) : showProgress ? (
          <div
            key={`${item.id}-${item.type}`}
            className={`cloudy-toast-progress h-full w-full rounded-full group-hover:[animation-play-state:paused] ${style.progressColor}`}
            style={{ animationDuration: `${duration}ms` }}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ToastProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tránh render container toast trong SSR HTML để không bị browser extension chèn attribute gây Hydration Mismatch
  if (!mounted) {
    return null;
  }

  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
      containerStyle={{
        top: 76,
        right: 20,
        left: 20,
        zIndex: 9999,
      }}
      toastOptions={{
        duration: 4200,
        error: {
          duration: 5000,
        },
        loading: {
          duration: Infinity,
        },
      }}
    >
      {(t) =>
        t.type === "custom" ? (
          <div className="pointer-events-auto">
            {resolveValue(t.message, t)}
          </div>
        ) : (
          <CloudyToastCard item={t} />
        )
      }
    </Toaster>
  );
}
