"use client";
import { useUserStore } from "@/stores/user";
import { User } from "@/types/user/user";
import api from "@/lib/utils/fetcher/client/axios";
import { isSessionExpired } from "@/lib/utils/fetcher/client/refresh-session";
import { useEffect } from "react";

interface UserProviderProps {
  children: React.ReactNode;
  user: User | null;
  recoverSession?: boolean;
  deferHydration?: boolean;
}
export default function UserProvider({ children, user, recoverSession, deferHydration }: UserProviderProps) {
  const setUser = useUserStore(s => s.setUser);
  useEffect(() => {
    if (deferHydration) return;
    if (!recoverSession) { setUser(user); return; }
    let active = true;
    api.get<User>("/auth/me").then(response => {
      if (active) setUser(response.data);
    }).catch(error => {
      if (active && isSessionExpired(error)) setUser(null);
    });
    return () => { active = false; };
  }, [user, recoverSession, deferHydration, setUser]);
  return <>{children}</>;
}
