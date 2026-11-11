"use client";

import { HiXCircle } from "react-icons/hi";

const Failed = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div
          role="alert"
          className="bg-surface rounded-[24px] shadow-md border border-border p-8 text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-destructive-bg border border-destructive-border rounded-full flex items-center justify-center">
              <HiXCircle
                className="w-10 h-10 text-destructive-foreground"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Thanh toán thất bại
            </h1>
            <p className="text-muted-foreground text-sm">
              Đã xảy ra lỗi trong quá trình thanh toán
            </p>
            <p className="text-subtle-foreground text-xs">
              Vui lòng thử lại sau hoặc liên hệ hỗ trợ
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-destructive-foreground text-sm pt-2">
            <div
              className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>Đang chuyển hướng...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Failed;
