#!/usr/bin/env node
/**
 * Hồi quy cho đăng nhập/đăng ký: giao diện là trang đầy đủ (không modal), logic dùng chuẩn mới.
 *  1. Dùng `src/proxy.ts` (không còn `middleware.ts`) và export hàm `proxy`.
 *  2. Không còn slot `@modal`, và root layout không render modal.
 *  3. Login/Register submit bằng form action của React 19 (`useActionState`).
 *  4. Trang callback GitHub kiểm tra phiên hiện có trước khi báo lỗi.
 * Exit code 1 nếu có điều kiện nào không thoả.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

check(exists("src/proxy.ts") && !exists("src/middleware.ts"), "phải dùng src/proxy.ts, không còn middleware.ts");
if (exists("src/proxy.ts")) {
  check(/export\s+async\s+function\s+proxy\s*\(/.test(read("src/proxy.ts")), "proxy.ts phải export hàm `proxy`");
}
check(!exists("src/app/@modal"), "không dùng slot @modal: đăng nhập/đăng ký là trang đầy đủ");
check(!/\{modal\}/.test(read("src/app/layout.tsx")), "root layout không render modal");

for (const file of ["src/components/user/login/index.tsx", "src/components/user/register/index.tsx"]) {
  const source = read(file);
  check(/useActionState/.test(source), `${file}: submit phải dùng useActionState`);
  check(!/onSubmit=\{handleSubmit\}/.test(source), `${file}: không dùng onSubmit thủ công`);
  check(!/variant="modal"|inModal/.test(source), `${file}: không còn biến thể modal`);
}

check(
  /bootstrapSessionOutcome/.test(read("src/app/(main)/(share)/auth/github/callback/github-callback.tsx")),
  "callback GitHub phải kiểm tra phiên hiện có trước khi báo lỗi",
);

if (failures.length) {
  console.error("FAIL test-auth-forms:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("OK test-auth-forms: trang đăng nhập/đăng ký đầy đủ, proxy.ts và form action đều thoả");
