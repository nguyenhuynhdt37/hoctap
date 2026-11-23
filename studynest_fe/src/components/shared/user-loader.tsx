"use client";

import { isDpopMode } from "@/lib/auth/mode";
import { onSessionEvent } from "@/lib/auth/session";
import { refreshSession } from "@/lib/utils/fetcher/client/refresh-session";
import { useUserStore } from "@/stores/user";
import type { User } from "@/types/user/user";
import axios from "axios";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type SessionStatus = "pending" | "ready" | "unavailable";

const CookieUserStatus = createContext<SessionStatus>("pending");

export function useCookieUserStatus(): SessionStatus {
  return useContext(CookieUserStatus);
}

function CookieUserLoader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const guestRoute = pathname === "/login" || pathname === "/register" || pathname === "/email_authentication"
    ? pathname
    : null;
  const [probe, setProbe] = useState<{ guestRoute: string | null; status: SessionStatus }>();

  useEffect(() => {
    const controller = new AbortController();
    const { user, setUser, clearUser } = useUserStore.getState();
    const finish = (status: SessionStatus) => setProbe({ guestRoute, status });

    // A missing session on a public page is expected. Skip the authenticated
    // Axios interceptor, which attempts refresh and may navigate to login.
    const readUser = () => axios.get<User>("/api/auth/me", {
      withCredentials: true,
      signal: controller.signal,
      timeout: 15000,
    });
    void readUser().catch(async (error: unknown) => {
      if (controller.signal.aborted || !user || !axios.isAxiosError(error) || error.response?.status !== 401) {
        throw error;
      }
      // Middleware usually rotates cookies, but navigation may use a prefetched route.
      await refreshSession();
      return readUser();
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setUser(data);
      finish("ready");
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
        clearUser();
        finish("ready");
      } else {
        finish("unavailable");
      }
    });

    const unsubscribe = onSessionEvent(({ type }) => {
      if (type !== "logout") return;
      controller.abort();
      clearUser();
      finish("ready");
    });
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [guestRoute]);

  const status = probe?.guestRoute === guestRoute ? probe.status : "pending";
  return <CookieUserStatus.Provider value={status}>{children}</CookieUserStatus.Provider>;
}

export default function UserLoader({ children }: { children: ReactNode }) {
  return isDpopMode ? <>{children}</> : <CookieUserLoader>{children}</CookieUserLoader>;
}
