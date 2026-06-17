import Categories from "@/components/user/categories";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CategoriesPage({ params }: PageProps) {
  const { slug } = await params;

  return <Categories slug={slug} />;
}
