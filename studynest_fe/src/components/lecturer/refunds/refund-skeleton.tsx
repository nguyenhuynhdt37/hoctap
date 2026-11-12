import { Card, Skeleton } from "@/components/ui";

export function RefundRequestsSkeleton() {
  return (
    <Card variant="surface" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Thông tin
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Số tiền
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ngày yêu cầu
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-20 h-14 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-3 w-1/2 rounded-md" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-6 w-24 rounded-full" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-5 w-32 rounded-md" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-28 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

