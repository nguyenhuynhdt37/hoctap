import { learningMetadata } from "@/lib/server/learning-metadata";
import { Suspense } from "react";
import PathDetail from "@/components/learning-paths/path-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={<p role="status">Đang tải lộ trình…</p>}>
      <PathDetail slug={slug} />
    </Suspense>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return learningMetadata("learning-paths", slug);
}
