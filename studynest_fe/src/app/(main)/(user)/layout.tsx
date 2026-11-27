import { LevelUpCelebration } from "@/components/learning-hub/levels/level-up-celebration";
import { UserRouteGuard } from "@/components/auth/UserRouteGuard";
import Footer from "@/components/user/footer";
import Header from "@/components/user/header";
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
      <div className="min-h-[55vh] min-w-0">
        <UserRouteGuard>
          <Suspense fallback={null}>{children}</Suspense>
        </UserRouteGuard>
      </div>
      <Footer />
      <LevelUpCelebration />
    </>
  );
}
