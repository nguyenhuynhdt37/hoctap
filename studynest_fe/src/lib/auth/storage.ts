interface RefreshAttempt {
  owner: string | null;
  leaseUntil: number;
}

export interface AuthRecord {
  id: string;
  key: CryptoKeyPair;
  session?: {
    revision: number;
    wrappingKey: CryptoKey;
    iv: Uint8Array<ArrayBuffer>;
    ciphertext: ArrayBuffer;
    attempt?: RefreshAttempt;
  };
}

interface GitHubLoginAttempt {
  keyRecord: AuthRecord;
  verifier: string;
  expiresAt: number;
}

const STORE = "keys";
const ACTIVE = "active";
const GITHUB_ATTEMPT_PREFIX = "github-login:";
const GITHUB_ATTEMPT_TTL_MS = 10 * 60 * 1000;
let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maymay-auth", 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        db.onclose = () => { database = undefined; };
        resolve(db);
      };
    }).catch((error: unknown) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

export async function readAuthRecord(): Promise<AuthRecord | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(ACTIVE);
    request.onsuccess = () => resolve(request.result as AuthRecord | undefined);
    request.onerror = () => reject(request.error);
  });
}

// Keep the key and encrypted refresh token in one record so rotation is atomic.
export async function updateAuthRecord(
  update: (current: AuthRecord | undefined) => AuthRecord | undefined,
): Promise<AuthRecord | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite", { durability: "strict" });
    const store = tx.objectStore(STORE);
    const request = store.get(ACTIVE);
    let next: AuthRecord | undefined;
    request.onsuccess = () => {
      try {
        const current = request.result as AuthRecord | undefined;
        next = update(current);
        if (next === current) return;
        if (next) store.put(next, ACTIVE);
        else store.delete(ACTIVE);
      } catch (error) {
        tx.abort();
        reject(error);
      }
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = () => reject(tx.error);
  });
}

function gitHubAttemptPrefix(time: number): string {
  return `${GITHUB_ATTEMPT_PREFIX}${String(time).padStart(13, "0")}:`;
}

export async function saveGitHubLoginAttempt(keyRecord: AuthRecord, verifier: string): Promise<string> {
  const db = await openDatabase();
  const now = Date.now();
  const expiresAt = now + GITHUB_ATTEMPT_TTL_MS;
  const key = gitHubAttemptPrefix(expiresAt) + keyRecord.id;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite", { durability: "strict" });
    const store = tx.objectStore(STORE);
    const attempt: GitHubLoginAttempt = { keyRecord, verifier, expiresAt };
    store.delete(IDBKeyRange.bound(GITHUB_ATTEMPT_PREFIX, gitHubAttemptPrefix(now)));
    store.put(attempt, key);
    tx.oncomplete = () => resolve(key);
    tx.onabort = () => reject(tx.error);
  });
}

export async function takeGitHubLoginAttempt(key: string): Promise<GitHubLoginAttempt | undefined> {
  if (!/^github-login:\d{13}:[a-f0-9-]{36}$/.test(key)) return undefined;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite", { durability: "strict" });
    const store = tx.objectStore(STORE);
    const request = store.get(key);
    request.onsuccess = () => { store.delete(key); };
    tx.oncomplete = () => {
      const attempt = request.result as GitHubLoginAttempt | undefined;
      resolve(attempt && attempt.expiresAt > Date.now() ? attempt : undefined);
    };
    tx.onabort = () => reject(tx.error);
  });
}
