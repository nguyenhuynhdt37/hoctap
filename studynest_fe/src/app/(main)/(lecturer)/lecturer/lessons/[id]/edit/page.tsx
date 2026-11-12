"use client";

import EditCodeLesson from "@/components/lecturer/lessons/edit/code";
import EditQuizLesson from "@/components/lecturer/lessons/edit/quizzes";
import EditVideoLesson from "@/components/lecturer/lessons/edit/video";
import { Alert, Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";

export default function EditLessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params?.id as string;

  const { data: lessonDetail, error, isLoading, mutate } = useSWR(
    lessonId ? `/lecturer/lessons/${lessonId}/detail` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  if (error && !lessonDetail) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Alert variant="destructive" title="Không thể tải thông tin bài học">
          <p>Bài học không tồn tại, bạn không có quyền truy cập hoặc dịch vụ đang gián đoạn.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => mutate()}>Thử lại</Button>
            <Button variant="outline" onClick={() => router.push("/lecturer/courses")}>
              Danh sách khóa học
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (isLoading || !lessonDetail) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-sm text-muted-foreground">
              Đang tải...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Render component tương ứng với lesson type
  if (lessonDetail.lesson_type === "quiz") {
    return <EditQuizLesson />;
  }

  if (lessonDetail.lesson_type === "code") {
    return <EditCodeLesson />;
  }

  // Mặc định render EditVideoLesson cho video và các loại khác
  return <EditVideoLesson />;
}
