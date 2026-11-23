export const DEFAULT_COIN_VND_RATE = 10_000;

const coinFormatter = new Intl.NumberFormat('vi-VN');

function toFiniteNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function vndToCoin(
  vnd: number | string | null | undefined,
  rateVnd = DEFAULT_COIN_VND_RATE,
): number {
  const amount = toFiniteNumber(vnd);
  if (amount === 0) return 0;
  const rate = rateVnd > 0 ? rateVnd : DEFAULT_COIN_VND_RATE;
  const sign = amount < 0 ? -1 : 1;
  return sign * Math.ceil(Math.abs(amount) / rate);
}

export function formatCoin(coin: number | string | null | undefined): string {
  const num = Math.round(toFiniteNumber(coin));
  return `${coinFormatter.format(num)} Coin`;
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
  if (amount <= 0) return 'Miễn phí';
  return formatCoin(vndToCoin(amount, rateVnd));
}
