import RequireAuth from "@/components/auth/RequireAuth";
import { NotificationWS } from "@/provider/notification-ws";
import { RoleNotificationsBootstrap } from "@/provider/NotificationHydrator";
import type { ReactNode } from "react";
import { AdminLayoutClient } from "./layout-client";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireAuth roles={["ADMIN"]}>
      <RoleNotificationsBootstrap role="ADMIN" />
      <NotificationWS role_name="ADMIN" />
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </RequireAuth>
  );
}
