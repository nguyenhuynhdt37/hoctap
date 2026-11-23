const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../studynest_fe");
const ts = require(path.join(root, "node_modules/typescript"));

function load(relative, imports, globals = {}) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    },
  });
  vm.runInNewContext(outputText, {
    module, exports: module.exports, require: name => imports[name],
    crypto: webcrypto, TextEncoder, TextDecoder, URL, btoa,
    AbortController, Headers, Response, ReadableStream, setTimeout, clearTimeout, ...globals,
  }, { filename: relative });
  return module.exports;
}

const syntheticAccess = "test-access-value";
const syntheticRefresh = "test-refresh-value";
const decode = segment => JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));

async function setup() {
  let record;
  return load("src/lib/auth/dpop.ts", {
    "./storage": {
      readAuthRecord: async () => record,
      updateAuthRecord: async update => (record = update(record)),
    },
  });
}

async function verify(proof) {
  const [headerSegment, payloadSegment, signatureSegment] = proof.split(".");
  const header = decode(headerSegment);
  const payload = decode(payloadSegment);
  const signature = Buffer.from(signatureSegment, "base64url");
  const key = await webcrypto.subtle.importKey("jwk", header.jwk, {
    name: "ECDSA", namedCurve: "P-256",
  }, false, ["verify"]);
  assert.equal(signature.length, 64);
  assert.equal(await webcrypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" }, key, signature,
    Buffer.from(`${headerSegment}.${payloadSegment}`),
  ), true);
  return { header, payload };
}

const hash = async value => Buffer.from(
  await webcrypto.subtle.digest("SHA-256", Buffer.from(value)),
).toString("base64url");

test("access proof uses raw ES256 and matches the method, target and token", async () => {
  const { createDpopProof, ensureSessionKey } = await setup();
  assert.equal((await ensureSessionKey()).privateKey.extractable, false);
  const method = "get";
  const url = "https://API.example.test:443/api/v1/a%7e/%2f?skip=1#fragment";
  const proof = await createDpopProof({ method, url, accessToken: syntheticAccess });
  const { header, payload } = await verify(proof);
  assert.equal(header.typ, "dpop+jwt");
  assert.equal(header.alg, "ES256");
  assert.equal(header.jwk.kty, "EC");
  assert.equal(header.jwk.crv, "P-256");
  assert.equal(header.jwk.d, undefined);
  assert.equal(payload.htm, "GET");
  assert.equal(payload.htu, "https://api.example.test/api/v1/a~/%2F");
  assert.ok(Number.isInteger(payload.iat));
  assert.ok(Math.abs(Date.now() / 1000 - payload.iat) < 3);
  assert.equal(Buffer.from(payload.jti, "base64url").length, 16);
  assert.equal(payload.ath, await hash(syntheticAccess));
  assert.equal(payload.rth, undefined);
  const another = await verify(await createDpopProof({ method, url, accessToken: syntheticAccess }));
  assert.notEqual(another.payload.jti, payload.jti);
});

test("rotation changes the login key and refresh proofs use rth exclusively", async () => {
  const { createDpopProof, rotateSessionKey, ensureSessionKey, clearSessionKey } = await setup();
  const initial = await ensureSessionKey();
  const login = { method: "post", url: "https://api.example.test/api/v1/auth/login" };
  const before = await verify(await createDpopProof(login));
  const rotated = await rotateSessionKey();
  const after = await verify(await createDpopProof(login));
  assert.notEqual(initial.privateKey, rotated.privateKey);
  assert.notEqual(before.header.jwk.x, after.header.jwk.x);
  assert.equal(after.payload.ath, undefined);
  assert.equal(after.payload.rth, undefined);
  const refresh = await verify(await createDpopProof({
    method: "POST", url: "https://api.example.test/api/v1/auth/refresh", refreshToken: syntheticRefresh,
  }));
  assert.equal(refresh.payload.rth, await hash(syntheticRefresh));
  assert.equal(refresh.payload.ath, undefined);
  await assert.rejects(createDpopProof({ ...login, accessToken: syntheticAccess, refreshToken: syntheticRefresh }));
  await clearSessionKey();
  assert.notEqual((await ensureSessionKey()).privateKey, rotated.privateKey);
});

