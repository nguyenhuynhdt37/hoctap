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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div
          role="status"
          aria-live="polite"
          className="bg-surface rounded-[24px] shadow-md border border-border p-8 text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-success-bg border border-success-border rounded-full flex items-center justify-center">
              <HiCheckCircle
                className="w-10 h-10 text-success-foreground"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Thanh toán thành công
            </h1>
            <p className="text-muted-foreground text-sm">
              Giao dịch của bạn đã được xử lý thành công
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-primary text-sm pt-2">
            <div
              className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>Đang chuyển hướng...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
