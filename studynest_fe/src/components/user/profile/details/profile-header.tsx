"use client";

import { formatDate } from "@/lib/utils/helpers/date";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { UserProfile } from "@/types/user/profile";
import { HiCalendar, HiMail, HiPhotograph } from "react-icons/hi";

interface ProfileHeaderProps {
  profileData: UserProfile;
}

export default function ProfileHeader({ profileData }: ProfileHeaderProps) {
  const avatarUrl = profileData.avatar
    ? getGoogleDriveImageUrl(profileData.avatar)
    : null;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/40 p-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={profileData.fullname}
              className="w-32 h-32 rounded-full object-cover border-4 border-green-200 shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = profileData.avatar || "";
              }}
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-green-200 flex items-center justify-center">
              <HiPhotograph className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {profileData.fullname}
            </h2>
            {profileData.is_banned && (
              <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                Đã bị khóa
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <HiMail className="w-4 h-4 text-emerald-600" />
              <span>{profileData.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <HiCalendar className="w-4 h-4 text-emerald-600" />
              <span>Tham gia: {formatDate(profileData.created_at)}</span>
            </div>
            {profileData.last_login_at && (
              <div className="flex items-center gap-2">
                <HiCalendar className="w-4 h-4 text-emerald-600" />
                <span>
                  Đăng nhập lần cuối: {formatDate(profileData.last_login_at)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
