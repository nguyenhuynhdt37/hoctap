"use client";

import { Card, EmptyState } from "@/components/ui";
import { Tag } from "lucide-react";

export function DiscountsEmpty() {
  return (
    <Card variant="surface" className="p-8">
      <EmptyState
        icon={<Tag className="h-7 w-7" />}
        title="Chưa có mã giảm giá nào"
        description="Bắt đầu tạo mã giảm giá đầu tiên của bạn để thu hút học viên"
      />
    </Card>
  );
}

