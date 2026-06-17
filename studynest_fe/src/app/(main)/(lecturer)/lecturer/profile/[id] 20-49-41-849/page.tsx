import ProfileDetails from "@/components/user/profile/details";
import ErrorState from "@/components/user/profile/edit/error-state";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { UserProfile } from "@/types/user/profile";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePageById({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stores = await cookies();
  const result = await fetcher("/auth/check_is_login", stores);

  if (!result.ok) {
    redirect("/login?redirect=/profile");
  }

  try {
    const profileResponse = await fetcher(`/profile/${id}`, stores);

    if (profileResponse.ok) {
      const profileData: UserProfile = await profileResponse.json();
      return <ProfileDetails profileData={profileData} />;
    } else {
      const errorData = await profileResponse.json().catch(() => ({}));
      return (
        <ErrorState
          message={
            errorData.detail || errorData.message || "Không tìm thấy hồ sơ"
          }
        />
      );
    }
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return (
      <ErrorState message="Không thể kết nối đến server. Vui lòng thử lại sau." />
    );
  }
}
