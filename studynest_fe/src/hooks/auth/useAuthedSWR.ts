"use client";

import { isDpopMode } from "@/lib/auth/mode";
import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";
import { create } from "zustand";

export type AuthStatus = "pending" | "ready" | "unavailable";

export const useAuthBootstrapStatus = create<{ status: AuthStatus; retry?: () => void }>(() => ({
  status: isDpopMode ? "pending" : "ready",
}));

export function useAuthReady(): boolean {
  return useAuthBootstrapStatus((state) => state.status === "ready");
}

export function useAuthedSWR<T>(
  path: string | null,
  options?: SWRConfiguration,
): SWRResponse<T> {
  const authReady = useAuthReady();
  const userId = useUserStore((state) => state.user?.id ?? null);

  return useSWR<T>(
    authReady && path !== null ? [path, userId] as const : null,
    async ([requestPath]) => (await api.get<T>(requestPath)).data,
    options,
  );
}
