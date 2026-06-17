import Footer from "@/components/user/footer";
import Header from "@/components/user/header";
import FloatingChatButton from "@/components/user/chat-sql/floating-button";
import { getServerCookie } from "@/lib/utils/fetcher/server/cookieStore";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { NotificationWS } from "@/provider/notification-ws";
import { InitRealtimeNoti } from "@/provider/NotificationHydrator";
import { NotificationsResponse } from "@/types/user/notification";
import { cookies } from "next/headers";
import { Suspense } from "react";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const stores = await cookies();
  const accessToken = getServerCookie(stores, "access_token");
  let notifications: NotificationsResponse | null = null;
  if (accessToken) {
    const res_getNotifications = await fetcher(
      "/notifications/user?limit=10&page=1&sort_by=created_at&order_dir=desc",
      stores
    );

    if (res_getNotifications.ok) {
      notifications = await res_getNotifications.json();
    }
  }
  return (
    <>
      <Header />
      <InitRealtimeNoti role="USER" notifications={notifications} />
      <Suspense fallback={null}>
        <NotificationWS role_name="USER" accessToken={accessToken || null} />
      </Suspense>
      {children}
      <Footer />
      {/* Chat SQL Floating Button - chỉ hiện khi đã đăng nhập */}
      {accessToken && <FloatingChatButton />}
    </>
  );
}
