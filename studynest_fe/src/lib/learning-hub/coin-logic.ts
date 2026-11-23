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

export const MIN_TOPUP_VND = 50_000;

const money = new Intl.NumberFormat("vi-VN");

export const formatVnd = (value: number) => `${money.format(value)} đ`;

export const coinToVnd = (coin: number, rateVnd: number) => coin * rateVnd;

export const vndToCoinCeil = (vnd: number, rateVnd: number) => Math.ceil(vnd / rateVnd);

export function splitCoinPayment(priceCoin: number, bonusBalance: number, maxShare: number) {
  const cap = Math.floor(priceCoin * maxShare);
  const bonusUse = Math.max(0, Math.min(bonusBalance, cap, priceCoin));
  return { bonusUse, paidUse: priceCoin - bonusUse };
}

export function paymentCheck(priceCoin: number, balances: Pick<CoinBalances, "bonus" | "paid" | "rateVnd" | "bonusMaxShare">) {
  const { bonusUse, paidUse } = splitCoinPayment(priceCoin, balances.bonus, balances.bonusMaxShare);
  const missingPaid = Math.max(0, paidUse - balances.paid);
  return { ok: missingPaid === 0, bonusUse, paidUse, missingPaid };
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
  return `Số dư ${balances.total} Coin: ${balances.paid} Coin thật, ${balances.bonus} Coin thưởng`;
}
