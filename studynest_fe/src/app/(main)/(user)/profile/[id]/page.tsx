import ProfileLoader from "./client";

export default async function ProfilePageById({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfileLoader key={id} id={id} />;
}
