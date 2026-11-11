"use client";

import { Button, Card, Modal } from "@/components/ui";
import {
  INSTRUCTOR_FEE,
  useBecomeInstructor,
} from "@/hooks/useBecomeInstructor";
import { CheckCircle2, GraduationCap, MonitorPlay, Wallet } from "lucide-react";
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
      <Button
        variant="primary"
        size="lg"
        onClick={() => setIsModalOpen(true)}
        className="px-7"
      >
        <GraduationCap className="h-5 w-5" />
        <span>Đăng ký ngay</span>
      </Button>

      <Modal
        open={isModalOpen}
        onClose={() => !isLoading && setIsModalOpen(false)}
        title="Trở thành Giảng viên"
        description="Mở khóa tiềm năng giảng dạy và kiếm thu nhập từ kiến thức của bạn"
        size="md"
      >
        <div className="space-y-6">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto border border-primary-pastel">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-background transition-colors">
              <div className="p-2 bg-primary-light rounded-lg shrink-0">
                <MonitorPlay className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Tạo khóa học không giới hạn
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tự do sáng tạo nội dung và lộ trình học tập
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-background transition-colors">
              <div className="p-2 bg-secondary-light rounded-lg shrink-0">
                <Wallet className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Thu nhập hấp dẫn
                </h3>
                <p className="text-xs text-muted-foreground">
                  Nhận hoa hồng cao và rút tiền về tài khoản
                </p>
              </div>
            </div>
          </div>

          {/* Fee Info */}
          <Card density="compact" className="bg-background">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm font-medium">
                Phí đăng ký
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(INSTRUCTOR_FEE)}
              </span>
            </div>
            <p className="text-xs text-subtle-foreground text-center">
              Phí sẽ được trừ trực tiếp vào ví của bạn
            </p>
          </Card>

          {/* Action Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleConfirm}
            isLoading={isLoading}
            loadingText="Đang xử lý..."
          >
            <span>Xác nhận thanh toán</span>
            <CheckCircle2 className="w-5 h-5" />
          </Button>
        </div>
      </Modal>
    </>
  );
};
