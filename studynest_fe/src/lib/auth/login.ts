import api from "@/lib/utils/fetcher/client/axios";
import { createDpopProof, discardLoginKey, rotateSessionKey } from "./dpop";
import { getDpopApiTarget } from "./http";
import { isDpopMode } from "./mode";
import { isDpopTokenResponse, setSession } from "./session";

type LoginPath = "/auth/login" | "/auth/google" | "/auth/verify-email" | "/auth/verify-otp";
let signingIn = false;

export async function postAuthSession(path: LoginPath, body: unknown): Promise<void> {
  if (!isDpopMode) {
    await api.post(path, body);
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
}
