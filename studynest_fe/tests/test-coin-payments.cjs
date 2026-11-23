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

test("chia thanh toán: tối đa 50% lượng Coin trắng, 10 Coin trắng = 1 Coin vàng, khớp backend", () => {
  assert.deepEqual(coin.splitCoinPayment(100, 500), { bonusUse: 50, bonusGoldDiscount: 5, paidUse: 95 });
  assert.deepEqual(coin.splitCoinPayment(100, 50), { bonusUse: 50, bonusGoldDiscount: 5, paidUse: 95 });
  assert.deepEqual(coin.splitCoinPayment(100, 37), { bonusUse: 30, bonusGoldDiscount: 3, paidUse: 97 });
  assert.deepEqual(coin.splitCoinPayment(100, 9), { bonusUse: 0, bonusGoldDiscount: 0, paidUse: 100 });
  assert.deepEqual(coin.splitCoinPayment(100, 0), { bonusUse: 0, bonusGoldDiscount: 0, paidUse: 100 });
  assert.deepEqual(coin.splitCoinPayment(50, 100), { bonusUse: 20, bonusGoldDiscount: 2, paidUse: 48 });
  assert.equal(coin.purchaseCashbackBonus(100), 20);
  assert.equal(coin.purchaseCashbackBonus(50), 10);
});

test("đủ Coin vàng mới cho thanh toán, thiếu thì báo đúng số cần nạp thêm và hoàn 20% Coin trắng", () => {
  assert.deepEqual(coin.paymentCheck(100, { bonus: 100, paid: 100, rateVnd: 10000, bonusMaxShare: 0.5 }),
    { ok: true, bonusUse: 50, bonusGoldDiscount: 5, paidUse: 95, missingPaid: 0, cashbackBonus: 20 });
  assert.deepEqual(coin.paymentCheck(100, { bonus: 100, paid: 10, rateVnd: 10000, bonusMaxShare: 0.5 }),
    { ok: false, bonusUse: 50, bonusGoldDiscount: 5, paidUse: 95, missingPaid: 85, cashbackBonus: 20 });
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
  assert.equal(coin.coinBalanceLabel(balances), "100 Coin vàng, 50 Coin trắng");
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

test("định dạng hiển thị giá khóa học và số tiền VND sang Coin an toàn", () => {
  assert.equal(coin.vndToCoin(500_000), 50);
  assert.equal(coin.vndToCoin(500_001), 51);
  assert.equal(coin.vndToCoin(-50_000), -5);
  assert.equal(coin.vndToCoin(null), 0);
  assert.equal(coin.vndToCoin("not-a-number"), 0);
  assert.equal(coin.formatCoin(1200), "1.200 Coin");
  assert.equal(coin.formatVndAsCoin(0), "0 Coin");
  assert.equal(coin.formatVndAsCoin(799_000), "80 Coin");
  assert.equal(coin.formatCoursePriceCoin(0), "Miễn phí");
  assert.equal(coin.formatCoursePriceCoin(null), "Miễn phí");
  assert.equal(coin.formatCoursePriceCoin(499_000), "50 Coin");
});

test("báo giá đổi đồng vàng sang đồng trắng tại shop theo tỷ lệ 1:5", () => {
  assert.deepEqual(coin.exchangeWhiteQuote(1, 10), { goldAmount: 1, whiteGained: 5, valid: true, reason: null });
  assert.deepEqual(coin.exchangeWhiteQuote(5, 10), { goldAmount: 5, whiteGained: 25, valid: true, reason: null });
  assert.equal(coin.exchangeWhiteQuote(0, 10).valid, false);
  assert.equal(coin.exchangeWhiteQuote(11, 10).valid, false);
});
