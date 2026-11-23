import api from "@/lib/utils/fetcher/client/axios";
import { isDpopMode } from "./mode";
import { bootstrapSession, clearMatchingSession, clearSession, getAccessSession } from "./session";
import { readAuthRecord } from "./storage";

export async function logoutEverywhere(): Promise<void> {
  if (!isDpopMode) {
    await api.post("/auth/logout");
    await clearSession();
    return;
  }

  const id = getAccessSession()?.id ?? (await readAuthRecord().catch(() => undefined))?.id;
  if (!id) {
    await clearSession();
    return;
  }
  try {
    if (!getAccessSession()) await bootstrapSession();
    if (getAccessSession()?.id === id) {
      const config = { dpopSessionId: id, timeout: 15000 };
      await api.post("/auth/logout", undefined, config);
    }
  } finally {
    await clearMatchingSession(id);
  }
}
