"use client";

import { HiOutlineClock } from "react-icons/hi";

export function HoldEarningsEmpty() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="rounded-full bg-green-50 p-4 text-green-500">
          <HiOutlineClock className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-900">
            Không có giao dịch đang hold
          </p>
          <p className="text-sm text-gray-500">
            Hiện tại không có khoản tiền nào đang được hệ thống giữ
          </p>
        </div>
      </div>
    </div>
  );
}

