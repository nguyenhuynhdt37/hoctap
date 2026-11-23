"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { isDpopMode } from "@/lib/auth/mode";
import { isUserProtectedPath, userRoles } from "@/lib/auth/routes";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function UserRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!isDpopMode || !isUserProtectedPath(pathname)) return children;

  return <RequireAuth roles={userRoles}>{children}</RequireAuth>;
}
