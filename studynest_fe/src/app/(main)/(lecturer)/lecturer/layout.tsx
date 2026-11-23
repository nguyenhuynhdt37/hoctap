import RequireAuth from "@/components/auth/RequireAuth";
import LecturerShell from "@/components/lecturer/shared/header";
import { NotificationWS } from "@/provider/notification-ws";
import { RoleNotificationsBootstrap } from "@/provider/NotificationHydrator";
import type { ReactNode } from "react";

export default function LecturerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireAuth roles={["LECTURER"]}>
      <LecturerShell>
        <RoleNotificationsBootstrap role="LECTURER" />
        <NotificationWS role_name="LECTURER" />
        {children}
      </LecturerShell>
    </RequireAuth>
  );
}
