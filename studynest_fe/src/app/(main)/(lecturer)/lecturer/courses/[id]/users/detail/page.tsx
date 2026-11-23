import StudentDetailDataLoader from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const [{ id }, { user_id: userId }] = await Promise.all([params, searchParams]);
  return <StudentDetailDataLoader id={id} userId={String(userId)} />;
}
