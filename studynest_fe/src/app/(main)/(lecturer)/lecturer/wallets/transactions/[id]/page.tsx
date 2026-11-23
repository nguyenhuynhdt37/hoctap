import TransactionDataLoader from "./client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TransactionDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <TransactionDataLoader id={id} />;
}
