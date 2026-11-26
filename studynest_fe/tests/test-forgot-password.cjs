#!/usr/bin/env node
/**
 * Hồi quy cho quên/đặt lại mật khẩu:
 *  1. Có trang /forgot-password và /reset-password (link "Quên mật khẩu?" ở đăng nhập không được 404).
 *  2. AuthShell có nội dung cho màn `forgot` và `reset`.
 *  3. Hai trang gọi đúng endpoint backend và backend có route tương ứng.
 * Exit code 1 nếu có điều kiện nào không thoả.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

for (const route of ["forgot-password", "reset-password"]) {
  check(fs.existsSync(path.join(root, `src/app/(main)/(share)/${route}/page.tsx`)), `thiếu trang /${route}`);
}
check(/href="\/forgot-password"/.test(read("src/components/user/login/index.tsx")), "đăng nhập phải có link /forgot-password");

const shell = read("src/components/user/auth/AuthShell.tsx");
check(/\bforgot:\s*\{/.test(shell) && /\breset:\s*\{/.test(shell), "AuthShell thiếu nội dung forgot/reset");

check(/"\/auth\/forgot-password"/.test(read("src/components/user/auth/forgot-password.tsx")), "forgot-password.tsx phải gọi /auth/forgot-password");
check(/"\/auth\/reset-password"/.test(read("src/components/user/auth/reset-password.tsx")), "reset-password.tsx phải gọi /auth/reset-password");

const api = fs.readFileSync(path.join(root, "../studynest_be/app/api/v1/shares/auth.py"), "utf8");
check(/@router\.post\("\/forgot-password"/.test(api), "backend thiếu route POST /auth/forgot-password");
check(/@router\.post\("\/reset-password"/.test(api), "backend thiếu route POST /auth/reset-password");

if (failures.length) {
  console.error("FAIL test-forgot-password:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("OK test-forgot-password: trang, nội dung giao diện và endpoint đều khớp");
