import { Button } from "@/components/ui";
import { HiCheck, HiInformationCircle, HiShieldCheck } from "react-icons/hi";

interface Props {
  amount: string;
  loading: boolean;
  error?: string;
  success?: string;
  onAmountChange: (amount: string) => void;
  onDeposit: () => void;
}

export function WalletDepositCard({
  amount,
  loading,
  error,
  success,
  onAmountChange,
  onDeposit,
}: Props) {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    if (value === "") {
      onAmountChange("");
      return;
    }
    const numValue = Number(value);
    if (!Number.isNaN(numValue)) {
      const formatted = numValue
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      onAmountChange(formatted);
    }
  };

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000];

  return (
    <div className="rounded-[28px] border border-border bg-surface/90 p-7 shadow-xs backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Nạp tiền qua PayPal
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Thanh toán quốc tế an toàn và tức thì. Số dư sẽ được cộng vào ví ngay khi
            giao dịch PayPal hoàn tất.
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel/80 bg-primary-light text-primary shadow-2xs">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M9.75 6.5h6.033c1.83 0 3.217 1.531 2.987 3.344-.266 2.08-1.806 3.292-3.788 3.292h-1.47a.75.75 0 0 0-.74.628l-.261 1.562a.75.75 0 0 1-.74.628H9.221a.5.5 0 0 1-.495-.574l1.05-7.297a1.5 1.5 0 0 1 1.485-1.283Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Banner Cam kết bảo mật */}
      <div className="mt-5 rounded-2xl border border-primary-pastel/70 bg-primary-light/50 px-4 py-3 text-xs text-foreground">
        <div className="flex flex-wrap items-center gap-4 font-medium text-primary">
          <span className="inline-flex items-center gap-1.5">
            <HiShieldCheck className="h-4 w-4" />
            Bảo mật PayPal 256-bit
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Hỗ trợ hoàn tiền nếu phát sinh lỗi
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Input số tiền */}
        <div className="space-y-1.5">
          <label
            htmlFor="deposit-amount"
            className="block text-xs font-semibold text-foreground"
          >
            Số tiền nạp (VND)
          </label>
          <div className="relative">
            <input
              id="deposit-amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="500,000"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base font-semibold text-foreground placeholder:text-subtle-foreground outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              VND
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Số tiền nạp tối thiểu mỗi lần: 50,000 VND
          </p>
        </div>

        {/* Các mốc tiền gợi ý */}
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Chọn nhanh:
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickAmounts.map((val) => {
              const formatted = val
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
              const isSelected = amount === formatted;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => onAmountChange(formatted)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border border-primary bg-primary text-primary-foreground shadow-2xs"
                      : "border border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light"
                  }`}
                >
                  {formatted} ₫
                </button>
              );
            })}
          </div>
        </div>

        {/* Hướng dẫn ngắn */}
        <div className="flex items-start gap-2 rounded-2xl border border-border/80 bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
          <HiInformationCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Hệ thống sẽ mở cổng thanh toán PayPal. Sau khi xác nhận, bạn sẽ tự động
            được chuyển hướng trở lại Mây Mây.
          </span>
        </div>

        {/* Thông báo lỗi / thành công */}
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive-bg p-3 text-xs font-medium text-destructive-foreground">
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-primary-pastel bg-primary-light p-3 text-xs font-medium text-primary">
            <HiCheck className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Nút hành động */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          disabled={loading}
          isLoading={loading}
          loadingText="Đang kết nối PayPal..."
          onClick={onDeposit}
          className="rounded-2xl font-semibold shadow-xs"
        >
          <span>Nạp tiền ngay</span>
        </Button>

        <p className="text-center text-[11px] text-subtle-foreground">
          Vui lòng không đóng tab trình duyệt khi PayPal đang tiến hành xử lý thanh toán.
        </p>
      </div>
    </div>
  );
}
