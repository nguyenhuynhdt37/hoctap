"use client";

import LecturerProfileScreen from "@/components/lecturer/profile/lecturer-profile-screen";
import { pageErrorMessage, ProfileLoadError, useProtectedPageSWR } from "@/components/shared/page-load-state";
import { Skeleton } from "@/components/ui";
import ProfileScreen from "@/components/user/profile/profile-screen";
import type { UserProfile } from "@/types/user/profile";

export default function OwnProfileLoader({ mode }: { mode: "learner" | "lecturer" }) {
  const { data, error, isValidating, mutate } = useProtectedPageSWR<UserProfile>("/profile");

  if (!data && error) {
    return (
      <ProfileLoadError
        message={pageErrorMessage(
          error,
          "Có lỗi xảy ra khi tải hồ sơ",
          "Không thể kết nối đến server. Vui lòng thử lại sau.",
        )}
        onRetry={() => void mutate()}
        retrying={isValidating}
      />
    );
  }

  if (!data) {
    return (
      <div role="status" aria-label="Đang tải hồ sơ" className="mx-auto grid min-h-[60vh] max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <Skeleton className="h-72 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return mode === "lecturer" ? <LecturerProfileScreen profile={data} /> : <ProfileScreen profile={data} />;
}
