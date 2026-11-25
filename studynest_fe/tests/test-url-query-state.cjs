#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ts = require(path.join(__dirname, "..", "node_modules", "typescript"));

const hookPath = path.join(__dirname, "..", "src", "hooks", "useUrlQueryState.ts");
const source = fs.readFileSync(hookPath, "utf8");

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const mod = { exports: {} };
const sandbox = {
  module: mod,
  exports: mod.exports,
  URLSearchParams,
  window: { setTimeout, clearTimeout },
  require(id) {
    if (id === "react") {
      return {
        useCallback: (fn) => fn,
        useEffect: () => {},
        useMemo: (fn) => fn(),
        useRef: (v) => ({ current: v }),
        useState: (v) => [v, () => {}],
      };
    }
    if (id === "next/navigation") {
      return {
        usePathname: () => "/test",
        useRouter: () => ({ replace: () => {} }),
        useSearchParams: () => new URLSearchParams(),
      };
    }
    return require(id);
  },
};

const fn = new Function(
  "module",
  "exports",
  "require",
  "window",
  transpiled
);
fn(mod, mod.exports, sandbox.require, sandbox.window);

const {
  parseUrlQueryState,
  buildNextUrlQuery,
  buildResetUrlQuery,
} = mod.exports;

const SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: 10, min: 1, max: 100 },
  search: { type: "string", default: "" },
  status: { type: "string", default: "all", allowed: ["all", "approved", "pending"] },
  only_unread: { type: "boolean", default: false },
};

// 1. Default values when URL is empty
{
  const parsed = parseUrlQueryState(new URLSearchParams(""), SCHEMA);
  assert.deepEqual(parsed, {
    page: 1,
    limit: 10,
    search: "",
    status: "all",
    only_unread: false,
  });
}

// 2. Parse valid URL params
{
  const parsed = parseUrlQueryState(
    new URLSearchParams("page=3&limit=25&search=react&status=approved&only_unread=true"),
    SCHEMA
  );
  assert.deepEqual(parsed, {
    page: 3,
    limit: 25,
    search: "react",
    status: "approved",
    only_unread: true,
  });
}

// 3. Fallback & clamping on invalid / malicious URL params
{
  const parsed = parseUrlQueryState(
    new URLSearchParams("page=-5&limit=999&status=hacked&only_unread=maybe"),
    SCHEMA
  );
  assert.deepEqual(parsed, {
    page: 1,
    limit: 100,
    search: "",
    status: "all",
    only_unread: false,
  });
}

// 4. Changing filter automatically resets page to 1 (removes page) and preserves foreign params
{
  const next = buildNextUrlQuery(
    "course_id=abc-123&page=4&status=pending",
    SCHEMA,
    { status: "approved" }
  );
  const p = new URLSearchParams(next);
  assert.equal(p.get("course_id"), "abc-123");
  assert.equal(p.get("status"), "approved");
  assert.equal(p.get("page"), null);
}

// 5. Changing page keeps existing filters & omits page=1
{
  const next2 = buildNextUrlQuery("status=approved", SCHEMA, { page: 2 });
  assert.equal(next2, "status=approved&page=2");

  const next1 = buildNextUrlQuery("status=approved&page=2", SCHEMA, { page: 1 });
  assert.equal(next1, "status=approved");
}

// 6. Setting filter back to default removes it from URL
{
  const next = buildNextUrlQuery("status=approved&search=js&page=3", SCHEMA, {
    status: "all",
    search: "",
  });
  assert.equal(next, "");
}

// 7. buildResetUrlQuery removes only schema keys, keeps foreign params
{
  const next = buildResetUrlQuery(
    "course_id=xyz&from=dashboard&page=5&search=abc&status=pending&only_unread=true",
    SCHEMA
  );
  const p = new URLSearchParams(next);
  assert.equal(p.get("course_id"), "xyz");
  assert.equal(p.get("from"), "dashboard");
  assert.equal(p.get("page"), null);
  assert.equal(p.get("search"), null);
  assert.equal(p.get("status"), null);
  assert.equal(p.get("only_unread"), null);
}

console.log("OK: useUrlQueryState unit tests passed (7/7 assertions).");
