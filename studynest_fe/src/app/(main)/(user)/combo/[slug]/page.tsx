import { learningMetadata } from "@/lib/server/learning-metadata";
import BundleDetail from "@/components/learning-paths/bundle-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BundleDetail slug={slug} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return learningMetadata("bundles", slug);
}
