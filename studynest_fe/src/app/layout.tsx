import HydrationFix from "@/components/shared/hydration-fix";
import { NotificationToastListener } from "@/components/shared/toast/notification-toast-listener";
import { ToastProvider } from "@/components/shared/toast/toast-provider";
import UserLoader from "@/components/shared/user-loader";
import { getServerCookie } from "@/lib/utils/fetcher/server/cookieStore";
import { QueryProvider } from "@/provider/QueryProvider";
import { cookies } from "next/headers";
import { jakarta } from "./fonts";
import "./globals.css";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const stores = await cookies();
  const accessToken = getServerCookie(stores, "access_token");
  return (
    <html
      lang="vi"
      className={jakarta.variable}
      style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
      suppressHydrationWarning
    >
      <body className="font-sans" suppressHydrationWarning>
        <HydrationFix />
        <QueryProvider>
          <ToastProvider />
          <NotificationToastListener />
          <UserLoader>{children}</UserLoader>
        </QueryProvider>
      </body>
    </html>
  );
}
