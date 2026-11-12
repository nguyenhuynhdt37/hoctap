import ErrorState from "@/components/user/profile/edit/error-state";
import ProfileScreen from "@/components/user/profile/profile-screen";
import { loadOwnProfile } from "@/lib/server/load-own-profile";

export const metadata = {
  title: "Hồ sơ | Mây Mây",
};

export default async function ProfilePage() {
  const result = await loadOwnProfile("/profile");
  if ("error" in result) {
    return <ErrorState message={result.error} />;
  }
  return <ProfileScreen profile={result.profile} />;
}
