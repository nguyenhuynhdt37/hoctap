import MiniLoading from "@/components/shared/loading/MiniLoading";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <MiniLoading size="lg" text="Đang chuẩn bị không gian bài giảng..." />
    </div>
  );
}
