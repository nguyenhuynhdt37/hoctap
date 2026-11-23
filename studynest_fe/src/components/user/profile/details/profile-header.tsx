"use client";

import { EquippedMarks, FramedAvatar } from "@/components/learning-hub/shop/item-art";
import { useLearnerEquipment } from "@/lib/learning-hub/shop-hooks";
import { formatDate } from "@/lib/utils/helpers/date";
import { UserProfile } from "@/types/user/profile";
import { Calendar, Mail } from "pulsoicon-react";

interface ProfileHeaderProps {
  profileData: UserProfile;
}

export default function ProfileHeader({ profileData }: ProfileHeaderProps) {
  const equipment = useLearnerEquipment(profileData.id) ?? profileData.equipment;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/40 p-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <FramedAvatar src={profileData.avatar} name={profileData.fullname} equipment={equipment} className="size-32 text-2xl" />

        {/* Basic Info */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {profileData.fullname}
            </h2>
            <EquippedMarks equipment={equipment} className="mt-1 justify-center md:justify-start" />
            {profileData.is_banned && (
              <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                Đã bị khóa
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>{profileData.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Tham gia: {formatDate(profileData.created_at)}</span>
            </div>
            {profileData.last_login_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
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
