"use client";

import { playSound, triggerPerfectConfetti } from "@/lib/utils/helpers/effects";
import { useEffect } from "react";
import { HiCheckCircle } from "react-icons/hi";

const Success = () => {
  useEffect(() => {
    triggerPerfectConfetti();
    playSound("perfect");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6FAFF] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[24px] shadow-md border border-[#E7EEF7] p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#E4F3E9] border border-[#BFE3CC] rounded-full flex items-center justify-center">
              <HiCheckCircle className="w-10 h-10 text-[#276749]" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-[#3D4A5A]">
              Thanh toán thành công
            </h1>
            <p className="text-[#6F7C8C] text-sm">
              Giao dịch của bạn đã được xử lý thành công
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-[#356FA7] text-sm pt-2">
            <div className="w-4 h-4 border-2 border-[#356FA7] border-t-transparent rounded-full animate-spin"></div>
            <span>Đang chuyển hướng...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
