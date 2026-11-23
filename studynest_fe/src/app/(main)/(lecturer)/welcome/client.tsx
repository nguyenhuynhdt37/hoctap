"use client";

import LecturerWelcome from "@/components/lecturer/welcome";
import { useCookieUserStatus } from "@/components/shared/user-loader";
import { Skeleton } from "@/components/ui";
import { useAuthBootstrapStatus } from "@/hooks/auth/useAuthedSWR";
import { isDpopMode } from "@/lib/auth/mode";
import { useUserStore } from "@/stores/user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LecturerWelcomeLoader() {
  const dpopStatus = useAuthBootstrapStatus((state) => state.status);
  const cookieStatus = useCookieUserStatus();
  const status = isDpopMode ? dpopStatus : cookieStatus;
  const isLecturer = useUserStore(
    ({ user }) => !user?.is_banned && user?.roles?.includes("LECTURER"),
  );
  const router = useRouter();

  useEffect(() => {
    if (status === "ready" && isLecturer) router.replace("/lecturer");
  }, [isLecturer, router, status]);

  if (status === "pending" || (status === "ready" && isLecturer)) {
    return (
      <div
        className="mx-auto min-h-[90vh] max-w-4xl space-y-8 px-4 py-20"
        role="status"
        aria-label="Đang tải trang giới thiệu giảng viên"
      >
        <Skeleton className="mx-auto h-7 w-56 max-w-full rounded-full" />
        <Skeleton className="mx-auto h-20 w-full max-w-xl" />
        <Skeleton className="mx-auto h-12 w-full max-w-md" />
        <div className="grid gap-6 pt-12 md:grid-cols-3">
          {[1, 2, 3].map((card) => <Skeleton key={card} className="h-40" />)}
        </div>
      </div>
    );
  }

  return <LecturerWelcome />;
}