function browserHarness(fetch, {
  lockEnabled = true, broadcastEnabled = true, env = {}, console: logger, refreshTimers = {},
} = {}) {
  let record;
  let clockOffset = 0;
  let lockQueue = Promise.resolve();
  const lockNames = [];
  const channels = [];
  class BroadcastChannel {
    constructor(name) {
      assert.equal(name, "maymay-auth");
      channels.push(this);
    }
    postMessage(data) {
      for (const channel of channels) {
        if (channel !== this) queueMicrotask(() => channel.onmessage?.({ data: structuredClone(data) }));
      }
    }
  }
  const storage = {
    readAuthRecord: async () => record,
    updateAuthRecord: async update => (record = update(record)),
  };
  const navigator = lockEnabled ? { locks: { request(name, fn) {
    lockNames.push(name);
    const next = lockQueue.then(fn);
    lockQueue = next.catch(() => undefined);
    return next;
  } } } : {};
  const location = new URL("https://web.example.test/learning/example");
  const axios = require(path.join(root, "node_modules/axios/dist/node/axios.cjs"));

  class BrowserRequest extends Request {
    constructor(input, init) {
      super(typeof input === "string" ? new URL(input, location) : input, init);
    }
  }
  const axiosFetch = async (request, options) => {
    const url = new URL(request.url);
    const target = url.origin === location.origin ? url.pathname + url.search : url.href;
    return fetch(target, {
      credentials: request.credentials, redirect: request.redirect,
      method: request.method, headers: request.headers, body: request.body ? await request.text() : undefined,
      ...options,
    });
  };

  function tab(mode) {
    let cleared = 0;
    const globals = {
      window: { location }, navigator, BroadcastChannel: broadcastEnabled ? BroadcastChannel : undefined,
      fetch, console: logger ?? { warn() {} },
      Date: class extends Date { static now() { return Date.now() + clockOffset; } },
      process: { env: {
        NEXT_PUBLIC_AUTH_MODE: mode,
        NEXT_PUBLIC_URL_BACKEND: "http://internal.example.test",
        NEXT_PUBLIC_DPOP_API_ORIGIN: "https://api.example.test",
        ...env,
      } },
    };
    const auth = (name, imports) => load(`src/lib/auth/${name}.ts`, imports, globals);
    const client = (name, imports) => load(`src/lib/utils/fetcher/client/${name}.ts`, imports, globals);
    const modeModule = auth("mode");
    const dpop = auth("dpop", { "./storage": storage });
    const http = auth("http");
    const session = load("src/lib/auth/session.ts", {
      "@/stores/user": { useUserStore: { getState: () => ({ clearUser() { cleared++; } }) } },
      "./storage": storage, "./dpop": dpop, "./http": http, "./mode": modeModule,
    }, { ...globals, ...refreshTimers });
    const cookieAdapter = async config => {
      const headers = new Headers(config.headers.toJSON());
      const res = await fetch(new URL(axios.getUri(config), location).pathname, {
        method: config.method.toUpperCase(), headers, body: config.data,
        ...config.fetchOptions,
      });
      const response = {
        status: res.status, statusText: res.statusText, data: await res.json(),
        config, request: { headers }, headers: new axios.AxiosHeaders(res.headers),
      };
      if (!res.ok) throw new axios.AxiosError("Request rejected", "ERR_BAD_REQUEST", config, response.request, response);
      return response;
    };
    const axiosClient = { ...axios, create(config) {
      assert.equal(config.withCredentials, !modeModule.isDpopMode);
      if (modeModule.isDpopMode) {
        assert.equal(config.adapter, "fetch");
        return axios.create({ ...config, env: { fetch: axiosFetch, Request: BrowserRequest } });
      }
      return axios.create({ ...config, adapter: cookieAdapter });
    } };
    const { default: api, authedFetch } = client("axios", {
      axios: { ...axios, default: axiosClient },
      "@/lib/auth/http": http, "@/lib/auth/mode": modeModule, "@/lib/auth/session": session,
      "./refresh-session": { isSessionExpired: () => false, refreshSession: async () => {} },
    });
    const login = auth("login", {
      "@/lib/utils/fetcher/client/axios": { default: api },
      "./dpop": dpop, "./http": http, "./mode": modeModule, "./session": session,
    });
    const logout = auth("logout", {
      "@/lib/utils/fetcher/client/axios": { default: api },
      "./session": session, "./mode": modeModule, "./storage": storage,
    });
    return { mode: modeModule.AUTH_MODE, api, authedFetch, session, login, logout, clears: () => cleared };
  }
  return { tab, record: () => record, lockNames, advance: ms => { clockOffset += ms; } };
}

