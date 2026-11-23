// Quy đổi và chia Coin. Phải khớp backend (`app/services/coin_math.py`): thưởng trước, có trần, làm tròn lên khi đổi giá.

export interface CoinBalances {
  bonus: number;
  paid: number;
  total: number;
  rateVnd: number;
  bonusMaxShare: number;
}

export interface CoinBalancesResponse {
  bonus: number;
  paid: number;
  total: number;
  rate_vnd: number;
  bonus_max_share: number;
}

export interface CoinRateResponse {
  rate_vnd: number;
  bonus_max_share: number;
}

export const DEFAULT_COIN_VND_RATE = 10_000;
export const BONUS_COINS_PER_GOLD = 10;
export const WHITE_PER_GOLD_EXCHANGE = 5;
export const BONUS_MAX_COINS_SHARE = 0.5;
export const PURCHASE_CASHBACK_RATE = 0.2;
export const MIN_TOPUP_VND = 50_000;

const money = new Intl.NumberFormat("vi-VN");

export const formatVnd = (value: number) => `${money.format(value)} đ`;

export const coinToVnd = (coin: number, rateVnd: number) => coin * rateVnd;

export const vndToCoinCeil = (vnd: number, rateVnd: number) => Math.ceil(vnd / rateVnd);

function toFiniteNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function vndToCoin(vnd: number | string | null | undefined, rateVnd = DEFAULT_COIN_VND_RATE): number {
  const amount = toFiniteNumber(vnd);
  if (amount === 0) return 0;
  const rate = rateVnd > 0 ? rateVnd : DEFAULT_COIN_VND_RATE;
  const sign = amount < 0 ? -1 : 1;
  return sign * Math.ceil(Math.abs(amount) / rate);
}

export function formatCoin(coin: number | string | null | undefined): string {
  const num = Math.round(toFiniteNumber(coin));
  return `${money.format(num)} Coin`;
}

export function formatVndAsCoin(
  vnd: number | string | null | undefined,
  rateVnd = DEFAULT_COIN_VND_RATE,
): string {
  return formatCoin(vndToCoin(vnd, rateVnd));
}

export function formatCoursePriceCoin(
  vnd: number | string | null | undefined,
  rateVnd = DEFAULT_COIN_VND_RATE,
): string {
  const amount = toFiniteNumber(vnd);
  if (amount <= 0) return "Miễn phí";
  return formatCoin(vndToCoin(amount, rateVnd));
}

export function splitCoinPayment(
  priceCoin: number,
  bonusBalance: number,
  maxShare = BONUS_MAX_COINS_SHARE,
  bonusPerGold = BONUS_COINS_PER_GOLD,
) {
  if (priceCoin <= 0 || bonusPerGold <= 0) {
    return { bonusUse: 0, bonusGoldDiscount: 0, paidUse: Math.max(0, priceCoin) };
  }
  const maxBonusCoins = Math.floor(priceCoin * maxShare);
  const usableBonus = Math.max(0, Math.min(bonusBalance, maxBonusCoins));
  const bonusGoldDiscount = Math.min(Math.floor(usableBonus / bonusPerGold), priceCoin);
  const bonusUse = bonusGoldDiscount * bonusPerGold;
  return { bonusUse, bonusGoldDiscount, paidUse: priceCoin - bonusGoldDiscount };
}

export function purchaseCashbackBonus(priceCoin: number, rate = PURCHASE_CASHBACK_RATE) {
  if (priceCoin <= 0) return 0;
  return Math.floor(priceCoin * rate);
}

export function paymentCheck(
  priceCoin: number,
  balances: Pick<CoinBalances, "bonus" | "paid" | "rateVnd" | "bonusMaxShare">,
) {
  const { bonusUse, bonusGoldDiscount, paidUse } = splitCoinPayment(
    priceCoin,
    balances.bonus,
    BONUS_MAX_COINS_SHARE,
    BONUS_COINS_PER_GOLD,
  );
  const missingPaid = Math.max(0, paidUse - balances.paid);
  const cashbackBonus = purchaseCashbackBonus(priceCoin);
  return { ok: missingPaid === 0, bonusUse, bonusGoldDiscount, paidUse, missingPaid, cashbackBonus };
}

export function exchangeWhiteQuote(goldAmount: number, paidBalance: number, ratio = WHITE_PER_GOLD_EXCHANGE) {
  const whiteGained = goldAmount > 0 && Number.isInteger(goldAmount) ? goldAmount * ratio : 0;
  if (!Number.isInteger(goldAmount) || goldAmount < 1) {
    return { goldAmount, whiteGained: 0, valid: false, reason: "Nhập tối thiểu 1." };
  }
  if (goldAmount > paidBalance) {
    return {
      goldAmount,
      whiteGained,
      valid: false,
      reason: `Số dư không đủ (hiện có ${paidBalance}).`,
    };
  }
  return { goldAmount, whiteGained, valid: true, reason: null };
}

export function buyCoinQuote(coin: number, rateVnd: number) {
  const minCoin = vndToCoinCeil(MIN_TOPUP_VND, rateVnd);
  const vnd = coinToVnd(coin, rateVnd);
  if (!Number.isInteger(coin) || coin < minCoin) {
    return { coin, vnd, valid: false, reason: `Mua tối thiểu ${minCoin} Coin mỗi lần.` };
  }
  return { coin, vnd, valid: true, reason: null };
}

export function parseCoinBalances(response: CoinBalancesResponse): CoinBalances {
  return {
    bonus: response.bonus,
    paid: response.paid,
    total: response.total,
    rateVnd: response.rate_vnd,
    bonusMaxShare: response.bonus_max_share,
  };
}

export function coinBalanceLabel(balances: Pick<CoinBalances, "bonus" | "paid" | "total">) {
  return `${balances.paid} Coin vàng, ${balances.bonus} Coin trắng`;
}

/** Giảng viên rút theo số Coin; `withdrawable` là Coin có nguồn từ thu nhập (backend `check-can-request.balance`). */
export function withdrawQuote(coin: number, withdrawable: number, rateVnd: number, minCoin: number) {
  const vnd = coinToVnd(coin, rateVnd);
  if (!Number.isInteger(coin) || coin <= 0) return { coin, vnd, valid: false, reason: "Số Coin rút không hợp lệ." };
  if (coin < minCoin) return { coin, vnd, valid: false, reason: `Rút tối thiểu ${minCoin} Coin mỗi lần.` };
  if (coin > withdrawable) return { coin, vnd, valid: false, reason: `Bạn chỉ rút được tối đa ${withdrawable} Coin từ thu nhập giảng dạy.` };
  return { coin, vnd, valid: true, reason: null };
}
