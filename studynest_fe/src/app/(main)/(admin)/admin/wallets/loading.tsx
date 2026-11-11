import MiniLoading from "@/components/shared/loading/MiniLoading";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <MiniLoading size="lg" text="Đang tải thông tin ví hệ thống..." />
    </div>
  );
}
