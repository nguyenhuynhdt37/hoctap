import EditUser from "@/components/admin/users/edit";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditUserPage({ params }: PageProps) {
  const { id } = await params;

  return <EditUser userId={id} />;
}
