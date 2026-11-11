import axios from "axios";

let refreshing: Promise<void> | null = null;
let latestAccessToken: string | null = null;

export const getLatestAccessToken = (original: string) => {
  if (!latestAccessToken) return null;
  try {
    const payload = (token: string) => JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const current = payload(latestAccessToken), previous = payload(original);
    return current.sub === previous.sub && current.sid === previous.sid ? latestAccessToken : null;
  } catch { return null; }
};
export const isSessionExpired = (error: unknown) =>
  axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0);

/** One rotation for Axios, streamed chat, and WebSocket recovery. */
export function refreshSession(force = false): Promise<void> {
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
