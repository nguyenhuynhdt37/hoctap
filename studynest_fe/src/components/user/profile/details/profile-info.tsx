"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { UserProfile } from "@/types/user/profile";
import {
  HiCalendar,
  HiIdentification,
  HiLink,
  HiLocationMarker,
} from "react-icons/hi";

interface ProfileInfoProps {
  profileData: UserProfile;
}

export default function ProfileInfo({ profileData }: ProfileInfoProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/40 p-8 space-y-6">
      <h3 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3">
        Thông tin cá nhân
      </h3>

      {/* Bio */}
      {profileData.bio && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Giới thiệu bản thân
          </h4>
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={profileData.bio} />
          </div>
        </div>
      )}

      {/* Additional Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Facebook URL */}
        {profileData.facebook_url && (
          <div className="flex items-start gap-3">
            <HiLink className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Facebook</p>
              <a
                href={profileData.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline break-all"
              >
                {profileData.facebook_url}
              </a>
            </div>
          </div>
        )}

        {/* Birthday */}
        {profileData.birthday && (
          <div className="flex items-start gap-3">
            <HiCalendar className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Ngày sinh</p>
              <p className="text-sm text-gray-600">
                {new Date(profileData.birthday).toLocaleDateString("vi-VN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        )}

        {/* Location */}
        {(profileData.conscious || profileData.district) && (
          <div className="flex items-start gap-3">
            <HiLocationMarker className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Địa chỉ</p>
              <p className="text-sm text-gray-600">
                {[profileData.conscious, profileData.district]
                  .filter(Boolean)
                  .join(", ") || "Chưa cập nhật"}
              </p>
            </div>
          </div>
        )}

        {/* Citizenship Identity */}
        {profileData.citizenship_identity && (
          <div className="flex items-start gap-3">
            <HiIdentification className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700">
                Số CMND/CCCD
              </p>
              <p className="text-sm text-gray-600">
                {profileData.citizenship_identity}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
