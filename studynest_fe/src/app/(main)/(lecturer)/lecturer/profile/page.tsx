import LecturerProfileScreen from "@/components/lecturer/profile/lecturer-profile-screen";
import ErrorState from "@/components/user/profile/edit/error-state";
import { loadOwnProfile } from "@/lib/server/load-own-profile";

export const metadata = {
  title: "Hồ sơ giảng viên | Mây Mây",
};

export default async function LecturerProfilePage() {
  const result = await loadOwnProfile("/lecturer/profile");
  if ("error" in result) {
    return <ErrorState message={result.error} />;
  }
  return <LecturerProfileScreen profile={result.profile} />;
}
