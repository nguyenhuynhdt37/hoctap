"use client";

import { HiOutlineTag } from "react-icons/hi";

export function DiscountsEmpty() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12">
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="rounded-full bg-green-50 p-4 text-green-600">
          <HiOutlineTag className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-900">
            Chưa có mã giảm giá nào
          </p>
          <p className="text-sm text-gray-500">
            Bắt đầu tạo mã giảm giá đầu tiên để thu hút học viên
          </p>
        </div>
      </div>
    </div>
  );
}