const pair = (access_token = syntheticAccess, refresh_token = syntheticRefresh) =>
  ({ access_token, refresh_token, token_type: "DPoP", expires_in: 600 });

test("cookie is the default and login does not use proof or browser key storage", async () => {
  const browser = browserHarness(async (url, init) => {
    assert.equal(url, "/api/auth/login");
    assert.equal(init.headers.has("DPoP"), false);
    assert.equal(init.headers.has("Authorization"), false);
    return Response.json({ success: true });
  });
  const tab = browser.tab();
  assert.equal(tab.mode, "cookie");
  await tab.login.postAuthSession("/auth/login", { email: "test@example.test", password: "fixture" });
  assert.equal(browser.record(), undefined);
  assert.equal(tab.session.getAccessToken(), null);
});

test("DPoP login covers all session-issuing routes and preserves the previous session on failure", async () => {
  const keys = new Set();
  let fail = false;
  const browser = browserHarness(async (url, init) => {
    assert.equal(init.credentials, "omit");
    assert.equal(init.headers.has("Authorization"), false);
    const { header, payload } = await verify(init.headers.get("DPoP"));
    assert.equal(payload.htu, `https://api.example.test/api/v1${url.slice(4)}`);
    assert.equal(payload.ath, undefined);
    assert.equal(payload.rth, undefined);
    keys.add(header.jwk.x);
    if (fail) return Response.json({ code: "invalid_token" }, { status: 401 });
    return Response.json(pair());
  });
  const tab = browser.tab("dpop");
  for (const path of ["/auth/login", "/auth/google", "/auth/verify-email", "/auth/verify-otp"]) {
    await tab.login.postAuthSession(path, {});
  }
  const previous = browser.record();
  fail = true;
  await assert.rejects(tab.login.postAuthSession("/auth/login", {}), { status: 401 });
  assert.equal(keys.size, 5);
  assert.equal(browser.record().id, previous.id);
  assert.equal(tab.session.getAccessToken() !== null, true);
  assert.equal(previous.key.privateKey.extractable, false);
  assert.equal(previous.session.wrappingKey.extractable, false);
  assert.equal(JSON.stringify(previous).includes(syntheticAccess), false);
  assert.equal(JSON.stringify(previous).includes(syntheticRefresh), false);
});

