import { MemberProfileView } from "@/components/user/members/member-profile-view";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberProfileView memberId={id} />;
}
