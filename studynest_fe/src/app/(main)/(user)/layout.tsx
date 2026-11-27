import { LevelUpCelebration } from "@/components/learning-hub/levels/level-up-celebration";
import { UserRouteGuard } from "@/components/auth/UserRouteGuard";
import Header from "@/components/user/header";
import { UserPageFrame } from "@/components/user/user-page-frame";
import { NotificationWS } from "@/provider/notification-ws";
import { UserNotificationsBootstrap } from "@/provider/NotificationHydrator";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <UserNotificationsBootstrap />
      <NotificationWS role_name="USER" />
      <Header />
      <UserPageFrame>
        <UserRouteGuard>
          <Suspense fallback={null}>{children}</Suspense>
        </UserRouteGuard>
      </UserPageFrame>
      <LevelUpCelebration />
    </>
  );
}
