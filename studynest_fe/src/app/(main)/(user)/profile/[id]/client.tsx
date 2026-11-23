"use client";

import { pageErrorMessage, ProfileLoadError, useProtectedPageSWR } from "@/components/shared/page-load-state";
import { Skeleton } from "@/components/ui";
import ProfileDetails from "@/components/user/profile/details";
import type { UserProfile } from "@/types/user/profile";

export default function ProfileLoader({ id }: { id: string }) {
  const { data, error, isValidating, mutate } = useProtectedPageSWR<UserProfile>(`/profile/${encodeURIComponent(id)}`);

  if (!data && error) {
    return (
      <ProfileLoadError
        message={pageErrorMessage(error, "Không tìm thấy hồ sơ", "Không thể kết nối đến server. Vui lòng thử lại sau.")}
        onRetry={() => void mutate()}
        retrying={isValidating}
      />
    );
  }

  if (!data) {
    return (
      <div role="status" aria-label="Đang tải hồ sơ" className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return <ProfileDetails profileData={data} />;
}