for (const lockEnabled of [true, false]) {
  test(`refresh single-flight across tabs ${lockEnabled ? "with Web Locks" : "with the IndexedDB claim"}`, async () => {
    let rotations = 0;
    const browser = browserHarness(async (url, init) => {
      assert.equal(url, "/api/auth/refresh");
      assert.equal(init.credentials, "omit");
      assert.equal(init.headers.Authorization, undefined);
      const { payload } = await verify(init.headers.DPoP);
      assert.equal(payload.rth, await hash(syntheticRefresh));
      assert.equal(payload.ath, undefined);
      assert.equal(JSON.parse(init.body).refresh_token === syntheticRefresh, true);
      rotations++;
      await new Promise(resolve => setTimeout(resolve, 30));
      return Response.json(pair("test-next-access", "test-next-refresh"));
    }, { lockEnabled });
    const first = browser.tab("dpop");
    const second = browser.tab("dpop");
    first.session.onSessionEvent(() => {});
    second.session.onSessionEvent(() => {});
    await first.session.setSession(pair());
    assert.equal(await second.session.bootstrapSession(), true);
    const pending = first.session.refreshSession();
    assert.strictEqual(first.session.refreshSession(), pending);
    assert.deepEqual(await Promise.all([pending, second.session.refreshSession()]), [true, true]);
    assert.equal(rotations, 1);
    assert.equal(first.session.getAccessToken() === second.session.getAccessToken(), true);
    assert.equal(first.session.getAccessToken() !== syntheticAccess, true);
    assert.equal(browser.record().session.revision, 2);
    if (lockEnabled) assert.ok(browser.lockNames.length >= 2);
    assert.ok(browser.lockNames.every(name => name === "maymay-auth-refresh"));
    await first.session.clearSession();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(first.session.getAccessToken(), null);
    assert.equal(second.session.getAccessToken(), null);
    assert.equal(browser.record(), undefined);
  });
}

test("Axios and fetch renew only token_expired, replay once, and clear terminal failures", async () => {
  let rotations = 0;
  let requests = 0;
  let code;
  const seen = new Set();
  const browser = browserHarness(async (url, init) => {
    if (url === "/api/auth/refresh") {
      rotations++;
      return Response.json(pair(`test-next-access-${rotations}`, `test-next-refresh-${rotations}`));
    }
    requests++;
    assert.equal(init.credentials, "omit");
    const headers = new Headers(init.headers);
    const { payload } = await verify(headers.get("DPoP"));
    const access = headers.get("Authorization").slice(5);
    assert.equal(payload.ath, await hash(access));
    assert.equal(payload.htu, "https://api.example.test/api/v1/resource");
    assert.equal(seen.has(payload.jti), false);
    seen.add(payload.jti);
    return Response.json({ code }, { status: 401 });
  });
  const tab = browser.tab("dpop");
  await tab.session.setSession(pair());
  await assert.rejects(tab.api.get("/resource?q=1"), error => {
    assert.equal(error.response.status, 401);
    assert.equal(error.config, undefined);
    assert.equal(error.request, undefined);
    return true;
  });
  assert.equal(rotations, 0);
  code = "invalid_dpop_proof";
  assert.equal((await tab.authedFetch("/api/resource?after=1")).status, 401);
  assert.equal(rotations, 0);
  assert.equal(requests, 2);
  code = "token_expired";
  assert.equal((await tab.authedFetch("/api/resource", { method: "POST", body: "{}" })).status, 401);
  assert.equal(requests, 4);
  assert.equal(rotations, 1);
  await assert.rejects(tab.api.get("/resource"), { status: 401 });
  assert.equal(requests, 6);
  assert.equal(rotations, 2);
  code = "session_revoked";
  await assert.rejects(tab.api.get("/resource"), { status: 401 });
  assert.equal(requests, 7);
  assert.equal(rotations, 2);
  assert.equal(tab.session.getAccessToken(), null);
  assert.equal(browser.record(), undefined);
});

test("refresh transport failure preserves the session and terminal 401 removes it", async () => {
  let retry = false;
  const browser = browserHarness(async () => {
    if (!retry) throw new TypeError("Offline");
    return Response.json({ code: "invalid_token" }, { status: 401 });
  });
  const tab = browser.tab("dpop");
  await tab.session.setSession(pair());
  assert.equal(await tab.session.refreshSession(), false);
  assert.ok(browser.record()?.session);
  assert.equal(tab.session.getAccessToken() !== null, true);
  retry = true;
  assert.equal(await tab.session.refreshSession(), false);
  assert.equal(browser.record(), undefined);
  assert.equal(tab.session.getAccessToken(), null);
});

