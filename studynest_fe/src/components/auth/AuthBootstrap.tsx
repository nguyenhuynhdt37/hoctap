"use client";

import { useAuthBootstrapStatus, type AuthStatus } from "@/hooks/auth/useAuthedSWR";
import { isDpopMode } from "@/lib/auth/mode";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";
import { bootstrapSessionOutcome, getAccessToken, onSessionEvent } from "@/lib/auth/session";
import api from "@/lib/utils/fetcher/client/axios";
import { isAuthPath, useAuthModalStore } from "@/stores/auth-modal";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import type { User } from "@/types/user/user";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function AuthBootstrap() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const redirectAfterNewLogin = useRef(false);

  useEffect(() => {
    if (!isDpopMode) {
      return onSessionEvent(({ type }) => {
        if (type === "logout") useRealtimeNotiStore.getState().clearAll();
      });
    }

    let revision = 0;
    let active = true;
    const { setUser, clearUser } = useUserStore.getState();
    const setStatus = (status: AuthStatus) =>
      useAuthBootstrapStatus.setState({ status });
    const clearIdentity = () => {
      clearUser();
      useRealtimeNotiStore.getState().clearAll();
    };

    async function syncUser() {
      const request = ++revision;
      const isCurrent = () => active && request === revision;
      if (!useUserStore.getState().user) {
        setStatus("pending");
      }
      try {
        const outcome = await bootstrapSessionOutcome();
        if (!isCurrent()) return;

        if (outcome === "unavailable") {
          setStatus("unavailable");
          return;
        }
        if (outcome === "authenticated") {
          const { data } = await api.get<User>("/auth/me", { timeout: 15_000 });
          if (!isCurrent()) return;
          const previousUser = useUserStore.getState().user;
          if (previousUser && previousUser.id !== data.id) clearIdentity();
          setUser(data);
        } else {
          clearIdentity();
        }
        setStatus("ready");
      } catch {
        // The Axios interceptor handles terminal 401 codes through the logout event.
        if (isCurrent()) setStatus("unavailable");
      }
    }

    const unsubscribe = onSessionEvent(({ type }) => {
      if (type === "logout") {
        revision++;
        redirectAfterNewLogin.current = false;
        clearIdentity();
        setStatus("ready");
      } else if (type === "login") {
        if (useAuthBootstrapStatus.getState().status === "ready" && window.location.pathname === "/login") {
          redirectAfterNewLogin.current = true;
        }
        useRealtimeNotiStore.getState().clearAll();
        void syncUser();
      } else if (useAuthBootstrapStatus.getState().status === "unavailable" && getAccessToken()) {
        void syncUser();
      }
    });

    useAuthBootstrapStatus.setState({ retry: syncUser });
    void syncUser();
    return () => {
      active = false;
      unsubscribe();
      useAuthBootstrapStatus.setState({ retry: undefined });
    };
  }, []);

  // Remember the last real page so dialog-based flows (e.g. GitHub) can return to it.
  useEffect(() => {
    if (!isAuthPath(pathname)) {
      useAuthModalStore.getState().setReturnTo(`${pathname}${window.location.search}`);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isDpopMode || !user) return;
    if (pathname !== "/login") redirectAfterNewLogin.current = false;
    if (user.is_banned && pathname !== "/banned") router.replace("/banned");
    // In the login dialog the URL is /login but the page underneath is the real destination.
    else if (pathname === "/login" && !useAuthModalStore.getState().open) {
      const destination = redirectAfterNewLogin.current
        ? sanitizeRedirect(new URLSearchParams(window.location.search).get("redirect"))
        : "/";
      router.replace(new URL(destination, window.location.origin).pathname === "/login" ? "/" : destination);
    }
  }, [pathname, router, user]);

  return null;
}

export default AuthBootstrap;
