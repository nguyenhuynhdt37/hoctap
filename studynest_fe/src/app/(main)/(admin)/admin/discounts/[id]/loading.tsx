import MiniLoading from "@/components/shared/loading/MiniLoading";

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6 bg-background">
      <MiniLoading size="lg" text="Đang tải thông tin mã giảm giá..." />
    </div>
  );
}
