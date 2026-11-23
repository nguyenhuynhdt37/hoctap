import { loadOwnProfile as OwnProfileLoader } from "@/lib/server/load-own-profile";

export const metadata = {
  title: "Hồ sơ giảng viên | Mây Mây",
};

export default function LecturerProfilePage() {
  return <OwnProfileLoader mode="lecturer" />;
}
