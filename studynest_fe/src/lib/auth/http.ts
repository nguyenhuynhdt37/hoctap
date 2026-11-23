const backend = parseBackendUrl(process.env.NEXT_PUBLIC_URL_BACKEND || "http://127.0.0.1:8000");
const configuredOrigin = process.env.NEXT_PUBLIC_DPOP_API_ORIGIN;
const configuredPrefix = process.env.NEXT_PUBLIC_DPOP_API_PATH_PREFIX;
const publicUrl = configuredOrigin ? parseBackendUrl(configuredOrigin) : backend;
const publicOrigin = configuredOrigin && publicUrl?.pathname !== "/" ? undefined : publicUrl?.origin;
const backendPrefix = backend?.pathname.replace(/\/+$/, "") ?? "";
const publicPrefix = configuredPrefix === undefined ? backendPrefix : parsePrefix(configuredPrefix);
const publicApiPath = publicPrefix === undefined ? undefined : `${publicPrefix}/api/v1`;
const backendApiPath = `${backendPrefix}/api/v1`;
const configuredSocket = process.env.NEXT_PUBLIC_URL_BACKEND_WS;
const socketBackend = parseBackendUrl(configuredSocket, true);

function parseBackendUrl(value?: string, allowWebSocket = false): URL | undefined {
  if (!value || /[?#]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (allowWebSocket && url.protocol === "ws:") url.protocol = "http:";
    if (allowWebSocket && url.protocol === "wss:") url.protocol = "https:";
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
        /%(?![0-9a-f]{2})/i.test(url.pathname)) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function parsePrefix(value: string): string | undefined {
  if (value === "") return "";
  if (!/^\/(?!\/)[^?#\\]*$/.test(value)) return undefined;
  const parsed = parseBackendUrl(`https://config.invalid${value}`);
  return parsed?.pathname === value ? value.replace(/\/+$/, "") : undefined;
}

if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_AUTH_MODE === "dpop") {
  if (!backend || !publicOrigin || publicApiPath === undefined ||
      (configuredSocket && !socketBackend)) {
    console.warn("[DPoP] Kiểm tra cấu hình URL backend, public origin và prefix API.");
  } else if (backend.origin !== publicOrigin || (socketBackend && socketBackend.origin !== publicOrigin)) {
    console.warn("[DPoP] Origin backend khác origin công khai dùng để ký. Kiểm tra PUBLIC_API_URL và đường dẫn qua proxy.");
  }
}

export function getDpopApiTarget(input: string): string | null {
  if (typeof window === "undefined" || !publicOrigin || !publicApiPath) return null;
  let request: URL;
  try {
    request = new URL(input, window.location.href);
  } catch {
    return null;
  }
  if (request.username || request.password) return null;
  const { origin, pathname } = request;
  if (backend && origin === window.location.origin && pathname.startsWith("/api/")) {
    // Next rewrites /api/* to the configured backend base followed by /api/v1/*.
    return publicOrigin + publicApiPath + pathname.slice("/api".length);
  }
  if (origin === publicOrigin && pathname.startsWith(`${publicApiPath}/`)) return origin + pathname;
  if (origin === backend?.origin && pathname.startsWith(`${backendApiPath}/`)) {
    return publicOrigin + publicApiPath + pathname.slice(backendApiPath.length);
  }
  return null;
}

export function getDpopSocketBase(): string {
  if (!publicOrigin || publicPrefix === undefined || (configuredSocket && !socketBackend)) {
    throw new Error("Cấu hình WebSocket DPoP không hợp lệ.");
  }
  return socketBackend?.href.replace(/\/+$/, "") ?? publicOrigin + publicPrefix;
}

export function getDpopSocketTarget(socket: URL): string | null {
  if (!publicOrigin || !publicApiPath || (process.env.NODE_ENV === "production" && socket.protocol !== "wss:")) return null;
  const http = parseBackendUrl(socket.origin, true);
  if (!http || ![publicOrigin, backend?.origin, socketBackend?.origin].includes(http.origin)) return null;
  const socketPrefix = socketBackend?.origin === http.origin
    ? socketBackend.pathname.replace(/\/+$/, "")
    : backendPrefix;
  const socketApiPath = `${socketPrefix}/api/v1`;
  const { pathname } = socket;
  if (http.origin === publicOrigin && pathname.startsWith(`${publicApiPath}/`)) return publicOrigin + pathname;
  if (pathname.startsWith(`${socketApiPath}/`)) {
    return publicOrigin + publicApiPath + pathname.slice(socketApiPath.length);
  }
  return publicOrigin + pathname;
}

const SESSION_ENDPOINTS = new Set([
  "login", "google", "verify-email", "verify-otp", "refresh", "github/start", "github/exchange",
]);

export function isSessionEndpoint(target: string): boolean {
  const path = new URL(target).pathname.replace(/\/$/, "");
  const authPath = `${publicApiPath}/auth/`;
  return path.startsWith(authPath) && SESSION_ENDPOINTS.has(path.slice(authPath.length));
}

export function readAuthCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("code" in body)) return undefined;
  return typeof body.code === "string" ? body.code : undefined;
}

export function isTerminalAuthCode(code: string | undefined): boolean {
  return code === "session_revoked" || code === "invalid_token";
}
