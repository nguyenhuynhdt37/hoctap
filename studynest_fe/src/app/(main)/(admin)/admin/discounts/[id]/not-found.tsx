import Link from "next/link";
import { HiArrowLeft, HiXCircle } from "react-icons/hi";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-red-200 shadow-sm p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <HiXCircle className="h-6 w-6" />
            <h3 className="font-semibold text-lg">
              Không tìm thấy mã giảm giá
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            Mã giảm giá bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
          </p>
          <Link
            href="/admin/discounts"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <HiArrowLeft className="h-5 w-5" />
            <span>Quay lại danh sách</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
