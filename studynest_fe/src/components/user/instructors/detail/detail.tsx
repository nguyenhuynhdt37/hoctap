"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { InstructorDetailData } from "@/types/user/instructor";
import useSWR from "swr";
import { HiStar, HiUsers, HiBookOpen, HiExternalLink } from "react-icons/hi";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

interface InstructorDetailProps {
  instructorId: string;
}

const InstructorDetail = ({ instructorId }: InstructorDetailProps) => {
  const { data, isLoading, error } = useSWR<InstructorDetailData>(
    `/users/instructors/${instructorId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-green-100 rounded-full animate-pulse" />
          <div className="space-y-3 flex-1">
            <div className="h-6 bg-green-100 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-green-100 rounded w-1/2 animate-pulse" />
          </div>
        </div>
        <div className="h-48 bg-green-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy thông tin giảng viên</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div className="relative">
          <img
            src={getGoogleDriveImageUrl(data.avatar || "")}
            alt={data.name}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-green-100"
            onError={(e) => {
              (
                e.target as HTMLImageElement
              ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                data.name
              )}&background=00bba7&color=fff&size=128`;
            }}
          />
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.name}</h1>

          <div className="flex flex-wrap items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <HiStar className="w-5 h-5 text-yellow-500" />
              <span className="text-lg font-semibold text-gray-700">
                {data.rating_avg.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">
                ({data.evaluated_count} đánh giá)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <HiUsers className="w-5 h-5 text-green-500" />
              <span className="text-gray-700">
                {data.student_count.toLocaleString()} học viên
              </span>
            </div>

            <div className="flex items-center gap-2">
              <HiBookOpen className="w-5 h-5 text-emerald-500" />
              <span className="text-gray-700">
                {data.course_count} khóa học
              </span>
            </div>
          </div>

          {data.facebook_url && (
            <a
              href={data.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <HiExternalLink className="w-4 h-4" />
              Facebook
            </a>
          )}
        </div>
      </div>

      {data.instructor_description && (
        <div className="bg-white rounded-xl p-6 border border-green-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Giới thiệu</h2>
          <div className="prose prose-green max-w-none">
            <MarkdownRenderer
              content={data.instructor_description}
              isHtml={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorDetail;
