import { HiExclamationCircle } from "react-icons/hi";

export function RefundRequestsEmpty() {
  return (
    <div className="bg-white rounded-xl border border-green-200 shadow-sm p-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <HiExclamationCircle className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Không có yêu cầu hoàn tiền nào
        </h3>
        <p className="text-gray-600">
          Hiện tại không có yêu cầu hoàn tiền nào cần xử lý.
        </p>
      </div>
    </div>
  );
}

