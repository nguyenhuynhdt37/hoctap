"use client";

import { Card, Skeleton } from "@/components/ui";

export function HoldEarningsSkeleton({
  viewMode = "grid",
}: {
  viewMode?: "grid" | "table";
}) {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            variant="surface"
            className="space-y-4 rounded-[24px] p-5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-36 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-12 w-full rounded-2xl" />
            <div className="flex gap-3">
              <Skeleton className="h-14 w-22 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card variant="surface" className="overflow-hidden rounded-[24px]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-primary-light/30">
            <tr>
              {Array.from({ length: 7 }).map((_, index) => (
                <th key={index} className="px-6 py-4 text-left">
                  <Skeleton className="h-4 w-24 rounded-md" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: 7 }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <Skeleton className="h-4 w-full rounded-md" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
