import WalletTxnDataLoader from "./client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <WalletTxnDataLoader id={id} />;
}
