#!/usr/bin/env node
/**
 * Kiểm tra bản đồ điều hướng người dùng (src/lib/navigation/user-nav.ts):
 *  1. Mọi route tĩnh dưới `(main)/(user)` và `(main)/(share)` đều có lối vào
 *     trong bản đồ (hoặc nằm trong danh sách ngoại lệ có lý do bên dưới).
 *  2. Mọi href trong bản đồ đều trỏ tới một trang có thật.
 * Exit code 1 nếu có route thiếu lối vào hoặc href chết.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const appDir = path.join(root, "src/app/(main)");
const navFile = path.join(root, "src/lib/navigation/user-nav.ts");

/** Route tĩnh KHÔNG cần lối vào trong header, kèm lý do bắt buộc. */
const EXCEPTIONS = {
  "/transaction": "Trang kết quả thanh toán (success/failed), tự chuyển hướng sau 3 giây",
  "/auth/github/callback": "Callback OAuth GitHub, không phải điểm đến của người dùng",
  "/email_authentication": "Màn xác thực email, đến từ liên kết trong email",
  "/banned": "Trang thông báo tài khoản bị khóa, hệ thống tự chuyển tới",
  "/refunds/my_refund": "Trùng chức năng /refunds/my-requests (cùng component MyRefundRequests); header chỉ dẫn tới /refunds/my-requests",
};

function findPages(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findPages(full, out);
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
}

function toRoute(file) {
  const segments = path
    .relative(appDir, path.dirname(file))
    .split(path.sep)
    .filter((segment) => segment && !/^\(.*\)$/.test(segment));
  return "/" + segments.join("/");
}

const allPages = findPages(appDir).map((file) => ({ file, route: toRoute(file), area: path.relative(appDir, file).split(path.sep)[0] }));
const userRoutes = allPages
  .filter((page) => page.area === "(user)" || page.area === "(share)")
  .map((page) => page.route)
  .filter((route) => !route.includes("["));

const source = fs.readFileSync(navFile, "utf8");
const navHrefs = new Set();
for (const match of source.matchAll(/\bhref:\s*"([^"]+)"/g)) navHrefs.add(match[1].split(/[?#]/)[0]);
for (const match of source.matchAll(/\bHOME_HREF\s*=\s*"([^"]+)"/g)) navHrefs.add(match[1]);

const missing = [];
const excepted = [];
for (const route of [...new Set(userRoutes)].sort()) {
  if (navHrefs.has(route)) continue;
  if (EXCEPTIONS[route]) excepted.push(route);
  else missing.push(route);
}

// Href trong bản đồ phải khớp một trang thật (kể cả route động).
const patterns = allPages.map((page) => new RegExp("^" + page.route.replace(/\[[^\]]+\]/g, "[^/]+") + "$"));
const dead = [...navHrefs].filter((href) => !patterns.some((re) => re.test(href)));

console.log(`Route tĩnh người dùng: ${new Set(userRoutes).size}; href trong bản đồ: ${navHrefs.size}`);
if (excepted.length) {
  console.log("\nNgoại lệ (không cần lối vào):");
  for (const route of excepted) console.log(`  ${route}  -  ${EXCEPTIONS[route]}`);
}
for (const route of Object.keys(EXCEPTIONS)) {
  if (navHrefs.has(route)) console.log(`\nLưu ý: ${route} vừa là ngoại lệ vừa có trong bản đồ, hãy bỏ khỏi EXCEPTIONS.`);
}
if (missing.length) {
  console.error("\nROUTE CHƯA CÓ LỐI VÀO:");
  for (const route of missing) console.error(`  ${route}`);
}
if (dead.length) {
  console.error("\nHREF TRONG BẢN ĐỒ KHÔNG CÓ TRANG:");
  for (const href of dead) console.error(`  ${href}`);
}
if (missing.length || dead.length) process.exit(1);
console.log("\nOK: mọi route tĩnh người dùng đều có lối vào.");
