import ProfileEdit from "@/components/user/profile/edit";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { UserProfile } from "@/types/user/profile";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const stores = await cookies();
  const result = await fetcher("/auth/check_is_login", stores);

  if (!result.ok) {
    redirect("/login?redirect=/profile");
  }

  try {
    const profileResponse = await fetcher("/profile", stores);

    if (profileResponse.ok) {
      const profileData: UserProfile = await profileResponse.json();
      return <ProfileEdit profileData={profileData} />;
    } else {
      const errorData = await profileResponse.json().catch(() => ({}));
      return (
        <ProfileEdit
          profileData={null as any}
          error={{
            status: profileResponse.status,
            message: errorData.detail || errorData.message || "Có lỗi xảy ra",
          }}
        />
      );
    }
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return (
      <ProfileEdit
        profileData={null as any}
        error={{
          status: 500,
          message: "Không thể kết nối đến server. Vui lòng thử lại sau.",
        }}
      />
    );
  }
}
