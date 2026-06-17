import LecturerHeader from "@/components/lecturer/shared/header";
import Footer from "@/components/user/footer";
import { getServerCookie } from "@/lib/utils/fetcher/server/cookieStore";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { NotificationWS } from "@/provider/notification-ws";
import { InitRealtimeNoti } from "@/provider/NotificationHydrator";
import { NotificationsResponse } from "@/types/user/notification";
import { cookies } from "next/headers";
import { ReactNode, Suspense } from "react";

export default async function LecturerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const stores = await cookies();
  const accessToken = getServerCookie(stores, "access_token");
  let notifications: NotificationsResponse | null = null;
  if (accessToken) {
    const res_getNotifications = await fetcher(
      "/notifications/lecturer?page=1&limit=10&sort_by=created_at&order_dir=desc",
      stores
    );

    if (res_getNotifications.ok) {
      notifications = await res_getNotifications.json();
    }
  }
  return (
    <>
      <LecturerHeader />
      <InitRealtimeNoti role="LECTURER" notifications={notifications} />
      <Suspense fallback={null}>
        <NotificationWS
          role_name="LECTURER"
          accessToken={accessToken || null}
        />
      </Suspense>
      <div className="min-h-screen bg-gray-50">{children}</div>
      <Footer />
    </>
  );
}
