import { useUserStore } from "@/stores/user";
import { discardLoginKey, ensureKeyRecord, getLoginKey, signDpopProof } from "./dpop";
import { getDpopApiTarget, isTerminalAuthCode, readAuthCode } from "./http";
import { isDpopMode } from "./mode";
import { readAuthRecord, updateAuthRecord, type AuthRecord } from "./storage";

interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

interface SessionEvent {
  type: "login" | "logout" | "refreshed";
}

export interface AccessSession {
  id: string;
  revision: number;
  token: string;
  expiresAt: number;
}

type ChannelMessage =
  | { type: "login" | "refreshed"; access: AccessSession }
  | { type: "logout"; id: string | null }
  | { type: "access-request"; id: string; revision: number }
  | { type: "access-response"; access: AccessSession };

const REFRESH_PATH = "/api/auth/refresh";
const REFRESH_TIMEOUT_MS = 10_000;
const REFRESH_LEASE_MS = 11_000;
const ACCESS_MARGIN_MS = 5_000;
type SessionOutcome = "authenticated" | "anonymous" | "unavailable";
const utf8 = new TextEncoder();
let access: AccessSession | null = null;
let activeKey: CryptoKeyPair | null = null;
let pendingRefresh: { outcome: Promise<SessionOutcome>; success: Promise<boolean> } | null = null;
let channel: BroadcastChannel | null | undefined;
const listeners = new Set<(event: SessionEvent) => void>();
const peerWaiters = new Set<(value: AccessSession) => void>();

function notify(type: SessionEvent["type"]): void {
  if (type === "logout" || type === "login") useUserStore.getState().clearUser();
  for (const listener of listeners) {
    try { listener({ type }); } catch { /* A subscriber must not interrupt session changes. */ }
  }
}

function clearMemory(): void {
  access = null;
  activeKey = null;
  notify("logout");
}

function matches(record: AuthRecord | undefined, candidate: AccessSession): record is AuthRecord {
  return record?.id === candidate.id && record.session?.revision === candidate.revision;
}

function isFresh(candidate: AccessSession): boolean {
  return candidate.expiresAt > Date.now() + ACCESS_MARGIN_MS;
}

async function receive(message: ChannelMessage): Promise<void> {
  if (message.type === "logout") {
    if ((!isDpopMode && message.id === null) || (access && access.id === message.id)) clearMemory();
    return;
  }
  if (!isDpopMode) return;
  if (message.type === "access-request") {
    if (access?.id === message.id && access.revision === message.revision && isFresh(access)) {
      getChannel()?.postMessage({ type: "access-response", access } satisfies ChannelMessage);
    }
    return;
  }
  if (message.type !== "login" && message.type !== "refreshed" && message.type !== "access-response") return;

  // BroadcastChannel is ephemeral. Verify the generation and revision in
  // IndexedDB before adopting a peer's in-memory access token.
  const candidate = message.access;
  if (!candidate || typeof candidate.token !== "string" || !isFresh(candidate)) return;
  const record = await readAuthRecord();
  if (!matches(record, candidate) ||
      (access?.id === candidate.id && access.revision > candidate.revision)) return;
  const changedAccount = access?.id !== candidate.id;
  const changedAccess = changedAccount || access?.revision !== candidate.revision;
  access = candidate;
  activeKey = record.key;
  for (const waiter of peerWaiters) waiter(candidate);
  if (changedAccess) notify(changedAccount ? "login" : "refreshed");
}

function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  try {
    channel = new BroadcastChannel("maymay-auth");
    channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
      if (event.data && typeof event.data === "object") void receive(event.data).catch(() => undefined);
    };
  } catch {
    channel = null;
  }
  return channel;
}

function publish(message: ChannelMessage): void {
  // A closed/unavailable channel must not undo a committed session.
  try { getChannel()?.postMessage(message); } catch { /* Continue with local auth. */ }
}

function requestPeerAccess(record: AuthRecord): Promise<void> {
  const revision = record.session?.revision;
  if (revision === undefined || !getChannel()) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => {
      clearTimeout(timer);
      peerWaiters.delete(receiveAccess);
      resolve();
    };
    const receiveAccess = (candidate: AccessSession) => {
      if (candidate.id === record.id && candidate.revision === revision) finish();
    };
    const timer = setTimeout(finish, 150);
    peerWaiters.add(receiveAccess);
    publish({ type: "access-request", id: record.id, revision });
  });
}

export function getAccessToken(): string | null {
  return access?.token ?? null;
}

export function getAccessSession(): AccessSession | null {
  return access;
}

