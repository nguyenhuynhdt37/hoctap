const assert = require("node:assert/strict");
const { createHash, webcrypto } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../studynest_fe");
const ts = require(path.join(root, "node_modules/typescript"));

function load(relative, imports = {}, globals = {}) {
  const file = path.join(root, "src/lib/auth", relative + ".ts");
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, require: name => imports[name],
    crypto: webcrypto, btoa, TextEncoder, URL, URLSearchParams, ...globals,
  });
  return module.exports;
}

test("S256 matches the RFC 7636 example", async () => {
  const { getCodeChallenge } = load("pkce");
  assert.equal(
    await getCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("PKCE generates fresh URL-safe 256-bit verifiers with matching challenges", async () => {
  const { createPkce } = load("pkce");
  const first = await createPkce();
  const second = await createPkce();
  assert.match(first.verifier, /^[\w-]{43}$/);
  assert.equal(Buffer.from(first.verifier, "base64url").length, 32);
  assert.notEqual(first.verifier, second.verifier);
  assert.equal(first.challenge, createHash("sha256").update(first.verifier).digest("base64url"));
});

test("GitHub callback reuses the pending proof key across navigation and consumes the browser attempt", async () => {
  const references = new Map();
  const attempts = new Map();
  const exchangeCode = Buffer.alloc(32, 10).toString("base64url");
  const loginUrl = "https://github.com/login/oauth/authorize?state=fixture";
  const cleanCallbackUrl = "https://app.example/auth/github/callback";
  const location = { href: "https://app.example/login", origin: "https://app.example" };
  const window = {
    location,
    history: {
      replaceState(_state, _title, pathname) {
        assert.equal(pathname, "/auth/github/callback");
        location.href = cleanCallbackUrl;
      },
    },
  };
  const globals = {
    window,
    sessionStorage: {
      setItem: (key, value) => references.set(key, value),
      getItem: key => references.get(key),
      removeItem: key => references.delete(key),
    },
    process: { env: { NEXT_PUBLIC_DPOP_API_ORIGIN: "https://api.example" } },
  };
  const storage = {
    async saveGitHubLoginAttempt(keyRecord, verifier) {
      attempts.set(keyRecord.id, { keyRecord, verifier });
      return keyRecord.id;
    },
    async takeGitHubLoginAttempt(reference) {
      const attempt = attempts.get(reference);
      attempts.delete(reference);
      return attempt;
    },
  };
  const tokens = { token_type: "DPoP", access_token: "test-access", refresh_token: "test-refresh",
    redirect_to: "//elsewhere.example" };
  const user = { id: "fixture", is_banned: false };
  const requests = [];
  let persisted, loadedUser;
  const api = {
    async post(endpoint, body, config) {
      requests.push({ endpoint, body, proof: config.headers.DPoP });
      if (endpoint === "/auth/github/start") return { data: { authorize_url: loginUrl } };
      assert.equal(location.href, cleanCallbackUrl);
      return { data: tokens };
    },
    async get(endpoint) {
      assert.equal(endpoint, "/auth/me");
      assert.equal(persisted.tokens, tokens);
      return { data: user };
    },
  };
  const http = load("http", {}, globals);
  const client = () => load("github", {
    "@/lib/utils/fetcher/client/axios": { default: api },
    "@/stores/user": { useUserStore: { getState: () => ({ setUser: value => { loadedUser = value; } }) } },
    "./dpop": load("dpop", { "./storage": storage }),
    "./http": http,
    "./mode": { isDpopMode: true },
    "./pkce": load("pkce"),
    "./safe-redirect": load("safe-redirect"),
    "./session": {
      isDpopTokenResponse: value => value.token_type === "DPoP",
      async setSession(value, keyRecord) { persisted = { tokens: value, keyRecord }; },
    },
    "./storage": storage,
  }, globals);

  assert.equal((await client().startGitHubLogin("/my-learning")).href, loginUrl);
  const pending = [...attempts.values()][0];
  assert.notEqual([...references.values()][0], pending.verifier);
  assert.equal(pending.keyRecord.key.privateKey.extractable, false);
  const callbackUrl = cleanCallbackUrl + "?code=" + exchangeCode;
  location.href = callbackUrl;
  const afterNavigation = client();
  assert.equal(await afterNavigation.finishGitHubLogin(), "/");
  assert.equal(loadedUser, user);
  assert.equal(persisted.keyRecord, pending.keyRecord);
  assert.equal(references.size, 0);
  assert.equal(attempts.size, 0);

  const [start, exchange] = requests;
  const decode = (proof, index) => JSON.parse(Buffer.from(proof.split(".")[index], "base64url"));
  assert.equal(exchange.endpoint, "/auth/github/exchange");
  assert.equal(exchange.body.code, exchangeCode);
  assert.equal(start.body.code_challenge, createHash("sha256").update(exchange.body.code_verifier).digest("base64url"));
  assert.deepEqual(decode(exchange.proof, 0).jwk, decode(start.proof, 0).jwk);
  for (const { endpoint, proof } of requests) {
    const target = "https://api.example/api/v1" + endpoint;
    assert.equal(http.isSessionEndpoint(target), true);
    assert.equal(decode(proof, 1).htu, target);
  }
  location.href = callbackUrl;
  await assert.rejects(afterNavigation.finishGitHubLogin());
  assert.equal(requests.length, 2);
});
