"use client";

import { PageDataScope, pageErrorMessage, useProtectedPageSWR } from "@/components/shared/page-load-state";
import { Button, Skeleton } from "@/components/ui";
import LearningDetail from "@/components/user/learning_detail";
import type { LearningCourseData } from "@/types/user/learning";
import { HiBookOpen } from "react-icons/hi";

export default function LearningLoader({ slug, openTutor, lessonId, sectionId, preferQuiz }: {
  slug: string;
  openTutor?: boolean;
  lessonId?: string;
  sectionId?: string;
  preferQuiz?: boolean;
}) {
  const { data, error, isValidating, mutate } = useProtectedPageSWR<LearningCourseData>(`/learning/${encodeURIComponent(slug)}`);

  if (!data && error) {
    const message = pageErrorMessage(
      error,
      "Vui lòng kiểm tra lại đường dẫn khóa học.",
      "Không thể kết nối đến server. Vui lòng thử lại sau.",
    );
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-primary-pastel/30 px-4">
        <div className="text-center" role="alert">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-destructive-bg text-destructive-foreground">
            <HiBookOpen aria-hidden="true" className="size-10" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-foreground">Không thể tải nội dung khóa học</h1>
          <p className="mb-4 text-muted-foreground">{message}</p>
          <Button type="button" disabled={isValidating} onClick={() => void mutate()}>Thử lại</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div role="status" aria-label="Đang tải nội dung khóa học" className="min-h-screen space-y-4 bg-background p-4">
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Skeleton className="hidden h-[65vh] lg:block" />
          <div className="space-y-4">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageDataScope>
      <LearningDetail courseData={data} openTutor={openTutor} lessonId={lessonId} sectionId={sectionId} preferQuiz={preferQuiz} />
    </PageDataScope>
  );
}
