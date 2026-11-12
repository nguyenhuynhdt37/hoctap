import { getServerCookie } from "@/lib/utils/fetcher/server/cookieStore";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { NotificationWS } from "@/provider/notification-ws";
import { InitRealtimeNoti } from "@/provider/NotificationHydrator";
import { NotificationsResponse } from "@/types/user/notification";
import { cookies } from "next/headers";
import { ReactNode, Suspense } from "react";
import { AdminLayoutClient } from "./layout-client";

async function AdminNotificationsBootstrap() {
  const stores = await cookies();
  const accessToken = getServerCookie(stores, "access_token");
  let notifications: NotificationsResponse | null = null;

  if (accessToken) {
    try {
      const res_getNotifications = await fetcher(
        "/notifications/admin?page=1&limit=20&sort_by=created_at&order_dir=desc",
        stores
      );

      if (res_getNotifications.ok) {
        notifications = await res_getNotifications.json();
      }
    } catch {
      // Notifications must not block or fail page navigation.
    }
  }

  return <InitRealtimeNoti role="ADMIN" notifications={notifications} />;
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const stores = await cookies();
  const accessToken = getServerCookie(stores, "access_token");
  return (
    <>
      <Suspense fallback={null}>
        <AdminNotificationsBootstrap />
      </Suspense>
      <Suspense fallback={null}>
        <NotificationWS role_name="ADMIN" accessToken={accessToken || null} />
      </Suspense>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </>
  );
}
