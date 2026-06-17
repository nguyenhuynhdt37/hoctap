"use client";

import { useUserStore } from "@/stores/user";
import { UserProfile } from "@/types/user/profile";
import { useRouter } from "next/navigation";
import { HiPencil } from "react-icons/hi";
import ProfileCourses from "./profile-courses";
import ProfileHeader from "./profile-header";
import ProfileInfo from "./profile-info";

interface ProfileDetailsProps {
  profileData: UserProfile;
}

export default function ProfileDetails({ profileData }: ProfileDetailsProps) {
  const router = useRouter();
  const currentUser = useUserStore((s) => s.user);
  const isOwnProfile =
    currentUser?.id !== undefined &&
    String(currentUser.id) === String(profileData.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50 py-8 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header with Edit Button */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Hồ sơ</h1>
          {isOwnProfile && (
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/20"
            >
              <HiPencil className="h-5 w-5" />
              Chỉnh sửa hồ sơ
            </button>
          )}
        </div>

        {/* Profile Header */}
        <ProfileHeader profileData={profileData} />

        {/* Profile Info */}
        <ProfileInfo profileData={profileData} />

        {/* Courses Section */}
        <ProfileCourses userId={profileData.id} isOwnProfile={isOwnProfile} />
      </div>
    </div>
  );
}
