import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import type { User } from "@/types/user/user";

import { rotateSessionKey, signDpopProof } from "./dpop";
import { getDpopApiTarget } from "./http";
import { isDpopMode } from "./mode";
import { createPkce } from "./pkce";
import { sanitizeRedirect } from "./safe-redirect";
import { isDpopTokenResponse, setSession } from "./session";
import { saveGitHubLoginAttempt, takeGitHubLoginAttempt } from "./storage";

const START = "/auth/github/start";
const EXCHANGE = "/auth/github/exchange";
const ATTEMPT_KEY = "maymay-github-login";
const INVALID_LOGIN = "Chưa hoàn tất được đăng nhập GitHub.";

function authorizeUrl(value: unknown): URL {
  if (typeof value !== "string") throw new Error(INVALID_LOGIN);
  const url = new URL(value);
  if (url.origin !== "https://github.com" || url.pathname !== "/login/oauth/authorize" ||
      url.username || url.password) {
    throw new Error(INVALID_LOGIN);
  }
  return url;
}

export async function startGitHubLogin(redirectTo: string): Promise<URL> {
  if (!isDpopMode) {
    const { data } = await api.post(START, { redirect_to: redirectTo });
    return authorizeUrl(data.authorize_url);
  }

  const target = getDpopApiTarget(`/api${START}`);
  if (!target) throw new Error(INVALID_LOGIN);
  const key = await rotateSessionKey({ stage: false });
  const { verifier, challenge } = await createPkce();
  const proof = await signDpopProof(key, { method: "POST", url: target });
  const { data } = await api.post<{ authorize_url: string }>(START, {
    redirect_to: sanitizeRedirect(redirectTo), code_challenge: challenge,
  }, { headers: { DPoP: proof }, timeout: 15000 });
  const url = authorizeUrl(data.authorize_url);

  const previous = sessionStorage.getItem(ATTEMPT_KEY);
  if (previous) await takeGitHubLoginAttempt(previous);
  const attempt = await saveGitHubLoginAttempt({ id: crypto.randomUUID(), key }, verifier);
  sessionStorage.setItem(ATTEMPT_KEY, attempt);
  return url;
}

export async function finishGitHubLogin(): Promise<string> {
  const url = new URL(window.location.href);
  window.history.replaceState(window.history.state, "", url.pathname);
  if (!isDpopMode) throw new Error(INVALID_LOGIN);

  const reference = sessionStorage.getItem(ATTEMPT_KEY);
  sessionStorage.removeItem(ATTEMPT_KEY);
  const attempt = reference && await takeGitHubLoginAttempt(reference);
  const codes = url.searchParams.getAll("code");
  const target = getDpopApiTarget(`/api${EXCHANGE}`);
  if (!attempt || !target || url.searchParams.has("error") || codes.length !== 1 ||
      !/^[A-Za-z0-9_-]{43}$/.test(codes[0])) {
    throw new Error(INVALID_LOGIN);
  }

  const proof = await signDpopProof(attempt.keyRecord.key, { method: "POST", url: target });
  const { data } = await api.post<unknown>(EXCHANGE, {
    code: codes[0], code_verifier: attempt.verifier,
  }, { headers: { DPoP: proof }, timeout: 15000 });
  if (!isDpopTokenResponse(data)) throw new Error(INVALID_LOGIN);

  await setSession(data, attempt.keyRecord);
  const { data: user } = await api.get<User>("/auth/me", { timeout: 15000 });
  useUserStore.getState().setUser(user);
  const redirect = "redirect_to" in data && typeof data.redirect_to === "string" ? data.redirect_to : null;
  return user.is_banned ? "/banned" : sanitizeRedirect(redirect);
}
