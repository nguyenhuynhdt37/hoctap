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
        className="group relative px-7 py-3.5 bg-[#356FA7] hover:bg-[#285C90] text-white rounded-xl font-semibold text-base shadow-xs hover:shadow-sm transition-all duration-200 flex items-center overflow-hidden cursor-pointer"
      >
        <GraduationCap className="mr-2 h-5 w-5 relative z-10" />
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
              className="absolute inset-0 bg-[#3D4A5A]/30 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-lg bg-white rounded-[24px] shadow-lg overflow-hidden border border-[#E7EEF7]"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6 text-center relative">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isLoading}
                  className="absolute top-4 right-4 p-2 text-[#6F7C8C] hover:text-[#3D4A5A] hover:bg-[#F6FAFF] rounded-full transition-all disabled:opacity-50 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-16 h-16 bg-[#E8F2FA] rounded-full flex items-center justify-center mx-auto mb-5 border border-[#BFD7ED]">
                  <GraduationCap className="w-8 h-8 text-[#356FA7]" />
                </div>

                <h2 className="font-display text-2xl font-bold text-[#3D4A5A] mb-2">
                  Trở thành Giảng viên
                </h2>
                <p className="text-sm text-[#6F7C8C]">
                  Mở khóa tiềm năng giảng dạy và kiếm thu nhập từ kiến thức của
                  bạn
                </p>
              </div>

              {/* Body */}
              <div className="px-8 pb-8 space-y-6">
                {/* Benefits */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#F6FAFF] transition-colors">
                    <div className="p-2 bg-[#E8F2FA] rounded-lg shrink-0">
                      <MonitorPlay className="w-5 h-5 text-[#356FA7]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#3D4A5A] text-sm">
                        Tạo khóa học không giới hạn
                      </h3>
                      <p className="text-xs text-[#6F7C8C]">
                        Tự do sáng tạo nội dung và lộ trình học tập
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#F6FAFF] transition-colors">
                    <div className="p-2 bg-[#FCE8EF] rounded-lg shrink-0">
                      <Wallet className="w-5 h-5 text-[#8A3B58]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#3D4A5A] text-sm">
                        Thu nhập hấp dẫn
                      </h3>
                      <p className="text-xs text-[#6F7C8C]">
                        Nhận hoa hồng cao và rút tiền về tài khoản
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fee Info */}
                <div className="bg-[#F6FAFF] rounded-2xl p-5 border border-[#E7EEF7]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#6F7C8C] text-sm font-medium">
                      Phí đăng ký
                    </span>
                    <span className="text-2xl font-bold text-[#356FA7]">
                      {formatPrice(INSTRUCTOR_FEE)}
                    </span>
                  </div>
                  <p className="text-xs text-[#8190A3] text-center">
                    Phí sẽ được trừ trực tiếp vào ví của bạn
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="w-full bg-[#356FA7] hover:bg-[#285C90] text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-xs hover:shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
