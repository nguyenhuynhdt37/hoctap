"use client";

import { Card, Skeleton } from "@/components/ui";

export function DiscountsSkeleton() {
  return (
    <Card variant="surface" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background border-b border-border">
            <tr>
              {Array.from({ length: 8 }).map((_, index) => (
                <th key={index} className="px-6 py-4 text-left">
                  <Skeleton className="h-4 w-24 rounded-md" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-background/50">
                {Array.from({ length: 8 }).map((_, colIndex) => (
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

