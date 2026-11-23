"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "maymay:device_notifications_enabled";
const SW_PATH = "/sw-notifications.js";
const DEFAULT_ICON_PNG = "/logo/maymay-app-icon-1024.png";
const DEFAULT_BANNER_PNG = "/logo/maymay-og.png";

export type DevicePermission = NotificationPermission | "unsupported";

export interface DeviceNotificationPayload {
  id?: string;
  title: string;
  body: string;
  url?: string | null;
  icon?: string | null;
  image?: string | null;
}

type ExtendedNotificationOptions = NotificationOptions & {
  image?: string;
};

export interface DeviceNotificationResult {
  ok: boolean;
  via: "sw" | "window" | "blocked" | "dedup";
  reason?: string;
}

const deliveredIds = new Set<string>();
let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function isDeviceNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getDevicePermission(): DevicePermission {
  if (!isDeviceNotificationSupported()) return "unsupported";
  return window.Notification.permission;
}

export function isDeviceNotificationEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return getDevicePermission() === "granted";
    return raw === "true";
  } catch {
    return getDevicePermission() === "granted";
  }
}

export function setDeviceNotificationEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    window.dispatchEvent(new Event("maymay:device-noti-change"));
  } catch {
    // Bỏ qua lỗi quota / private mode
  }
}

export async function ensureNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register(SW_PATH, { scope: "/" })
      .then(async (reg) => {
        if (reg.active) return reg;
        try {
          return await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<ServiceWorkerRegistration>((resolve) =>
              window.setTimeout(() => resolve(reg), 1500),
            ),
          ]);
        } catch {
          return reg;
        }
      })
      .catch(() => null);
  }
  return swRegistrationPromise;
}

export async function requestDeviceNotificationPermission(): Promise<DevicePermission> {
  if (!isDeviceNotificationSupported()) return "unsupported";
  try {
    const permission = await window.Notification.requestPermission();
    if (permission === "granted") {
      setDeviceNotificationEnabled(true);
      void ensureNotificationServiceWorker();
    } else {
      window.dispatchEvent(new Event("maymay:device-noti-change"));
    }
    return permission;
  } catch {
    return getDevicePermission();
  }
}

function safeTargetUrl(url?: string | null): string {
  if (!url) return "/notifications";
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.origin === window.location.origin) return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    // fallback
  }
  return "/notifications";
}

/**
 * Hiển thị thông báo gốc trên thiết bị (OS Notification Center / Desktop Notification).
 * Dùng `new window.Notification` ngay lập tức nếu SW chưa active để đảm bảo luôn bật trên macOS/Windows.
 */
export async function showDeviceNotification(
  payload: DeviceNotificationPayload,
  options?: { force?: boolean },
): Promise<DeviceNotificationResult> {
  if (!isDeviceNotificationSupported()) {
    return { ok: false, via: "blocked", reason: "Trình duyệt không hỗ trợ Web Notification API." };
  }
  if (window.Notification.permission !== "granted") {
    return {
      ok: false,
      via: "blocked",
      reason:
        window.Notification.permission === "denied"
          ? "Trình duyệt đang chặn quyền thông báo."
          : "Chưa cấp quyền thông báo cho trình duyệt.",
    };
  }
  if (!options?.force && !isDeviceNotificationEnabled()) {
    return { ok: false, via: "blocked", reason: "Bạn đang tạm tắt thông báo trên thiết bị." };
  }

  const dedupId = payload.id ? String(payload.id) : null;
  if (dedupId) {
    if (deliveredIds.has(dedupId)) {
      return { ok: true, via: "dedup" };
    }
    deliveredIds.add(dedupId);
    if (deliveredIds.size > 200) {
      const oldest = deliveredIds.values().next().value;
      if (oldest) deliveredIds.delete(oldest);
    }
  }

function toAbsoluteAssetUrl(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  if (typeof window === "undefined") return src;
  try {
    return new URL(src, window.location.origin).href;
  } catch {
    return src;
  }
}

  const targetUrl = safeTargetUrl(payload.url);
  const title = payload.title?.trim() || "Thông báo mới từ Mây Mây";
  const body = payload.body?.trim() || "";
  const tag = dedupId ? `maymay-${dedupId}` : `maymay-${Date.now()}`;
  const iconUrl = toAbsoluteAssetUrl(payload.icon || DEFAULT_ICON_PNG);
  const badgeUrl = toAbsoluteAssetUrl(DEFAULT_ICON_PNG);
  const imageUrl = toAbsoluteAssetUrl(payload.image || DEFAULT_BANNER_PNG);

  const notiOptions: ExtendedNotificationOptions = {
    body,
    icon: iconUrl,
    badge: badgeUrl,
    image: imageUrl,
    tag,
    data: { url: targetUrl },
  };

  // Ưu tiên Service Worker nếu đã active (hỗ trợ đầy đủ icon + badge + image trên Chrome/macOS/Windows)
  try {
    const reg = await ensureNotificationServiceWorker();
    if (reg?.active && typeof reg.showNotification === "function") {
      await reg.showNotification(title, notiOptions);
      return { ok: true, via: "sw" };
    }
  } catch {
    // Fallback sang window.Notification bên dưới
  }

  try {
    const nativeNoti = new window.Notification(title, notiOptions);
    nativeNoti.onclick = () => {
      window.focus();
      if (targetUrl && window.location.pathname + window.location.search !== targetUrl) {
        window.location.assign(targetUrl);
      }
      nativeNoti.close();
    };
    return { ok: true, via: "window" };
  } catch (err) {
    return {
      ok: false,
      via: "blocked",
      reason: err instanceof Error ? err.message : "Không thể khởi tạo thông báo thiết bị.",
    };
  }
}

export function useDeviceNotifications() {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<DevicePermission>("default");
  const [enabled, setEnabled] = useState<boolean>(false);
  const [requesting, setRequesting] = useState(false);

  const sync = useCallback(() => {
    const perm = getDevicePermission();
    setPermission(perm);
    setEnabled(perm === "granted" && isDeviceNotificationEnabled());
  }, []);

  useEffect(() => {
    setMounted(true);
    sync();
    if (getDevicePermission() === "granted") {
      void ensureNotificationServiceWorker();
    }
    window.addEventListener("maymay:device-noti-change", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("maymay:device-noti-change", sync);
      window.removeEventListener("focus", sync);
    };
  }, [sync]);

  const enable = useCallback(async () => {
    setRequesting(true);
    try {
      const perm = await requestDeviceNotificationPermission();
      if (perm === "granted") {
        setDeviceNotificationEnabled(true);
      }
      sync();
      return perm;
    } finally {
      setRequesting(false);
    }
  }, [sync]);

  const toggle = useCallback(async () => {
    if (permission !== "granted") {
      return enable();
    }
    const next = !enabled;
    setDeviceNotificationEnabled(next);
    sync();
    return permission;
  }, [permission, enabled, enable, sync]);

  return {
    mounted,
    supported: mounted ? permission !== "unsupported" : true,
    permission,
    enabled: mounted && permission === "granted" && enabled,
    requesting,
    enable,
    toggle,
  };
}
