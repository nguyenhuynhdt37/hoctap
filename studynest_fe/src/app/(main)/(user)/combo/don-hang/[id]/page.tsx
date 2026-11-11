import { BundleReceiptView } from "@/components/learning-paths/my-learning-paths";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BundleReceiptView id={id} />;
}
