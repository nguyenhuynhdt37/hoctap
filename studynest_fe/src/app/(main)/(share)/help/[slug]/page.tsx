import HelpCenter from "@/components/user/help-center";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function HelpSectionPage({ params }: PageProps) {
  const { slug } = await params;
  return <HelpCenter activeSection={slug} />;
}