export async function authorizeDpopRequest(
  method: string, url: string, expectedSessionId?: string,
): Promise<{ session: AccessSession; proof: string } | null> {
  const session = access;
  const key = activeKey;
  if (!session || !key || (expectedSessionId && session.id !== expectedSessionId)) return null;
  const proof = await signDpopProof(key, { method, url, accessToken: session.token });
  if (access?.id !== session.id) return null;
  return { session, proof };
}

function useTokens(record: AuthRecord, tokens: SessionTokens, type: "login" | "refreshed"): void {
  const seconds = tokens.expires_in;
  const expiresAt = Date.now() + (seconds && Number.isFinite(seconds) && seconds > 0 ? seconds : 600) * 1000;
  const candidate = {
    id: record.id, revision: record.session!.revision, token: tokens.access_token, expiresAt,
  };
  access = candidate;
  activeKey = record.key;
  publish({ type, access: candidate });
  notify(type);
}

export function isDpopTokenResponse(value: unknown): value is SessionTokens & { token_type: "DPoP" } {
  if (!value || typeof value !== "object") return false;
  const tokens = value as Partial<SessionTokens> & { token_type?: unknown };
  return tokens.token_type === "DPoP" && typeof tokens.access_token === "string" && !!tokens.access_token &&
    typeof tokens.refresh_token === "string" && !!tokens.refresh_token;
}

async function wrapRefresh(
  refreshToken: string, revision: number, id: string, wrappingKey: CryptoKey,
): Promise<NonNullable<AuthRecord["session"]>> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: utf8.encode(id) }, wrappingKey, utf8.encode(refreshToken),
  );
  return { revision, wrappingKey, iv, ciphertext };
}

export async function setSession(tokens: SessionTokens, loginRecord?: AuthRecord): Promise<void> {
  if (!isDpopMode) return;
  const keyRecord = loginRecord ?? getLoginKey() ?? await ensureKeyRecord();
  const wrappingKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const session = await wrapRefresh(tokens.refresh_token, (keyRecord.session?.revision ?? 0) + 1, keyRecord.id, wrappingKey);
  const record = { ...keyRecord, session };
  await updateAuthRecord(() => record);
  if (!loginRecord) discardLoginKey();
  useTokens(record, tokens, "login");
}

async function removeMatchingSession(id: string, expectedOwner?: string): Promise<boolean> {
  let removed = false;
  try {
    await updateAuthRecord(current => {
      if (current?.id !== id || (expectedOwner && current.session?.attempt?.owner !== expectedOwner)) {
        return current;
      }
      removed = true;
      return undefined;
    });
  } catch (error) {
    removed = false;
    throw error;
  } finally {
    if ((!expectedOwner && access?.id === id) || (removed && (!access || access.id === id))) clearMemory();
    if (removed) publish({ type: "logout", id });
  }
  return removed;
}

export async function clearMatchingSession(id: string, expectedOwner?: string): Promise<void> {
  await removeMatchingSession(id, expectedOwner);
}

export async function clearSession(): Promise<void> {
  if (!isDpopMode) {
    clearMemory();
    publish({ type: "logout", id: null });
    return;
  }
  discardLoginKey();
  const id = access?.id ?? (await readAuthRecord())?.id;
  if (id) await clearMatchingSession(id);
  else if (!access) clearMemory();
}

async function releaseRefresh(id: string, owner: string): Promise<void> {
  await updateAuthRecord(current => {
    const session = current?.session;
    if (!session || current.id !== id || session.attempt?.owner !== owner) return current;
    return { ...current, session: { ...session, attempt: undefined } };
  });
}

async function sendRefresh(record: AuthRecord, owner: string, token: string, proof: string): Promise<SessionOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const response = await fetch(REFRESH_PATH, {
      method: "POST", credentials: "omit", redirect: "error", cache: "no-store", signal: controller.signal,
      headers: { "Content-Type": "application/json", DPoP: proof },
      body: JSON.stringify({ refresh_token: token }),
    });
    if (!response.ok) {
      if (response.status === 401 && isTerminalAuthCode(readAuthCode(await response.json().catch(() => null)))) {
        return await removeMatchingSession(record.id, owner) ? "anonymous" : "unavailable";
      }
      await response.body?.cancel().catch(() => undefined);
      return "unavailable";
    }
    const tokens: unknown = await response.json();
    if (!isDpopTokenResponse(tokens)) return "unavailable";
    const previous = record.session!;
    const session = await wrapRefresh(tokens.refresh_token, previous.revision + 1, record.id, previous.wrappingKey);
    let stored = false;
    const next = await updateAuthRecord(current => {
      if (!matchesAttempt(current, record, owner)) return current;
      stored = true;
      return { ...current, session };
    });
    if (!stored || !next) return "unavailable";
    useTokens(next, tokens, "refreshed");
    return "authenticated";
  } finally {
    clearTimeout(timeout);
    await releaseRefresh(record.id, owner).catch(() => undefined);
  }
}

