import HydrationFix from "@/components/shared/hydration-fix";
import { NotificationToastListener } from "@/components/shared/toast/notification-toast-listener";
import { ToastProvider } from "@/components/shared/toast/toast-provider";
import UserLoader from "@/components/shared/user-loader";
import { getServerCookie } from "@/lib/utils/fetcher/server/cookieStore";
import { QueryProvider } from "@/provider/QueryProvider";
import { cookies } from "next/headers";
import { beVietnamPro, lora } from "./fonts";
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
      className={`${beVietnamPro.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans bg-background text-foreground antialiased selection:bg-[#BFD7ED]/60 selection:text-[#3D4A5A]"
        suppressHydrationWarning
      >
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
