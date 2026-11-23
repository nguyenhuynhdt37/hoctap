"use client";

import { useState } from "react";
import { Bell, BellOff, BellRing, Check, CircleAlert, Send } from "pulsoicon-react";
import { Button } from "@/components/ui";
import {
  showDeviceNotification,
  useDeviceNotifications,
} from "@/lib/notifications/device-notifications";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { cn } from "@/lib/utils";

export function DeviceNotificationBanner({ compact = false }: { compact?: boolean }) {
  const { mounted, supported, permission, enabled, requesting, enable, toggle } = useDeviceNotifications();
  const [testing, setTesting] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  async function handleEnableOrToggle() {
    setStatusNote(null);
    const wasEnabled = enabled;
    const result = await toggle();
    if (result === "granted" && !wasEnabled) {
      const fired = await showDeviceNotification(
        {
          title: "Đã bật thông báo thiết bị Mây Mây",
          body: "Bạn sẽ nhận thông báo ngay trên thiết bị khi có câu trả lời hỏi đáp, quà tặng hoặc cập nhật mới.",
          url: "/notifications",
        },
        { force: true },
      );
      if (fired.ok) {
        setStatusNote(
          "Đã gửi thông báo chào mừng ra thiết bị! Nếu bạn chưa thấy popup góc màn hình trên macOS, hãy kiểm tra System Settings → Notifications → Google Chrome (cho phép Alerts/Banners và tắt Do Not Disturb).",
        );
        showToast.success("Đã bật thông báo trên thiết bị!");
      } else {
        setStatusNote(fired.reason ?? "Không thể hiển thị thông báo trên thiết bị.");
      }
    } else if (result === "denied") {
      setStatusNote(
        "Trình duyệt đang chặn thông báo. Hãy bấm biểu tượng cài đặt bên trái thanh địa chỉ (localhost:3000) → Notifications → Allow rồi tải lại trang.",
      );
      showToast.error("Trình duyệt đang chặn quyền thông báo.");
    }
  }

  async function handleSendTest() {
    if (testing) return;
    setStatusNote(null);
    if (permission !== "granted") {
      const perm = await enable();
      if (perm !== "granted") {
        setStatusNote("Bạn cần bấm 'Allow / Cho phép' trên hộp thoại trình duyệt trước khi gửi thử.");
        return;
      }
    }
    setTesting(true);
    try {
      const res = await api.post<{ notification_id?: string }>("/notifications/test-device");
      const notiId = res.data?.notification_id;
      // Gọi showDeviceNotification với cùng notiId (chống trùng nếu WS đã kịp bắn trước đó)
      window.setTimeout(async () => {
        const fired = await showDeviceNotification(
          {
            id: notiId,
            title: "Thông báo thiết bị Mây Mây đã sẵn sàng!",
            body: "Hệ thống thông báo realtime và thông báo thiết bị của bạn đang hoạt động chuẩn xác.",
            url: "/notifications",
          },
          { force: true },
        );
        if (fired.ok) {
          setStatusNote(
            "Đã phát thông báo ra hệ điều hành! Nếu góc màn hình chưa hiện banner, hãy kiểm tra quyền Notifications của trình duyệt trong cài đặt hệ điều hành (macOS/Windows) và tắt chế độ Không làm phiền (Focus/DND).",
          );
        } else {
          setStatusNote(fired.reason ?? "Không thể phát thông báo ra thiết bị.");
        }
      }, 350);
    } catch {
      showToast.error("Không thể gửi thông báo thử nghiệm lúc này.");
    } finally {
      setTesting(false);
    }
  }

  if (!mounted || !supported) {
    return null;
  }

  if (compact) {
    if (enabled) return null;
    return (
      <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-2xl border border-primary-pastel/80 bg-primary-light/60 px-3 py-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-primary">
          <BellRing className="size-3.5 shrink-0" animated={false} aria-hidden="true" />
          <span className="truncate">
            {permission === "denied"
              ? "Thông báo thiết bị đang bị chặn"
              : "Bật thông báo trực tiếp trên thiết bị"}
          </span>
        </span>
        {permission !== "denied" && (
          <button
            type="button"
            disabled={requesting}
            onClick={() => void handleEnableOrToggle()}
            className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground hover:bg-primary-hover cursor-pointer"
          >
            Bật ngay
          </button>
        )}
      </div>
    );
  }

  return (
    <section
      aria-label="Cài đặt thông báo thiết bị"
      className={cn(
        "relative overflow-hidden rounded-[24px] border p-5 shadow-2xs transition-colors",
        enabled
          ? "border-primary-pastel bg-gradient-to-r from-primary-light/70 via-surface to-accent/35"
          : permission === "denied"
            ? "border-warning-border bg-warning-bg/50"
            : "border-primary-pastel/80 bg-gradient-to-r from-primary-light/50 via-surface to-secondary/30",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-2xl border shadow-2xs",
              enabled
                ? "border-primary-pastel bg-primary text-primary-foreground"
                : permission === "denied"
                  ? "border-warning-border bg-warning-bg text-warning-foreground"
                  : "border-primary-pastel bg-surface text-primary",
            )}
          >
            {enabled ? (
              <BellRing className="size-5" animated={false} aria-hidden="true" />
            ) : permission === "denied" ? (
              <CircleAlert className="size-5" animated={false} aria-hidden="true" />
            ) : (
              <Bell className="size-5" animated={false} aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-foreground">
                Thông báo trực tiếp trên thiết bị
              </h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                  enabled
                    ? "border border-success-border bg-success-bg text-success-foreground"
                    : permission === "denied"
                      ? "border border-warning-border bg-warning-bg text-warning-foreground"
                      : "border border-border bg-background text-muted-foreground",
                )}
              >
                {enabled ? (
                  <>
                    <Check className="size-3" animated={false} aria-hidden="true" />
                    Đang bật
                  </>
                ) : permission === "denied" ? (
                  "Đang bị chặn"
                ) : (
                  "Chưa bật"
                )}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {permission === "denied"
                ? "Trình duyệt đang chặn quyền thông báo. Bấm vào biểu tượng cài đặt bên trái thanh địa chỉ → Cho phép Thông báo rồi tải lại trang."
                : enabled
                  ? "Mọi thông báo hỏi đáp realtime, điểm danh, quà tặng và đơn hàng sẽ hiện ngay trên màn hình thiết bị của bạn."
                  : "Bật quyền để trình duyệt hiện hộp thoại xin phép và gửi thông báo ngay trên máy tính / điện thoại."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {permission !== "denied" && (
            <Button
              type="button"
              variant={enabled ? "outline" : "primary"}
              size="sm"
              isLoading={requesting}
              onClick={() => void handleEnableOrToggle()}
              className="min-h-10 rounded-full px-4 text-xs font-extrabold"
              leftIcon={
                enabled ? (
                  <BellOff className="size-3.5" aria-hidden="true" />
                ) : (
                  <BellRing className="size-3.5" aria-hidden="true" />
                )
              }
            >
              {enabled ? "Tạm tắt trên thiết bị" : "Bật thông báo thiết bị"}
            </Button>
          )}

          <Button
            type="button"
            variant="pastel"
            size="sm"
            isLoading={testing}
            loadingText="Đang gửi..."
            onClick={() => void handleSendTest()}
            className="min-h-10 rounded-full px-4 text-xs font-extrabold"
            leftIcon={<Send className="size-3.5" aria-hidden="true" />}
          >
            Gửi thông báo thử
          </Button>
        </div>
      </div>

      {statusNote && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-primary-pastel/70 bg-surface/90 px-3.5 py-2.5 text-xs leading-relaxed font-medium text-foreground"
        >
          {statusNote}
        </p>
      )}
    </section>
  );
}
