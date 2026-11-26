#!/usr/bin/env node
/**
 * Hồi quy cho đăng nhập/đăng ký dạng modal tại chỗ (Next 16 intercepting + parallel routes):
 *  1. Dùng `src/proxy.ts` (không còn `middleware.ts`) và export hàm `proxy`.
 *  2. Có slot `@modal` với default.tsx và route chặn (.)login, (.)register, (.)email_authentication.
 *  3. Root layout nhận và render slot `modal`.
 *  4. Login/Register/EmailAuthentication có biến thể modal, dùng `useActionState` và đóng modal
 *     bằng router.back() thay vì chuyển trang.
 *  5. AuthBootstrap không đẩy khỏi /login khi modal đang mở.
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

check(exists("src/proxy.ts"), "thiếu src/proxy.ts");
check(!exists("src/middleware.ts"), "src/middleware.ts phải được đổi tên thành proxy.ts");
if (exists("src/proxy.ts")) {
  check(/export\s+async\s+function\s+proxy\s*\(/.test(read("src/proxy.ts")), "proxy.ts phải export hàm `proxy`");
}

check(exists("src/app/@modal/default.tsx"), "thiếu src/app/@modal/default.tsx (slot không khớp phải render null)");
for (const route of ["login", "register", "email_authentication"]) {
  check(exists(`src/app/@modal/(.)${route}/page.tsx`), `thiếu route chặn @modal/(.)${route}`);
}

const layout = read("src/app/layout.tsx");
check(/\bmodal\b/.test(layout) && /\{modal\}/.test(layout), "root layout phải nhận và render slot {modal}");

for (const file of [
  "src/components/user/login/index.tsx",
  "src/components/user/register/index.tsx",
  "src/components/user/email_authentication/index.tsx",
]) {
  const source = read(file);
  check(/variant/.test(source) && /AuthVariant/.test(source), `${file}: thiếu biến thể modal (variant)`);
  check(/router\.back\(\)/.test(source), `${file}: modal phải đóng bằng router.back()`);
}
for (const file of ["src/components/user/login/index.tsx", "src/components/user/register/index.tsx"]) {
  const source = read(file);
  check(/useActionState/.test(source), `${file}: submit phải dùng useActionState`);
  check(!/onSubmit=\{handleSubmit\}/.test(source), `${file}: không dùng onSubmit thủ công nữa`);
}

const bootstrap = read("src/components/auth/AuthBootstrap.tsx");
check(
  /pathname === "\/login"\s*&&\s*!useAuthModalStore\.getState\(\)\.open/.test(bootstrap),
  "AuthBootstrap phải bỏ qua chuyển hướng khỏi /login khi modal đang mở",
);

if (failures.length) {
  console.error("FAIL test-auth-modal:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("OK test-auth-modal: modal đăng nhập/đăng ký, proxy.ts và các điều kiện liên quan đều thoả");
