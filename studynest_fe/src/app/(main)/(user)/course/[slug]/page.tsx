import CourseDetail from "@/components/user/course_detail";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return <CourseDetail />;
}
