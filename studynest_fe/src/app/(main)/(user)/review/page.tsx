import { HubRouteGuard, ReviewView } from "@/components/learning-hub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ôn tập ngắt quãng | Mây Mây",
  description: "Ôn tập các câu hỏi trắc nghiệm đến hạn gắn liền với bài học trong khóa.",
};

export default async function ReviewPage({ searchParams }: {
  searchParams: Promise<{ course_id?: string; limit?: string }>;
}) {
  const { course_id, limit } = await searchParams;
  return (
    <HubRouteGuard>
      <ReviewView key={`${course_id ?? ""}:${limit === "1" ? "1" : ""}`} limit={limit === "1" ? 1 : undefined} courseId={typeof course_id === "string" ? course_id : undefined} />
    </HubRouteGuard>
  );
}
