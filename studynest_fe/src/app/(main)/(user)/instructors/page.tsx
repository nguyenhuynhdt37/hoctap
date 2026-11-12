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
    <main className="mx-auto max-w-7xl space-y-6 bg-background px-4 py-8 sm:px-6 sm:py-10">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="hidden md:block h-96 rounded-[24px] bg-surface border border-border" />
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 rounded-[24px] bg-surface border border-border" />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <InstructorDirectory />
      </Suspense>
    </main>
  );
}
