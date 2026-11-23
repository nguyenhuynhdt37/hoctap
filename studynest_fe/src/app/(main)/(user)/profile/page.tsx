import { loadOwnProfile as OwnProfileLoader } from "@/lib/server/load-own-profile";

export const metadata = {
  title: "Hồ sơ | Mây Mây",
};

export default function ProfilePage() {
  return <OwnProfileLoader mode="learner" />;
}