test("a new tab can retry an offline refresh after the grace window with a fresh proof", async () => {
  const proofs = [];
  const browser = browserHarness(async (url, init) => {
    assert.equal(url, "/api/auth/refresh");
    assert.equal(JSON.parse(init.body).refresh_token, syntheticRefresh);
    proofs.push((await verify(init.headers.DPoP)).payload);
    if (proofs.length === 1) throw new TypeError("Offline");
    return Response.json(pair("new-access", "new-refresh"));
  }, { lockEnabled: false, broadcastEnabled: false });
  const tab = browser.tab("dpop");
  await tab.session.setSession(pair());
  assert.equal(await tab.session.refreshSession(), false);
  browser.advance(20_000);
  // Include records persisted by clients that stored an ambiguous attempt.
  browser.record().session.attempt = { owner: null, sentAt: 0, leaseUntil: 0 };
  const reloaded = browser.tab("dpop");
  assert.equal(await reloaded.session.bootstrapSession(), true);
  assert.equal(reloaded.session.getAccessToken(), "new-access");
  assert.equal(proofs.length, 2);
  assert.notEqual(proofs[0].jti, proofs[1].jti);
});

test("bootstrap distinguishes retryable responses from terminal 401 and a missing session", async () => {
  const responses = [
    Response.json({ code: "session_revoked" }, { status: 503 }),
    Response.json({ code: "invalid_dpop_proof" }, { status: 401 }),
    Response.json({ code: "session_revoked" }, { status: 401 }),
  ];
  const browser = browserHarness(async () => responses.shift());
  const tab = browser.tab("dpop");
  assert.equal(await tab.session.bootstrapSessionOutcome(), "anonymous");
  await tab.session.setSession(pair());
  browser.advance(600_000);
  assert.equal(await tab.session.bootstrapSessionOutcome(), "unavailable");
  assert.equal(await tab.session.bootstrapSessionOutcome(), "unavailable");
  assert.ok(browser.record()?.session);
  assert.equal(await tab.session.bootstrapSessionOutcome(), "anonymous");
  assert.equal(browser.record(), undefined);
});

test("the DPoP guard offers an in-place retry after offline bootstrap and then renders protected content", { timeout: 2_000 }, async () => {
  let online = false;
  const browser = browserHarness(async url => {
    if (!online) throw new TypeError("Offline");
    if (url === "/api/auth/refresh") return Response.json(pair());
    assert.equal(url, "/api/auth/me");
    return Response.json({ id: "test-user", roles: ["USER"] });
  }, { broadcastEnabled: false });
  await browser.tab("dpop").session.setSession(pair());
  const { session, api } = browser.tab("dpop");
  const routes = load("src/lib/auth/routes.ts", {});
  const safeRedirect = load("src/lib/auth/safe-redirect.ts", {}, { URLSearchParams });
  const location = new URL("https://web.example.test/learning/example");
  const effects = [];
  const redirects = [];
  let user = null;
  const userStore = selector => selector({ user });
  userStore.getState = () => ({
    user, setUser(value) { user = value; }, clearUser() { user = null; },
  });
  const status = { status: "pending" };
  const authStore = selector => selector(status);
  authStore.getState = () => status;
  let statusListener;
  authStore.setState = update => {
    Object.assign(status, update);
    statusListener?.(status.status);
  };
  const unavailable = new Promise(resolve => {
    statusListener = value => { if (value === "unavailable") resolve(); };
  });
  const PageLoadError = () => {};
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: { useRef: current => ({ current }), useEffect: effect => effects.push(effect) },
    "react/jsx-runtime": { jsx },
    "next/navigation": { usePathname: () => location.pathname, useRouter: () => ({ replace: url => redirects.push(url) }) },
    "@/components/ui/states": {},
    "@/components/shared/page-load-state": { PageLoadError },
    "@/hooks/auth/useAuthedSWR": { useAuthBootstrapStatus: authStore },
    "@/lib/auth/mode": { isDpopMode: true },
    "@/lib/auth/routes": routes,
    "@/lib/auth/safe-redirect": safeRedirect,
    "@/lib/auth/session": session,
    "@/lib/utils/fetcher/client/axios": { default: api },
    "@/stores/user": { useUserStore: userStore },
    "@/stores/notifications": { useRealtimeNotiStore: { getState: () => ({ clearAll() {} }) } },
  };
  const { AuthBootstrap } = load("src/components/auth/AuthBootstrap.tsx", imports, { window: { location } });
  const { RequireAuth } = load("src/components/auth/RequireAuth.tsx", imports, { window: { location } });
  AuthBootstrap();
  const cleanup = effects.shift()();
  effects.shift()();

  await unavailable;
  const retryState = RequireAuth({ roles: ["USER"], children: "protected" });
  effects.shift()();
  assert.equal(retryState.props.children.type, PageLoadError);
  assert.deepEqual(redirects, []);
  assert.ok(browser.record()?.session);

  online = true;
  await retryState.props.children.props.onRetry();
  assert.equal(RequireAuth({ roles: ["USER"], children: "protected" }), "protected");
  effects.shift()();
  assert.deepEqual(redirects, []);
  cleanup();
});

