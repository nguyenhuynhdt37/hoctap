"use client";

import LecturerHome from "@/components/lecturer/home";
import { Alert, Button } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import LecturerLoading from "./loading";

export default function LecturerHomeLoader() {
  const { data, error, isValidating, mutate } = useAuthedSWR<{ is_lecturer: boolean }>(
    "/lecturer/courses/is_lecturer",
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Alert variant="destructive">Không thể kiểm tra quyền giảng viên.</Alert>
        <Button variant="outline" className="mt-4" disabled={isValidating} onClick={() => void mutate()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (data === undefined) return <LecturerLoading />;

  return <LecturerHome isLecturer={data.is_lecturer} />;
}
