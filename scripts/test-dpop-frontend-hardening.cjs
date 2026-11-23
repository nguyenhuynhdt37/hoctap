const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("../studynest_fe/node_modules/typescript");

function loadFrontendModule(path, env = {}) {
  const filename = resolve(__dirname, "../studynest_fe", path);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, require: createRequire(filename), URL, URLSearchParams, process: { env },
  }, { filename });
  return exports;
}

async function headersFor(env) {
  const { default: config } = loadFrontendModule("next.config.ts", env);
  const rules = await config.headers();
  assert.equal(rules[0].source, "/:path*");
  return new Map(rules[0].headers.map(({ key, value }) => [key, value]));
}

test("transaction redirects preserve encoded internal routes and validate fallbacks", () => {
  const { sanitizeRedirect } = loadFrontendModule("src/lib/auth/safe-redirect.ts");
  const destination = "/learning/ti%E1%BA%BFng-vi%E1%BB%87t?lesson=1&view=a%26b#overview";
  const query = new URLSearchParams({ status: "success", redirect: destination });
  assert.equal(sanitizeRedirect(new URLSearchParams(String(query)).get("redirect")), destination);
  for (const value of [
    null, "learning", "https://elsewhere.invalid/", "//elsewhere.invalid/",
    "/\\elsewhere.invalid/", "/%2felsewhere.invalid/", "/.//elsewhere.invalid/",
    "/%5celsewhere.invalid/", "/\t/path", "/invalid%xx",
    "/learning?%61ccess_token=sample", "/#refresh_token=sample",
  ]) {
    assert.equal(sanitizeRedirect(value, "/fallback"), "/fallback");
  }
  assert.equal(sanitizeRedirect(null, "//elsewhere.invalid"), "/");
});

test("editor markup keeps supported formatting and strips active HTML", () => {
  const { sanitizeEditableLearningHtml } = loadFrontendModule(
    "src/components/shared/markdown-renderer/safe-html.ts",
  );
  const result = sanitizeEditableLearningHtml(
    '<p style="text-align:center;position:fixed" onclick="demo">Lesson</p>' +
    '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">Task</li></ul>' +
    '<img src="/image.png" onerror="demo"><iframe src="/page"></iframe>' +
    '<img src="data:image/png;base64,AAAA"><img src="data:image/svg+xml;base64,AAAA">',
  );
  assert.match(result, /style="text-align:center"/);
  assert.match(result, /data-checked="true"/);
  assert.match(result, /src="\/image\.png"/);
  assert.match(result, /data:image\/png/);
  assert.doesNotMatch(result, /onclick|onerror|position|iframe|svg\+xml/);
});

test("production headers apply the same report-only policy in both auth modes", async () => {
  const env = {
    NODE_ENV: "production",
    NEXT_PUBLIC_URL_BACKEND: "https://api.example.invalid/api/v1",
    NEXT_PUBLIC_URL_BACKEND_WS: "wss://socket.example.invalid",
    CSP_ASSET_ORIGINS: "https://assets.example.invalid",
    CSP_REPORT_URL: "https://reports.example.invalid/csp",
  };
  const cookie = await headersFor({ ...env, NEXT_PUBLIC_AUTH_MODE: "cookie" });
  const dpop = await headersFor({ ...env, NEXT_PUBLIC_AUTH_MODE: "dpop" });
  assert.deepEqual(cookie, dpop);
  const policy = cookie.get("Content-Security-Policy-Report-Only");
  assert.ok(policy.includes("https://api.example.invalid"));
  assert.ok(policy.includes("wss://socket.example.invalid"));
  assert.ok(policy.includes("wss://api.example.invalid"));
  assert.ok(policy.includes("https://assets.example.invalid"));
  assert.ok(policy.includes("https://accounts.google.com/gsi/client"));
  assert.ok(policy.includes("frame-ancestors 'none'"));
  assert.ok(policy.includes("form-action 'self'"));
  assert.ok(policy.includes("report-uri https://reports.example.invalid/csp; report-to maymay-csp"));
  assert.doesNotMatch(policy, /unsafe-eval|example\.invalid\/api\/v1/);
  assert.equal(cookie.has("Content-Security-Policy"), false);
  assert.equal(cookie.get("Reporting-Endpoints"), 'maymay-csp="https://reports.example.invalid/csp"');
  assert.equal(cookie.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(cookie.get("X-Content-Type-Options"), "nosniff");
  assert.match(cookie.get("Permissions-Policy"), /microphone=\(self\)/);
  assert.equal(cookie.get("Strict-Transport-Security"), "max-age=31536000");
});

test("development uses HMR sources without HSTS or an invalid report destination", async () => {
  const headers = await headersFor({
    NODE_ENV: "development",
    CSP_REPORT_URL: "https://reports.example.invalid/csp?invalid=true",
  });
  const policy = headers.get("Content-Security-Policy-Report-Only");
  assert.match(policy, /'unsafe-eval'/);
  assert.match(policy, /ws:\/\/localhost:3000/);
  assert.doesNotMatch(policy, /report-uri|report-to/);
  assert.equal(headers.has("Strict-Transport-Security"), false);
  assert.equal(headers.has("Reporting-Endpoints"), false);
});

test("document middleware suppresses referrers in DPoP mode and preserves the cookie path", async () => {
  const { NextRequest } = createRequire(resolve(__dirname, "../studynest_fe/package.json"))("next/server");
  const request = new NextRequest("https://web.example.invalid/");
  for (const [mode, policy] of [["dpop", "no-referrer"], ["cookie", null]]) {
    const { middleware } = loadFrontendModule("src/middleware.ts", { NEXT_PUBLIC_AUTH_MODE: mode });
    const response = await middleware(request);
    assert.equal(response.headers.get("Referrer-Policy"), policy);
  }
});
