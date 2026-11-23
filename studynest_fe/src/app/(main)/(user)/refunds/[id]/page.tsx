import RefundDataLoader from "./client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RefundDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <RefundDataLoader key={id} id={id} />;
}
