import DetaiUser from "@/components/admin/users/detaiUser";

const UserDetailsPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  return <DetaiUser userId={id} />;
};

export default UserDetailsPage;