test("refresh timeout keeps the stored session and releases the refresh claim", async () => {
  let attempts = 0;
  const browser = browserHarness(async (_url, init) => {
    if (++attempts === 1) {
      return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
    }
    return Response.json(pair("after-timeout", "rotated-refresh"));
  }, {
    lockEnabled: false,
    refreshTimers: { setTimeout: (callback, ms) => setTimeout(callback, ms === 10_000 ? 5 : ms) },
  });
  const tab = browser.tab("dpop");
  await tab.session.setSession(pair());
  assert.equal(await tab.session.refreshSession(), false);
  assert.ok(browser.record()?.session);
  browser.advance(20_000);
  assert.equal(await tab.session.refreshSession(), true);
  assert.equal(tab.session.getAccessToken(), "after-timeout");
});

test("Axios and fetch sign only the local rewrite or exact configured API origins", async () => {
  const requests = [];
  const browser = browserHarness(async (url, init) => {
    requests.push({ url, headers: new Headers(init.headers) });
    return Response.json({});
  });
  const tab = browser.tab("dpop");
  await tab.session.setSession(pair());
  const headers = { Authorization: "test-header", DPoP: "test-proof" };
  for (const input of ["https://api.example.test.evil/api/v1/resource", "//evil.example.test/api/auth/login"]) {
    await tab.api.get(input, { headers, fetchOptions: { headers } });
    await tab.authedFetch(input, { headers });
  }
  assert.equal(requests.length, 4);
  for (const request of requests.splice(0)) {
    assert.equal(request.headers.has("Authorization"), false);
    assert.equal(request.headers.has("DPoP"), false);
  }
  await tab.api.get("https://api.example.test/api/v1/resource?test=1");
  await tab.authedFetch("http://internal.example.test/api/v1/resource?test=2");
  await tab.api.get("/resource");
  for (const request of requests) {
    assert.equal(request.headers.get("Authorization"), `DPoP ${syntheticAccess}`);
    assert.equal((await verify(request.headers.get("DPoP"))).payload.htu, "https://api.example.test/api/v1/resource");
  }
});

