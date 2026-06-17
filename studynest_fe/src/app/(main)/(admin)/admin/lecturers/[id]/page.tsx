import DetailLecturer from "@/components/admin/lecturers/detailLecturer";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const LectureDetailPage = async ({ params }: PageProps) => {
  const { id } = await params;
  return <DetailLecturer lecturerId={id} />;
};

export default LectureDetailPage;
