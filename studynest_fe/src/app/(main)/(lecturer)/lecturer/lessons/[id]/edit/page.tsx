"use client";

import EditCodeLesson from "@/components/lecturer/lessons/edit/code";
import EditQuizLesson from "@/components/lecturer/lessons/edit/quizzes";
import EditVideoLesson from "@/components/lecturer/lessons/edit/video";
import LecturerHeader from "@/components/lecturer/shared/header";
import api from "@/lib/utils/fetcher/client/axios";
import { useParams } from "next/navigation";
import useSWR from "swr";

export default function EditLessonPage() {
  const params = useParams();
  const lessonId = params?.id as string;

  const { data: lessonDetail, isLoading } = useSWR(
    lessonId ? `/lecturer/lessons/${lessonId}/detail` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  if (isLoading || !lessonDetail) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LecturerHeader />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-sm text-gray-600">Đang tải...</span>
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
