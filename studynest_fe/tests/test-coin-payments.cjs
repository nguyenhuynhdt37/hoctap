const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const src = path.resolve(__dirname, "../src");

function load(name) {
  const filename = ["", ".ts", ".tsx"].map((ext) => path.join(src, name + ext)).find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  assert.ok(filename, `Không tìm thấy mô-đun ${name}`);
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  new Function("module", "exports", "require", outputText)(module, module.exports, (spec) => {
    if (spec.startsWith("@/")) return load(spec.slice(2));
    return require(spec);
  });
  return module.exports;
}

const coin = load("lib/learning-hub/coin-logic");

test("Coin quy đổi theo tỷ giá 10.000đ", () => {
  assert.equal(coin.coinToVnd(100, 10000), 1_000_000);
  assert.equal(coin.vndToCoinCeil(500_001, 10000), 51);
  assert.equal(coin.vndToCoinCeil(500_000, 10000), 50);
  assert.equal(coin.vndToCoinCeil(1, 10000), 1);
});

test("chia thanh toán dùng Coin thưởng trước, chặn bởi trần và số dư, khớp backend", () => {
  assert.deepEqual(coin.splitCoinPayment(100, 500, 0.3), { bonusUse: 30, paidUse: 70 });
  assert.deepEqual(coin.splitCoinPayment(100, 10, 0.3), { bonusUse: 10, paidUse: 90 });
  assert.deepEqual(coin.splitCoinPayment(100, 0, 0.3), { bonusUse: 0, paidUse: 100 });
  assert.deepEqual(coin.splitCoinPayment(50, 100, 0.3), { bonusUse: 15, paidUse: 35 });
});

test("đủ Coin thật mới cho thanh toán, thiếu thì báo đúng số cần nạp thêm", () => {
  assert.deepEqual(coin.paymentCheck(50, { bonus: 100, paid: 100, rateVnd: 10000, bonusMaxShare: 0.3 }),
    { ok: true, bonusUse: 15, paidUse: 35, missingPaid: 0 });
  assert.deepEqual(coin.paymentCheck(50, { bonus: 100, paid: 10, rateVnd: 10000, bonusMaxShare: 0.3 }),
    { ok: false, bonusUse: 15, paidUse: 35, missingPaid: 25 });
});

test("báo giá nạp Coin: tối thiểu 50.000đ, hiển thị số tiền VND tương ứng", () => {
  assert.deepEqual(coin.buyCoinQuote(100, 10000), { coin: 100, vnd: 1_000_000, valid: true, reason: null });
  assert.equal(coin.buyCoinQuote(4, 10000).valid, false);
  assert.match(coin.buyCoinQuote(4, 10000).reason, /5 Coin/);
  assert.equal(coin.buyCoinQuote(0, 10000).valid, false);
  assert.equal(coin.buyCoinQuote(5, 10000).valid, true);
  assert.equal(coin.formatVnd(1_000_000), "1.000.000 đ");
});

test("ánh xạ phản hồi API và nhãn truy cập nêu cả hai loại Coin", () => {
  const balances = coin.parseCoinBalances({ bonus: 50, paid: 100, total: 150, rate_vnd: 10000, bonus_max_share: 0.3 });
  assert.deepEqual(balances, { bonus: 50, paid: 100, total: 150, rateVnd: 10000, bonusMaxShare: 0.3 });
  assert.equal(coin.coinBalanceLabel(balances), "Số dư 150 Coin: 100 Coin thật, 50 Coin thưởng");
  assert.doesNotMatch(coin.coinBalanceLabel(balances), /peak/i);
});

test("báo giá rút Coin: tối thiểu, tối đa theo Coin rút được, và số VND nhận về", () => {
  assert.deepEqual(coin.withdrawQuote(10, 100, 10000, 10), { coin: 10, vnd: 100_000, valid: true, reason: null });
  const low = coin.withdrawQuote(9, 100, 10000, 10);
  assert.equal(low.valid, false);
  assert.match(low.reason, /10 Coin/);
  const high = coin.withdrawQuote(500, 100, 10000, 10);
  assert.equal(high.valid, false);
  assert.match(high.reason, /100 Coin/);
  assert.equal(coin.withdrawQuote(0, 100, 10000, 10).valid, false);
  assert.equal(coin.withdrawQuote(10.5, 100, 10000, 10).valid, false);
});
