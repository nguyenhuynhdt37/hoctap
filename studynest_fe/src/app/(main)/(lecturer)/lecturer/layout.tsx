import LecturerHeader from "@/components/lecturer/shared/header";
import Footer from "@/components/user/footer";
import { getServerCookie } from "@/lib/utils/fetcher/server/cookieStore";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { NotificationWS } from "@/provider/notification-ws";
import { InitRealtimeNoti } from "@/provider/NotificationHydrator";
import { NotificationsResponse } from "@/types/user/notification";
import { cookies } from "next/headers";
import { ReactNode, Suspense } from "react";

async function LecturerNotificationsBootstrap() {
  const stores = await cookies();
  const accessToken = getServerCookie(stores, "access_token");
  let notifications: NotificationsResponse | null = null;

  if (accessToken) {
    try {
      const resGetNotifications = await fetcher(
        "/notifications/lecturer?page=1&limit=10&sort_by=created_at&order_dir=desc",
        stores
      );

      if (resGetNotifications.ok) {
        notifications = await resGetNotifications.json();
      }
    } catch {
      // Không chặn render layout nếu dịch vụ thông báo tạm thời gián đoạn
    }
  }

  return (
    <>
      <InitRealtimeNoti role="LECTURER" notifications={notifications} />
      <NotificationWS
        role_name="LECTURER"
        accessToken={accessToken || null}
      />
    </>
  );
}

export default function LecturerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <LecturerHeader />
      <Suspense fallback={null}>
        <LecturerNotificationsBootstrap />
      </Suspense>
      <div className="min-h-screen bg-background text-foreground">{children}</div>
      <Footer />
    </>
  );
}
