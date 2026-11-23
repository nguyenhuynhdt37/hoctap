import RefundDataLoader from "./client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LecturerRefundDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <RefundDataLoader id={id} />;
}
