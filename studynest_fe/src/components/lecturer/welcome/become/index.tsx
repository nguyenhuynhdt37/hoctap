"use client";

import {
  useBecomeInstructor,
  INSTRUCTOR_FEE,
} from "@/hooks/useBecomeInstructor";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  GraduationCap,
  Loader2,
  MonitorPlay,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

export const BecomeLecturerAction = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { becomeInstructor, isLoading } = useBecomeInstructor();

  const handleConfirm = async () => {
    const success = await becomeInstructor();
    if (success) {
      setIsModalOpen(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="group relative px-8 py-4 bg-[#00a73d] text-white rounded-xl font-bold text-lg shadow-lg shadow-[#00a73d]/20 hover:shadow-xl hover:shadow-[#00a73d]/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <GraduationCap className="mr-2 h-6 w-6 relative z-10" />
        <span className="relative z-10">Đăng ký ngay</span>
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoading && setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                duration: 0.2,
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
              className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6 text-center relative">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isLoading}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-20 h-20 bg-[#00a73d]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="w-10 h-10 text-[#00a73d]" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Trở thành Giảng viên
                </h2>
                <p className="text-gray-500">
                  Mở khóa tiềm năng giảng dạy và kiếm thu nhập từ kiến thức của
                  bạn
                </p>
              </div>

              {/* Body */}
              <div className="px-8 pb-8 space-y-6">
                {/* Benefits */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-[#00a73d]/10 rounded-lg shrink-0">
                      <MonitorPlay className="w-5 h-5 text-[#00a73d]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Tạo khóa học không giới hạn
                      </h3>
                      <p className="text-sm text-gray-500">
                        Tự do sáng tạo nội dung và lộ trình học tập
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-[#00a73d]/10 rounded-lg shrink-0">
                      <Wallet className="w-5 h-5 text-[#00a73d]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Thu nhập hấp dẫn
                      </h3>
                      <p className="text-sm text-gray-500">
                        Nhận hoa hồng cao và rút tiền về tài khoản
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fee Info */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 font-medium">
                      Phí đăng ký
                    </span>
                    <span className="text-2xl font-bold text-[#00a73d]">
                      {formatPrice(INSTRUCTOR_FEE)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    Phí sẽ được trừ trực tiếp vào ví của bạn
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="w-full bg-[#00bba7] hover:bg-[#009235] text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-[#00bba7]/25 hover:shadow-xl hover:shadow-[#00bba7]/35 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span>Xác nhận thanh toán</span>
                      <CheckCircle2 className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
