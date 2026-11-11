import { Suspense } from "react";
import ProviderProfile from "@/components/catalog/provider-profile";
export default async function ProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><Suspense fallback={<p>Đang tải…</p>}><ProviderProfile slug={slug} /></Suspense></main>;
}
