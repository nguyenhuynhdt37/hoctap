import { Skeleton } from "@/components/ui";

/**
 * Skeleton chuyển trang nhẹ chuẩn Cloudy Blue cho phân hệ Giảng viên (/lecturer/*).
 * Tránh phủ fullscreen backdrop-blur gây cảm giác khựng khi chuyển route.
 */
export default function LecturerLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang tải nội dung giảng viên..."
      className="min-h-[70vh] bg-background"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2.5">
            <Skeleton variant="text" className="h-5 w-36 rounded-full" />
            <Skeleton variant="text" className="h-9 w-72 rounded-xl" />
            <Skeleton variant="text" className="h-4 w-96 max-w-full rounded-md" />
          </div>
          <Skeleton variant="rect" className="h-10 w-40 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, idx) => (
            <Skeleton key={idx} variant="rect" className="h-28 rounded-[20px]" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton variant="rect" className="lg:col-span-8 h-80 rounded-[24px]" />
          <Skeleton variant="rect" className="lg:col-span-4 h-80 rounded-[24px]" />
        </div>
      </div>
    </div>
  );
}
