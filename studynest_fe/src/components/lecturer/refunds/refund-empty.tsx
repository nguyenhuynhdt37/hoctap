import { Card, EmptyState } from "@/components/ui";
import { RotateCcw } from "lucide-react";

export function RefundRequestsEmpty() {
  return (
    <Card variant="surface" className="p-8">
      <EmptyState
        icon={<RotateCcw className="h-7 w-7" />}
        title="Không có yêu cầu hoàn tiền nào"
        description="Hiện tại không có yêu cầu hoàn tiền nào cần xử lý."
      />
    </Card>
  );
}

