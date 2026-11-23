import axios from "axios";
import { isTerminalAuthCode, readAuthCode } from "@/lib/auth/http";
import { isDpopMode } from "@/lib/auth/mode";
import { refreshSession as refreshDpopSession } from "@/lib/auth/session";

let refreshing: Promise<void> | null = null;
let latestAccessToken: string | null = null;

export const getLatestAccessToken = (original: string) => {
  if (isDpopMode || !latestAccessToken) return null;
  const latest = latestAccessToken;
  try {
    const payload = (token: string) => JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const current = payload(latest), previous = payload(original);
    return current.sub === previous.sub && current.sid === previous.sid ? latest : null;
  } catch { return null; }
};
export const isSessionExpired = (error: unknown) =>
  axios.isAxiosError(error) && (isDpopMode
    ? error.response?.status === 401 && isTerminalAuthCode(readAuthCode(error.response.data))
    : [401, 403].includes(error.response?.status ?? 0));

/** One rotation for Axios, streamed chat, and WebSocket recovery. */
export function refreshSession(force = false): Promise<void> {
  if (isDpopMode) {
    return refreshDpopSession().then(ok => {
      if (!ok) throw new Error("Chưa thể làm mới phiên. Vui lòng thử lại.");
    });
  }
  if (refreshing) return refreshing;
  const refresh = async () => {
    // Another tab or middleware may already have updated the HttpOnly cookies.
    if (!force) {
      try {
        await axios.get("/api/auth/me", { withCredentials: true, timeout: 15000 });
        return;
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
      }
    }
    const response = await axios.post("/api/auth/refresh", {}, {
      withCredentials: true, timeout: 15000,
    });
    latestAccessToken = response.data.access_token;
  };
  const run = async (): Promise<void> => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      await navigator.locks.request("studynest-auth-refresh", refresh);
    } else await refresh();
  };
  const pending = run().finally(() => { refreshing = null; });
  refreshing = pending;
  return pending;
}
