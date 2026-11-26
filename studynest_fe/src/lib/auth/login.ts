import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import type { User } from "@/types/user/user";
import { createDpopProof, discardLoginKey, rotateSessionKey } from "./dpop";
import { getDpopApiTarget } from "./http";
import { isDpopMode } from "./mode";
import { isDpopTokenResponse, setSession } from "./session";

type LoginPath = "/auth/login" | "/auth/google" | "/auth/verify-email" | "/auth/verify-otp";
let signingIn = false;

async function hydrateAuthenticatedUser(): Promise<void> {
  try {
    const res = await api.get<User>("/auth/me", { timeout: 10000 });
    if (res.data && typeof res.data === "object" && "id" in res.data) {
      useUserStore.getState().setUser(res.data);
    }
  } catch {
    // Nếu /auth/me tạm chậm, AuthProvider nền sẽ tự tải lại sau khi chuyển trang.
  }
}

export async function postAuthSession(path: LoginPath, body: unknown): Promise<void> {
  if (!isDpopMode) {
    await api.post(path, body);
    await hydrateAuthenticatedUser();
    return;
  }
  const url = getDpopApiTarget(`/api${path}`);
  if (!url || signingIn) throw new Error("Chưa thể bắt đầu phiên đăng nhập.");
  signingIn = true;
  try {
    await rotateSessionKey();
    const proof = await createDpopProof({ method: "POST", url });
    const { data } = await api.post<unknown>(path, body, { headers: { DPoP: proof }, timeout: 15000 });
    if (!isDpopTokenResponse(data)) throw new Error("Máy chủ không trả về phiên DPoP hợp lệ.");
    await setSession(data);
  } finally {
    discardLoginKey();
    signingIn = false;
  }
  await hydrateAuthenticatedUser();
}
