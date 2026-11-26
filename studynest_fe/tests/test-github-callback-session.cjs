#!/usr/bin/env node
/**
 * Hồi quy: khi đăng nhập GitHub lỗi ở trình duyệt nhưng người dùng đã có phiên hợp lệ
 * (đăng nhập lần 2, nhiều tab), trang callback phải đưa về trang chủ thay vì hiện lỗi.
 * Exit code 1 nếu callback không kiểm tra phiên hiện có trước khi báo lỗi.
 */
const fs = require("node:fs");
const path = require("node:path");

const file = path.resolve(__dirname, "../src/app/(main)/(share)/auth/github/callback/github-callback.tsx");
const source = fs.readFileSync(file, "utf8");
const failures = [];
if (!/bootstrapSessionOutcome/.test(source)) failures.push("callback phải gọi bootstrapSessionOutcome khi lỗi");
if (!/outcome === "authenticated"[\s\S]{0,80}router\.replace\("\/"\)/.test(source)) {
  failures.push('đã có phiên thì phải router.replace("/")');
}
if (!/setFailed\(true\)/.test(source)) failures.push("chưa có phiên thì vẫn phải hiện lỗi (setFailed)");
if (failures.length) {
  console.error("FAIL test-github-callback-session:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("OK test-github-callback-session");
