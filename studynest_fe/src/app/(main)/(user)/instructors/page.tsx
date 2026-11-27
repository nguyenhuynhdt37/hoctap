import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InstructorDirectory } from "@/components/user/instructors/instructor-directory";

interface InstructorsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: InstructorsPageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const hasFilter = Object.keys(resolvedParams).some((k) => k !== "sort" && resolvedParams[k]);

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_URL_FRONTEND || "http://localhost:3000"),
    title: "Đội ngũ giáo viên | Mây Mây",
    description:
      "Khám phá danh sách giáo viên giảng dạy các môn học từ lớp 1 đến lớp 12 trên nền tảng học tập Mây Mây.",
    alternates: {
      canonical: "/instructors",
    },
    robots: hasFilter
      ? {
          index: false,
          follow: true,
        }
      : {
          index: true,
          follow: true,
        },
  };
}

export default function InstructorsPage() {
  return (
    <main className="user-container space-y-6 bg-background py-8 sm:py-10">
      {/* Breadcrumb điều hướng */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors">
          Trang chủ
        </Link>
        <span aria-hidden="true" className="text-border">
          /
        </span>
        <span className="font-medium text-foreground">Đội ngũ giáo viên</span>
      </nav>

      <Suspense
        fallback={
          <div className="space-y-6 animate-pulse">
            <div className="h-44 w-full rounded-[28px] bg-surface border border-border" />
            <div className="h-10 w-full max-w-md rounded-xl bg-surface border border-border" />
            <div className="user-four-column-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-3xl border border-border bg-surface" />
              ))}
            </div>
          </div>
        }
      >
        <InstructorDirectory />
      </Suspense>
    </main>
  );
}
