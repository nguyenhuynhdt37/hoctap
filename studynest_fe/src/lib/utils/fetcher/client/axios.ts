import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { getDpopApiTarget, isSessionEndpoint, readAuthCode } from "@/lib/auth/http";
import { isDpopMode } from "@/lib/auth/mode";
import {
  authorizeDpopRequest, recoverDpopRequest, type AccessSession,
} from "@/lib/auth/session";
import { isSessionExpired, refreshSession } from "./refresh-session";

interface AuthRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  dpopSessionId?: string;
}

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  // The browser XHR adapter can still send same-origin cookies with false.
  ...(isDpopMode ? { adapter: "fetch", withCredentials: false } : { withCredentials: true }),
});

const signedRequests = new WeakMap<InternalAxiosRequestConfig, AccessSession>();

if (isDpopMode) {
  api.interceptors.request.use(async (config: AuthRequestConfig) => {
    const target = getDpopApiTarget(api.getUri(config));
    config.adapter = "fetch";
    config.withCredentials = false;
    config.withXSRFToken = false;
    config.auth = undefined;
    // The fetch adapter applies fetchOptions again when it sends the Request.
    const fetchOptions: Record<string, unknown> = { ...config.fetchOptions, credentials: "omit", redirect: "error" };
    delete fetchOptions.headers;
    config.fetchOptions = fetchOptions;
    config.headers.delete("Authorization");
    if (target && isSessionEndpoint(target)) return config;
    config.headers.delete("DPoP");
    const auth = target && await authorizeDpopRequest(config.method ?? "GET", target, config.dpopSessionId);
    if (auth) {
      config.headers.set("Authorization", `DPoP ${auth.session.token}`);
      config.headers.set("DPoP", auth.proof);
      signedRequests.set(config, auth.session);
    } else if (config.dpopSessionId) {
      throw new AxiosError("Phiên đăng nhập đã thay đổi.");
    }
    return config;
  });
}

function safeDpopError(error: unknown): AxiosError {
  if (!axios.isAxiosError(error)) return new AxiosError("Không thể xác thực yêu cầu.");
  const response = error.response;
  const safe = new AxiosError(
    response ? `Yêu cầu thất bại (HTTP ${response.status}).` : "Không thể gửi yêu cầu.",
    error.code,
  );
  if (response) {
    safe.status = response.status;
    const data = response.status === 422 && Array.isArray(response.data?.detail)
      ? { detail: response.data.detail.map((item: { loc?: unknown; msg?: unknown }) => ({
        loc: item?.loc, msg: item?.msg,
      })) }
      : response.data;
    safe.response = {
      status: response.status, statusText: response.statusText,
      data, headers: {}, config: { headers: new AxiosHeaders() },
    };
  }
  return safe;
}

let redirecting = false;
api.interceptors.response.use(response => {
  if (isDpopMode) {
    signedRequests.delete(response.config);
    response.config.headers.delete(["Authorization", "DPoP"]);
    response.request = undefined;
  }
  return response;
}, async (error: unknown) => {
  const request: AuthRequestConfig | undefined = axios.isAxiosError(error) ? error.config : undefined;
  const response = axios.isAxiosError(error) ? error.response : undefined;
  if (isDpopMode) {
    const used = request && signedRequests.get(request);
    if (request) signedRequests.delete(request);
    if (request && used && response?.status === 401 &&
        await recoverDpopRequest(readAuthCode(response.data), used, !!request._retry)) {
      request._retry = true;
      request.dpopSessionId = used.id;
      return api(request);
    }
    throw safeDpopError(error);
  }
  if (!request || request._retry || response?.status !== 401 ||
      /\/auth\/(refresh|login|google)(?:[/?]|$)/.test(request.url ?? "")) {
    throw error;
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
    throw refreshError;
  }
  return api(request);
});

export async function authedFetch(input: string, init?: RequestInit): Promise<Response> {
  if (!isDpopMode) {
    const send = () => fetch(input, { credentials: "include", ...init });
    const response = await send();
    if (response.status !== 401 || init?.signal?.aborted || init?.body instanceof ReadableStream) return response;
    await response.body?.cancel();
    await refreshSession();
    return send();
  }

  const target = getDpopApiTarget(input);
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers);
  headers.delete("Authorization");
  headers.delete("DPoP");
  const send = async (previous?: { response: Response; used: AccessSession }) => {
    const expectedSessionId = previous?.used.id;
    const auth = target && !isSessionEndpoint(target)
      ? await authorizeDpopRequest(method, target, expectedSessionId)
      : null;
    if (expectedSessionId && !auth) return null;
    if (auth) {
      headers.set("Authorization", `DPoP ${auth.session.token}`);
      headers.set("DPoP", auth.proof);
    }
    void previous?.response.body?.cancel().catch(() => undefined);
    const response = await fetch(input, { ...init, credentials: "omit", redirect: "error", headers });
    return { response, used: auth?.session ?? null };
  };
  const first = (await send())!;
  if (first.response.status !== 401 || !first.used) return first.response;
  const code = readAuthCode(await first.response.clone().json().catch(() => null));
  const canReplay = !init?.signal?.aborted && !(init?.body instanceof ReadableStream);
  if (!await recoverDpopRequest(code, first.used, !canReplay)) return first.response;
  const replay = await send({ response: first.response, used: first.used });
  if (!replay) return first.response;
  if (replay.response.status === 401 && replay.used) {
    const replayCode = readAuthCode(await replay.response.clone().json().catch(() => null));
    await recoverDpopRequest(replayCode, replay.used, true);
  }
  return replay.response;
}

export default api;
