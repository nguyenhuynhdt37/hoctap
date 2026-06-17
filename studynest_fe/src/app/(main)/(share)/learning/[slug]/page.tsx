import LearningDetail from "@/components/user/learning_detail";
import { getServerCookie } from "@/lib/utils/fetcher/server/cookieStore";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { LearningCourseData } from "@/types/user/learning";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function LearningDetailPage({ params }: PageProps) {
  const stores = await cookies();
  const result = await fetcher("/auth/check_is_login", stores);
  if (!result.ok) {
    redirect("/login");
  }

  // Lấy access_token từ cookie ở server
  const accessToken = getServerCookie(stores, "access_token");

  const { slug } = await params;

  try {
    // Fetch course data từ server
    const courseResponse = await fetcher(`/learning/${slug}`, stores);

    if (courseResponse.ok) {
      const courseData: LearningCourseData = await courseResponse.json();
      console.log("Course data:", courseData);
      return (
        <LearningDetail
          courseData={courseData}
          error={undefined}
          accessToken={accessToken || undefined}
        />
      );
    } else {
      // Xử lý lỗi từ API
      const errorData = await courseResponse.json().catch(() => ({}));
      return (
        <LearningDetail
          courseData={null as any}
          error={{
            status: courseResponse.status,
            message: errorData.detail || errorData.message || "Có lỗi xảy ra",
          }}
          accessToken={accessToken || undefined}
        />
      );
    }
  } catch (error) {
    // Xử lý lỗi network hoặc lỗi khác
    console.error("Error fetching course data:", error);
    return (
      <LearningDetail
        courseData={null as any}
        error={{
          status: 500,
          message: "Không thể kết nối đến server. Vui lòng thử lại sau.",
        }}
        accessToken={accessToken || undefined}
      />
    );
  }
}
