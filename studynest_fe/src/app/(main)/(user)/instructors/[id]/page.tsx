import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InstructorTabs from "@/components/user/instructors/detail";
import type { InstructorDetailProfile } from "@/types/user/instructor";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const backendUrl = process.env.NEXT_PUBLIC_URL_BACKEND || "http://127.0.0.1:8000";

export type InstructorProfileResult =
  | { status: "found"; profile: InstructorDetailProfile }
  | { status: "not_found" }
  | { status: "unavailable"; statusCode?: number; message?: string };

const getInstructorProfile = React.cache(
  async (id: string): Promise<InstructorProfileResult> => {
    try {
      const res = await fetch(`${backendUrl}/api/v1/users/instructors/${encodeURIComponent(id)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      // 404 hoặc 422 (UUID sai định dạng) coi là hồ sơ không tồn tại
      if (res.status === 404 || res.status === 422) {
        return { status: "not_found" };
      }

      // Các lỗi 5xx hoặc mã trạng thái khác từ server
      if (!res.ok) {
        return { status: "unavailable", statusCode: res.status };
      }

      const data = (await res.json()) as InstructorDetailProfile;
      return { status: "found", profile: data };
    } catch (err: unknown) {
      // Bắt timeout hoặc lỗi rớt mạng kết nối đến backend
      return {
        status: "unavailable",
        message: err instanceof Error ? err.message : "Network error",
      };
    }
  }
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getInstructorProfile(id);

  if (result.status === "found") {
    const profile = result.profile;
    const name = profile.name || "Giáo viên";
    const bio = profile.short_bio || `Hồ sơ giáo viên ${name} trên nền tảng học tập Mây Mây.`;
    const canonicalUrl = `/instructors/${id}`;

    return {
      metadataBase: new URL(process.env.NEXT_PUBLIC_URL_FRONTEND || "http://localhost:3000"),
      title: `${name} | Đội ngũ giáo viên Mây Mây`,
      description: bio,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${name} | Đội ngũ giáo viên Mây Mây`,
        description: bio,
        url: canonicalUrl,
        type: "profile",
        ...(profile.avatar ? { images: [{ url: profile.avatar, alt: name }] } : {}),
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  if (result.status === "not_found") {
    return {
      title: "Không tìm thấy giáo viên | Mây Mây",
      description: "Hồ sơ giáo viên không tồn tại hoặc hiện không công khai.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Trường hợp unavailable (timeout, 5xx): noindex, không nói giáo viên không tồn tại
  return {
    title: "Hồ sơ giáo viên | Mây Mây",
    description: "Đang tải hồ sơ giáo viên trên nền tảng Mây Mây.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function InstructorPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getInstructorProfile(id);

  // CHỈ gọi notFound() khi kết quả thực sự là 404 hoặc 422!
  if (result.status === "not_found") {
    notFound();
  }

  // Trường hợp status === "unavailable" (timeout/5xx): không gọi notFound, render view kèm nút Retry
  const isFound = result.status === "found";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-background min-h-[75vh]">
      <InstructorTabs
        instructorId={id}
        initialProfile={isFound ? result.profile : null}
        initialUnavailable={!isFound}
      />
    </main>
  );
}
