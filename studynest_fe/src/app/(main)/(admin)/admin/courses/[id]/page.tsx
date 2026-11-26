import AdminCourseReviewDetailView from "@/components/admin/courses/detail";

export default async function AdminCourseReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminCourseReviewDetailView courseId={id} />;
}
