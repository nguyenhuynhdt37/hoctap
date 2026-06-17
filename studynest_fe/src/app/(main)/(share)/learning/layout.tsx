import { getServerCookie } from "@/lib/utils/fetcher/server/cookieStore";
import { NotificationWS } from "@/provider/notification-ws";
import { cookies } from "next/headers";
import { Suspense } from "react";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const stores = await cookies();
  const accessToken = getServerCookie(stores, "access_token");
  return (
    <>
      <Suspense fallback={null}>
        <NotificationWS role_name="USER" accessToken={accessToken || null} />
      </Suspense>
      {children}
    </>
  );
}