test("a proxy prefix is preserved in the signed public URL and mismatched development origins are reported", async () => {
  const warnings = [];
  const browser = browserHarness(async (_url, init) => {
    const proof = await verify(init.headers.get("DPoP"));
    assert.equal(proof.payload.htu, "https://api.example.test/gateway/api/v1/resource");
    return Response.json({});
  }, {
    env: {
      NODE_ENV: "development",
      NEXT_PUBLIC_URL_BACKEND: "http://internal.example.test/mount",
      NEXT_PUBLIC_DPOP_API_PATH_PREFIX: "/gateway/",
    },
    console: { warn: (...args) => warnings.push(args) },
  });
  const tab = browser.tab("dpop");
  assert.equal(warnings.length, 1);
  await tab.session.setSession(pair());
  await tab.api.get("/resource?query=1");
  await tab.authedFetch("http://internal.example.test/mount/api/v1/resource#fragment");
});

test("an origin misconfigured with a path is reported and leaves rewritten requests unsigned", async () => {
  const warnings = [];
  const browser = browserHarness(async (_url, init) => {
    assert.equal(init.headers.has("Authorization"), false);
    assert.equal(init.headers.has("DPoP"), false);
    return Response.json({});
  }, {
    env: { NODE_ENV: "development", NEXT_PUBLIC_DPOP_API_ORIGIN: "https://api.example.test/gateway" },
    console: { warn: (...args) => warnings.push(args) },
  });
  const tab = browser.tab("dpop");
  assert.equal(warnings.length, 1);
  await tab.session.setSession(pair());
  await tab.api.get("/resource");
});

function socketHarness(env = {}, dpop = true) {
  const sockets = [];
  const timers = new Set();
  const proofs = [];
  class WebSocket extends EventTarget {
    static OPEN = 1;
    readyState = 0;
    frames = [];
    constructor(url, protocols) {
      super();
      this.url = url.href;
      this.protocol = protocols?.[0] || "";
      sockets.push(this);
    }
    open() {
      this.readyState = WebSocket.OPEN;
      this.dispatchEvent(new Event("open"));
    }
    message(data) {
      const frame = new MessageEvent("message", { data: JSON.stringify(data) });
      this.dispatchEvent(frame);
      return frame;
    }
    close(code) {
      this.readyState = 3;
      this.dispatchEvent(Object.assign(new Event("close"), { code }));
    }
    send(frame) { this.frames.push(JSON.parse(frame)); }
  }
  const globals = {
    WebSocket, process: { env: {
      NEXT_PUBLIC_AUTH_MODE: dpop ? "dpop" : "cookie",
      NODE_ENV: "production",
      NEXT_PUBLIC_URL_BACKEND: "http://internal.example.test",
      NEXT_PUBLIC_DPOP_API_ORIGIN: "https://api.example.test",
      NEXT_PUBLIC_URL_BACKEND_WS: "wss://socket.example.test",
      ...env,
    } },
    setTimeout(callback) { timers.add(callback); return callback; },
    clearTimeout(callback) { timers.delete(callback); },
  };
  const http = load("src/lib/auth/http.ts", {}, globals);
  const ws = load("src/lib/auth/ws.ts", {
    "@/lib/auth/dpop": { createDpopProof: async opts => { proofs.push(opts); return "test-proof"; } },
    "@/lib/auth/http": http,
    "@/lib/auth/mode": { isDpopMode: dpop },
    "@/lib/auth/session": { getAccessToken: () => syntheticAccess },
  }, globals);
  return { ...ws, timers, sockets, proofs };
}

const tick = () => new Promise(resolve => setImmediate(resolve));

test("DPoP WebSocket rejects origins and insecure production transport before signing or connecting", async () => {
  const h = socketHarness();
  await assert.rejects(h.openAuthedWebSocket("wss://socket.example.test.evil/api/v1/ws"));
  await assert.rejects(h.openAuthedWebSocket("ws://internal.example.test/api/v1/ws"));
  assert.deepEqual(h.sockets, []);
  assert.deepEqual(h.proofs, []);
});

