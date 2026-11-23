import { GoalsView, HubRouteGuard } from "@/components/learning-hub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mục tiêu & Kế hoạch học tập | Mây Mây",
  description: "Đặt mục tiêu hoàn thành khóa học hoặc lộ trình và theo dõi lịch học từng tuần.",
};

export default async function GoalsPage({ searchParams }: {
  searchParams: Promise<{ course_id?: string; path_id?: string }>;
}) {
  const { course_id, path_id } = await searchParams;
  return (
    <HubRouteGuard>
      <GoalsView
        key={`${course_id ?? ""}:${path_id ?? ""}`}
        courseId={typeof course_id === "string" ? course_id : undefined}
        pathId={typeof path_id === "string" ? path_id : undefined}
      />
    </HubRouteGuard>
  );
}
