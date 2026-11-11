import type { Metadata } from "next";
export async function learningMetadata(
  kind: "learning-paths" | "bundles",
  slug: string,
): Promise<Metadata> {
  const title =
    kind === "learning-paths" ? "Lộ trình học tập" : "Combo khóa học";
  const canonical = `/${kind === "learning-paths" ? "lo-trinh" : "combo"}/${encodeURIComponent(slug)}`;
  try {
    const base = process.env.NEXT_PUBLIC_URL_BACKEND || "http://127.0.0.1:8000";
    const response = await fetch(
      `${base}/api/v1/${kind}/${encodeURIComponent(slug)}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return { title, robots: { index: false, follow: false } };
    const data: { title: string; description: string } = await response.json();
    return {
      title: data.title,
      description: data.description.slice(0, 160),
      alternates: { canonical },
    };
  } catch {
    return { title, alternates: { canonical } };
  }
}
