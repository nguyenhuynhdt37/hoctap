"use client";

import ProfileScreen from "@/components/user/profile/profile-screen";
import { UserProfile } from "@/types/user/profile";

export default function LecturerProfileScreen({
  profile,
}: {
  profile: UserProfile;
}) {
  return <ProfileScreen profile={profile} mode="lecturer" />;
}
