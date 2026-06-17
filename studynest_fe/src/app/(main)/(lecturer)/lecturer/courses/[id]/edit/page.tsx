import EditCourse from "@/components/lecturer/courses/edit";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const EditCoursePage = async ({ params }: PageProps) => {
  const { id } = await params;
  return <EditCourse courseId={id} />;
};

export default EditCoursePage;
