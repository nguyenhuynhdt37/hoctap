import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function DiscountNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center border-border shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-destructive-bg text-destructive-foreground border border-destructive-border flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Không tìm thấy mã giảm giá
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Mã giảm giá bạn đang tìm kiếm không tồn tại hoặc đã được gỡ bỏ khỏi hệ
          thống quản trị.
        </p>
        <Link href="/admin/discounts" className="inline-block">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Quay lại danh sách
          </Button>
        </Link>
      </Card>
    </div>
  );
}
