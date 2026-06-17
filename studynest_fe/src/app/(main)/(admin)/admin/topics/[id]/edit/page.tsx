import EditTopic from "@/components/admin/topics/edit";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const EditTopicPage = async ({ params }: PageProps) => {
  const { id } = await params;
  return <EditTopic topicId={id} />;
};

export default EditTopicPage;
