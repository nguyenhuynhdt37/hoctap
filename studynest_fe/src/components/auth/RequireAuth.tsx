"use client";

import { PageLoadError } from "@/components/shared/page-load-state";
import { Skeleton } from "@/components/ui/states";
import { useAuthBootstrapStatus } from "@/hooks/auth/useAuthedSWR";
import { isDpopMode } from "@/lib/auth/mode";
import { loginRedirect, protectedDestination, type AuthRole } from "@/lib/auth/routes";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";
import { useUserStore } from "@/stores/user";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface RequireAuthProps {
  children: ReactNode;
  roles?: AuthRole[];
  fallback?: ReactNode;
}

function AuthSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="mx-auto min-h-[50vh] max-w-6xl space-y-4 px-4 py-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-36 w-full" />
    </div>
  );
}

export function RequireAuth({ children, roles, fallback = <AuthSkeleton /> }: RequireAuthProps) {
  const status = useAuthBootstrapStatus((state) => state.status);
  const retry = useAuthBootstrapStatus((state) => state.retry);
  const user = useUserStore((state) => state.user);
  const pathname = usePathname();
  const router = useRouter();
  const destination = protectedDestination(pathname, user, roles);

  useEffect(() => {
    if (!isDpopMode || status !== "ready" || !destination) return;
    if (destination === "/login") {
      const returnTo = sanitizeRedirect(pathname + window.location.search, pathname);
      router.replace(loginRedirect(returnTo));
    } else {
      router.replace(destination);
    }
  }, [destination, pathname, router, status]);

  if (!isDpopMode) return children;
  if (status === "unavailable" && retry) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <PageLoadError message="Tạm thời chưa thể xác minh phiên đăng nhập." onRetry={retry} />
      </div>
    );
  }
  if (status !== "ready" || destination) return fallback;
  return children;
}

export default RequireAuth;