function matchesAttempt(current: AuthRecord | undefined, record: AuthRecord, owner: string): current is AuthRecord {
  return current?.id === record.id && current.session?.attempt?.owner === owner;
}

async function rotateRefresh(startedWith: AccessSession | null): Promise<SessionOutcome> {
  const initial = await readAuthRecord();
  if (!initial?.session) return "anonymous";
  const target = getDpopApiTarget(REFRESH_PATH);
  if (!target || (startedWith && startedWith.id !== initial.id)) return "unavailable";
  const deadline = Date.now() + REFRESH_LEASE_MS + 500;
  let checkedRevision: number | undefined;
  while (Date.now() < deadline) {
    const record = await readAuthRecord();
    if (!record?.session) return "anonymous";
    if (record.id !== initial.id) return "unavailable";
    const session = record.session;

    if ((!startedWith || session.revision !== startedWith.revision) && checkedRevision !== session.revision) {
      checkedRevision = session.revision;
      if (access && matches(record, access) && isFresh(access)) return "authenticated";
      await requestPeerAccess(record);
      if (access && matches(record, access) && isFresh(access)) return "authenticated";
    }

    const now = Date.now();
    if (session.attempt?.owner && session.attempt.leaseUntil > now) {
      await new Promise(resolve => setTimeout(resolve, 150));
      continue;
    }
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: session.iv, additionalData: utf8.encode(record.id) },
      session.wrappingKey, session.ciphertext,
    );
    const token = new TextDecoder().decode(plaintext);
    const proof = await signDpopProof(record.key, { method: "POST", url: target, refreshToken: token });
    const owner = crypto.randomUUID();
    const claimed = await updateAuthRecord(current => {
      if (current?.id !== record.id || current.session?.revision !== session.revision) return current;
      const attempt = current.session.attempt;
      const now = Date.now();
      if (attempt?.owner && attempt.leaseUntil > now) return current;
      return {
        ...current,
        session: { ...current.session, attempt: { owner, leaseUntil: now + REFRESH_LEASE_MS } },
      };
    });
    if (!matchesAttempt(claimed, record, owner)) continue;
    return sendRefresh(claimed, owner, token, proof);
  }
  return "unavailable";
}

function startRefresh() {
  if (pendingRefresh) return pendingRefresh;
  const startedWith = access;
  const run = () => rotateRefresh(startedWith);
  const withLock = async (): Promise<SessionOutcome> => {
    if (navigator.locks) return navigator.locks.request("maymay-auth-refresh", run);
    return run(); // The IndexedDB claim also serializes browsers without Web Locks.
  };
  const outcome = withLock().catch((): SessionOutcome => "unavailable").finally(() => { pendingRefresh = null; });
  pendingRefresh = { outcome, success: outcome.then(result => result === "authenticated") };
  return pendingRefresh;
}

export function refreshSession(): Promise<boolean> {
  if (!isDpopMode || typeof window === "undefined") return Promise.resolve(false);
  return startRefresh().success;
}

export function bootstrapSession(): Promise<boolean> {
  if (!isDpopMode) return Promise.resolve(true);
  return access && isFresh(access) ? Promise.resolve(true) : refreshSession();
}

export function bootstrapSessionOutcome(): Promise<SessionOutcome> {
  if (!isDpopMode || (access && isFresh(access))) return Promise.resolve("authenticated");
  if (typeof window === "undefined") return Promise.resolve("unavailable");
  return startRefresh().outcome;
}

export function onSessionEvent(cb: (event: SessionEvent) => void): () => void {
  getChannel();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export async function recoverDpopRequest(
  code: string | undefined, used: AccessSession | null, alreadyRetried: boolean,
): Promise<boolean> {
  if (!used || access?.id !== used.id) return false;
  if (isTerminalAuthCode(code)) {
    if (code === "session_revoked" || access.revision === used.revision) {
      await clearMatchingSession(used.id).catch(() => undefined);
    }
    return false;
  }
  if (alreadyRetried || code !== "token_expired") return false;
  if (access.revision !== used.revision && isFresh(access)) return true;
  return await refreshSession() && access?.id === used.id;
}
