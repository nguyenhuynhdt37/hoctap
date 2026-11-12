"use client";

import { Card, EmptyState } from "@/components/ui";
import { Clock } from "lucide-react";

export function HoldEarningsEmpty() {
  return (
    <Card variant="surface" className="p-8">
      <EmptyState
        icon={<Clock className="h-7 w-7" />}
        title="Không có giao dịch đang hold"
        description="Hiện tại không có khoản tiền nào đang được hệ thống giữ"
      />
    </Card>
  );
}

