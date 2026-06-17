"use client";

import { HiXCircle } from "react-icons/hi";

const Failed = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
              <HiXCircle className="w-10 h-10 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Thanh toán thất bại
            </h1>
            <p className="text-gray-600 text-sm">
              Đã xảy ra lỗi trong quá trình thanh toán
            </p>
            <p className="text-gray-500 text-xs">
              Vui lòng thử lại sau hoặc liên hệ hỗ trợ
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-red-500 text-sm pt-2">
            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Đang chuyển hướng...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Failed;

