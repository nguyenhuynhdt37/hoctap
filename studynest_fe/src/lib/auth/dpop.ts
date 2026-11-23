import { readAuthRecord, updateAuthRecord, type AuthRecord } from "./storage";

interface ProofOptions {
  method: string;
  url: string;
  accessToken?: string;
  refreshToken?: string;
}

const utf8 = new TextEncoder();
let loginKey: AuthRecord | undefined;

async function generateKey(): Promise<AuthRecord> {
  const key = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  return { id: crypto.randomUUID(), key };
}

export async function ensureKeyRecord(): Promise<AuthRecord> {
  const current = await readAuthRecord();
  if (current) return current;
  const candidate = await generateKey();
  return (await updateAuthRecord(stored => stored ?? candidate))!;
}

export async function ensureSessionKey(): Promise<CryptoKeyPair> {
  return (loginKey ?? await ensureKeyRecord()).key;
}

export async function rotateSessionKey({ stage = true } = {}): Promise<CryptoKeyPair> {
  // Stage the key until the server issues tokens, so a failed login leaves the
  // current key and refresh token usable in other tabs.
  const record = await generateKey();
  if (stage) loginKey = record;
  return record.key;
}

export function getLoginKey(): AuthRecord | undefined {
  return loginKey;
}

export function discardLoginKey(): void {
  loginKey = undefined;
}

export async function clearSessionKey(): Promise<void> {
  discardLoginKey();
  await updateAuthRecord(() => undefined);
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function normalizeDpopUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol === "ws:") url.protocol = "http:";
  if (url.protocol === "wss:") url.protocol = "https:";
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password ||
      /%(?![0-9a-f]{2})/i.test(url.pathname)) {
    throw new Error("Địa chỉ DPoP không hợp lệ.");
  }
  // RFC 3986 normalization matches the backend and preserves escaped delimiters.
  const path = url.pathname.replace(/%([0-9a-f]{2})/gi, (_, hex: string) => {
    const character = String.fromCharCode(Number.parseInt(hex, 16));
    return /^[a-z0-9._~-]$/i.test(character) ? character : `%${hex.toUpperCase()}`;
  });
  return url.origin + path;
}

export async function signDpopProof(key: CryptoKeyPair, opts: ProofOptions): Promise<string> {
  if (opts.accessToken !== undefined && opts.refreshToken !== undefined) {
    throw new Error("DPoP chỉ hỗ trợ một loại token cho mỗi proof.");
  }
  const { kty, crv, x, y } = await crypto.subtle.exportKey("jwk", key.publicKey);
  const header = { typ: "dpop+jwt", alg: "ES256", jwk: { kty, crv, x, y } };
  const claims: Record<string, string | number> = {
    htm: opts.method.toUpperCase(),
    htu: normalizeDpopUrl(opts.url),
    iat: Math.floor(Date.now() / 1000),
    jti: base64url(crypto.getRandomValues(new Uint8Array(16))),
  };
  const token = opts.accessToken ?? opts.refreshToken;
  if (token !== undefined) {
    const claim = opts.accessToken !== undefined ? "ath" : "rth";
    claims[claim] = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", utf8.encode(token))));
  }
  const message = `${base64url(utf8.encode(JSON.stringify(header)))}.${base64url(utf8.encode(JSON.stringify(claims)))}`;
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key.privateKey, utf8.encode(message),
  ));
  if (signature.length !== 64) throw new Error("Chữ ký DPoP không hợp lệ.");
  return `${message}.${base64url(signature)}`;
}

export async function createDpopProof(opts: ProofOptions): Promise<string> {
  const usesActiveKey = opts.accessToken !== undefined || opts.refreshToken !== undefined;
  const key = usesActiveKey ? (await ensureKeyRecord()).key : await ensureSessionKey();
  return signDpopProof(key, opts);
}
