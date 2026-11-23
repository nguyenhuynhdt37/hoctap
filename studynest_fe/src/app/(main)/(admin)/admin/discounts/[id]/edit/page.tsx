import DiscountEditDataLoader from "./client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDiscountPage({ params }: PageProps) {
  const { id } = await params;
  return <DiscountEditDataLoader discountId={id} />;
}
