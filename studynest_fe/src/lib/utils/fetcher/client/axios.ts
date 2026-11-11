import axios from "axios";
import { isSessionExpired, refreshSession } from "./refresh-session";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let redirecting = false;
api.interceptors.response.use(response => response, async error => {
  const request = error.config;
  if (!request || request._retry || error.response?.status !== 401 ||
      /\/auth\/(refresh|login|google)(?:[/?]|$)/.test(request.url ?? "")) {
    return Promise.reject(error);
  }
  // Mark every waiting request too, so a failed replay cannot start another loop.
  request._retry = true;
  try {
    await refreshSession();
  } catch (refreshError) {
    // A temporary timeout/5xx must not discard a recoverable login session.
    if (isSessionExpired(refreshError) && typeof window !== "undefined" && !redirecting) {
      redirecting = true;
      window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
    return Promise.reject(refreshError);
  }
  return api(request);
});

export default api;