test("DPoP WebSocket waits for auth_ok, ignores data as ACK and signs the pinned public origin", async () => {
  const h = socketHarness({
    NEXT_PUBLIC_URL_BACKEND_WS: "wss://socket.example.test/mount",
    NEXT_PUBLIC_DPOP_API_PATH_PREFIX: "/gateway",
  });
  const result = h.openAuthedWebSocket("wss://socket.example.test/mount/api/v1/ws?role_name=USER");
  await tick();
  const socket = h.sockets[0];
  socket.open();
  assert.deepEqual(socket.frames, [{ type: "auth", token: syntheticAccess, dpop: "test-proof" }]);
  let settled = false;
  void result.then(() => { settled = true; });
  socket.message({ type: "notification.created" });
  await tick();
  assert.equal(settled, false);
  socket.message({ type: "auth_ok" });
  assert.equal(await result, socket);
  assert.equal(h.takeInitialWebSocketMessage(socket), undefined);
  assert.equal(h.proofs[0].url, "https://api.example.test/gateway/api/v1/ws");
});

test("a silent DPoP socket times out and a late 4401 before the deadline rejects", async () => {
  const h = socketHarness();
  for (const code of [undefined, 4401]) {
    const result = h.openAuthedWebSocket("wss://api.example.test/api/v1/ws");
    const rejection = assert.rejects(result, error => error.name === "WebSocketConnectionError" && error.code === code);
    await tick();
    const socket = h.sockets.at(-1);
    socket.open();
    socket.message({ type: "error" });
    if (code === undefined) [...h.timers][0]();
    else socket.close(code);
    await rejection;
  }
});

test("the legacy media ready frame is replayed once and cookie sockets still resolve on open", async () => {
  const h = socketHarness();
  const result = h.openAuthedWebSocket("wss://socket.example.test/api/v1/agent/dictation", {
    protocols: ["studynest-dictation"],
  });
  await tick();
  const socket = h.sockets[0];
  socket.open();
  const ready = socket.message({ type: "ready", sample_rate: 16000, max_seconds: 30 });
  assert.equal(await result, socket);
  assert.equal(h.takeInitialWebSocketMessage(socket), ready);
  assert.equal(h.takeInitialWebSocketMessage(socket), undefined);

  const legacy = socketHarness({}, false);
  const cookie = legacy.openAuthedWebSocket("ws://another.example.test/socket");
  legacy.sockets[0].open();
  assert.deepEqual((await cookie).frames, []);
});

test("logout authenticates the backend request and clears local state on transport failure", async () => {
  let revocationAttempted = false;
  const browser = browserHarness(async (url, init) => {
    assert.equal(url, "/api/auth/logout");
    assert.equal(init.method, "POST");
    assert.equal(init.redirect, "error");
    const { payload } = await verify(init.headers.get("DPoP"));
    assert.equal(payload.ath, await hash(syntheticAccess));
    revocationAttempted = true;
    throw new TypeError("Failed to fetch");
  });
  const tab = browser.tab("dpop");
  await tab.session.setSession(pair());
  const before = tab.clears();
  await assert.rejects(tab.logout.logoutEverywhere());
  assert.equal(revocationAttempted, true);
  assert.equal(browser.record(), undefined);
  assert.equal(tab.session.getAccessToken(), null);
  assert.equal(tab.clears(), before + 1);
});

test("SSE keeps UTF-8 chunks and event framing intact", async () => {
  const { consumeChatEvents } = load("src/lib/utils/fetcher/client/chat-events.ts", {});
  const bytes = Buffer.from('data\r\n\r\n: ping\r\ndata: {"type":"delta","delta":"Mây"}\r\n\r\ndata: {"type":"done",\ndata: "data":42}\n\n');
  const body = new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      controller.close();
    },
  });
  const deltas = [];
  const response = new Response(body, { headers: { "content-type": "text/event-stream" } });
  assert.equal(await consumeChatEvents(response, delta => deltas.push(delta)), 42);
  assert.deepEqual(deltas, ["Mây"]);
});
