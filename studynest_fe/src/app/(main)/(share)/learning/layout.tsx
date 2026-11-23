import RequireAuth from "@/components/auth/RequireAuth";
import { userRoles } from "@/lib/auth/routes";
import { NotificationWS } from "@/provider/notification-ws";
import { UserNotificationsBootstrap } from "@/provider/NotificationHydrator";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireAuth roles={userRoles}>
      <UserNotificationsBootstrap />
      <NotificationWS role_name="USER" />
      {children}
    </RequireAuth>
  );
}
