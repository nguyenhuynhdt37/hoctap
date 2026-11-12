import type { Metadata } from "next";
import { Suspense } from "react";
import { SavedInstructorsView } from "@/components/user/instructors/saved-instructors-view";

export const metadata: Metadata = {
  title: "Giáo viên đã lưu | Mây Mây",
  description: "Danh sách các giáo viên bạn đang theo dõi trên Mây Mây.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SavedInstructorsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-background min-h-[75vh]">
      <Suspense
        fallback={
          <div className="space-y-6 animate-pulse">
            <div className="h-20 w-full rounded-2xl bg-surface border border-border" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-[24px] bg-surface border border-border" />
              ))}
            </div>
          </div>
        }
      >
        <SavedInstructorsView />
      </Suspense>
    </main>
  );
}
