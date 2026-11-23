"use client";

import { PageLoadError } from "@/components/shared/page-load-state";
import { useCookieUserStatus } from "@/components/shared/user-loader";
import { Skeleton } from "@/components/ui";
import { useAuthBootstrapStatus, useAuthReady } from "@/hooks/auth/useAuthedSWR";
import { isDpopMode } from "@/lib/auth/mode";
import { useUserStore } from "@/stores/user";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function GuestFormSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="mx-auto grid min-h-[75vh] w-full max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-2">
      <Skeleton className="hidden h-[32rem] lg:block" />
      <div className="mx-auto w-full max-w-md space-y-4 rounded-3xl border border-border bg-surface p-6">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function GuestOnly({ children }: { children: ReactNode }) {
  const authReady = useAuthReady();
  const authStatus = useAuthBootstrapStatus((state) => state.status);
  const retry = useAuthBootstrapStatus((state) => state.retry);
  const cookieStatus = useCookieUserStatus();
  const user = useUserStore((state) => state.user);
  const pathname = usePathname();
  const router = useRouter();
  const [guestAllowed, setGuestAllowed] = useState(false);
  const ready = isDpopMode ? authReady : cookieStatus === "ready";
  const unavailable = (isDpopMode ? authStatus : cookieStatus) === "unavailable";

  useEffect(() => {
    if (guestAllowed || !ready) return;
    if (!user) {
      setGuestAllowed(true);
    } else if (!isDpopMode || (pathname !== "/login" && !user.is_banned)) {
      // AuthBootstrap owns DPoP login redirects and banned accounts.
      router.replace("/");
    }
  }, [guestAllowed, pathname, ready, router, user]);

  // Let the form finish navigation after it creates a session, including OTP.
  if (guestAllowed) return children;
  if (unavailable) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <PageLoadError
          message={isDpopMode
            ? "Tạm thời chưa thể xác minh phiên đăng nhập."
            : "Dịch vụ tạm thời gián đoạn. Vui lòng tải lại trang."}
          onRetry={isDpopMode && retry ? retry : () => window.location.reload()}
        />
      </div>
    );
  }
  return <GuestFormSkeleton />;
}
