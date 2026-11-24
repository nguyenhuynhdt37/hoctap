"use client";

import { Button, Card, EmptyState } from "@/components/ui";
import { Clock, RotateCcw } from "pulsoicon-react";

interface HoldEarningsEmptyProps {
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

export function HoldEarningsEmpty({
  hasActiveFilters = false,
  onResetFilters,
}: HoldEarningsEmptyProps) {
  return (
    <Card variant="surface" className="rounded-[24px] p-10">
      <EmptyState
        icon={<Clock className="h-8 w-8 text-primary" />}
        title={
          hasActiveFilters
            ? "Không tìm thấy khoản tiền phù hợp"
            : "Không có giao dịch đang tạm giữ"
        }
        description={
          hasActiveFilters
            ? "Hãy thử điều chỉnh bộ lọc trạng thái, khóa học hoặc khoảng thời gian."
            : "Tuyệt vời — hiện tại toàn bộ khoản thu nhập của bạn đều ổn định, không có khoản nào đang chờ giữ quỹ."
        }
        action={
          hasActiveFilters && onResetFilters ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              leftIcon={<RotateCcw className="h-4 w-4" />}
              onClick={onResetFilters}
            >
              Đặt lại bộ lọc
            </Button>
          ) : undefined
        }
      />
    </Card>
  );
}
