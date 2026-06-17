import InstructorTabs from "@/components/user/instructors/detail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InstructorPage({ params }: PageProps) {
  const { id } = await params;

  return <InstructorTabs instructorId={id} />;
}
