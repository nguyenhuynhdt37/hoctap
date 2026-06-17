interface Props {
  amount: string;
  loading: boolean;
  error: string;
  success: string;
  onAmountChange: (value: string) => void;
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
    <div className="rounded-2xl border border-gray-100 bg-white/60 p-6 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Nạp tiền qua PayPal
          </h2>
          <p className="mt-1.5 text-sm text-gray-600">
            Thanh toán an toàn, xử lý trong vài giây. Ví sẽ cập nhật ngay khi
            giao dịch hoàn tất.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-green-200 bg-green-50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M9.75 6.5h6.033c1.83 0 3.217 1.531 2.987 3.344-.266 2.08-1.806 3.292-3.788 3.292h-1.47a.75.75 0 0 0-.74.628l-.261 1.562a.75.75 0 0 1-.74.628H9.221a.5.5 0 0 1-.495-.574l1.05-7.297a1.5 1.5 0 0 1 1.485-1.283Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-600"
            />
          </svg>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-gray-700">
        <div className="flex flex-wrap items-center gap-3 font-medium text-green-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Bảo mật PayPal Checkout
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Hoàn tiền 24h nếu không thành công
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
          Số tiền cần nạp (VND)
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={handleAmountChange}
            placeholder="Ví dụ: 500,000"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-base text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
          <p className="text-xs text-gray-500">Số tiền tối thiểu: 50,000 VND</p>
        </label>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-600 self-center">
            Gợi ý:
          </span>
          {quickAmounts.map((val) => {
            const formatted = val
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return (
              <button
                key={val}
                type="button"
                onClick={() => onAmountChange(formatted)}
                className="rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-50 hover:border-green-300"
              >
                {formatted} ₫
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-gray-700">
          Thông báo: Giao dịch nạp tiền sẽ được thực hiện trên PayPal. Sau khi
          hoàn tất, bạn sẽ được đưa trở lại StudyNest.
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <button
          onClick={onDeposit}
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/40">
            ₫
          </span>
          {loading ? "Đang tạo giao dịch..." : "Nạp tiền ngay"}
        </button>

        <div className="rounded-xl border border-dashed border-green-200 px-4 py-3 text-xs text-gray-500">
          Lưu ý: giữ cửa sổ PayPal mở đến khi hệ thống thông báo thành công để
          tránh giao dịch bị gián đoạn.
        </div>
      </div>
    </div>
  );
}
