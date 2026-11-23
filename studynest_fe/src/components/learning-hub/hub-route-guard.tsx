"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { useCookieUserStatus } from "@/components/shared/user-loader";
import { isDpopMode } from "@/lib/auth/mode";
import { loginRedirect, userRoles } from "@/lib/auth/routes";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";
import { useUserStore } from "@/stores/user";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { HubLoadError, HubPageSkeleton } from "./hub-page-state";

/**
 * Auth guard for new Learning Hub routes (/review, /mastery, /goals)
 * without modifying src/lib/auth/routes.ts or middleware.ts.
 */
export function HubRouteGuard({ children }: { children: ReactNode }) {
  const cookieStatus = useCookieUserStatus();
  const user = useUserStore((state) => state.user);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isDpopMode || cookieStatus !== "ready" || user) return;
    const returnTo = sanitizeRedirect(pathname + window.location.search, pathname);
    router.replace(loginRedirect(returnTo));
  }, [cookieStatus, pathname, router, user]);

  if (isDpopMode) {
    return (
      <RequireAuth roles={userRoles} fallback={<HubPageSkeleton />}>
        {children}
      </RequireAuth>
    );
  }

  if (cookieStatus === "unavailable") {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <HubLoadError
          message="Tạm thời chưa thể xác minh phiên đăng nhập."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!user) {
    return <HubPageSkeleton />;
  }

  return <>{children}</>;
}
