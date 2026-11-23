"use client";

import { useAuthBootstrapStatus } from "@/hooks/auth/useAuthedSWR";
import { markLoggedInHint, readLoggedInHint, useHubAuthStatus } from "@/lib/learning-hub/hooks";
import { useUserStore } from "@/stores/user";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { LearnerHome } from "./home";
import { LearnerHomeSkeleton } from "./home/sky-hero";
import { HubLoadError } from "./hub-page-state";

function subscribeToHint(listener: () => void) {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

export function RootGate({ landing }: { landing: ReactNode }) {
  const user = useUserStore((state) => state.user);
  const authStatus = useHubAuthStatus();
  const retry = useAuthBootstrapStatus((state) => state.retry);
  const knownBrowser = useSyncExternalStore(subscribeToHint, readLoggedInHint, () => false);

  useEffect(() => {
    if (authStatus === "ready" && user) markLoggedInHint();
  }, [authStatus, user]);

  if (authStatus === "pending") return <main className="bg-background"><LearnerHomeSkeleton /></main>;
  if (authStatus === "ready") return user ? <LearnerHome key={user.id} /> : landing;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <HubLoadError
        title="Chưa xác minh được phiên đăng nhập"
        message={knownBrowser ? "Tải lại để mở hành trình của bạn." : "Tải lại để mở trang chủ."}
        onRetry={retry ?? (() => window.location.reload())}
      />
    </main>
  );
}
