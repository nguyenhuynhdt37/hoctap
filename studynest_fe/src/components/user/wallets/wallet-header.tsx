import { HiCreditCard } from "react-icons/hi";

export default function WalletHeader() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        <HiCreditCard className="h-4 w-4" />
        <span>Tài chính học tập</span>
      </div>
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
        Ví của tôi
      </h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Quản lý số dư, theo dõi lịch sử giao dịch học phí và nạp tiền an toàn qua PayPal
        để sẵn sàng tham gia các khóa học trên Học viện Mây Mây.
      </p>
    </div>
  );
}
