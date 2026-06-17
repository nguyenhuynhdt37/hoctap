"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { Instructor } from "@/types/user/course_detail";
import { HiStar } from "react-icons/hi";

interface InstructorSectionProps {
  instructor: Instructor;
}

export default function InstructorSection({
  instructor,
}: InstructorSectionProps) {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Giảng viên</h2>
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
          {instructor.avatar ? (
            <img
              src={getGoogleDriveImageUrl(instructor.avatar)}
              alt={instructor.fullname}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-white">
              {instructor.fullname.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {instructor.fullname}
          </h3>

          {instructor.instructor_description ? (
            <div className="mb-3 text-sm leading-relaxed">
              <MarkdownRenderer
                content={instructor.instructor_description}
                isHtml={false}
              />
            </div>
          ) : (
            <p className="text-gray-500 mb-3 text-sm italic">
              Chưa có mô tả giảng viên
            </p>
          )}

          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md">
              <span className="font-medium">
                {instructor.course_count || 0}
              </span>
              <span>khóa học</span>
            </div>
            <div className="flex items-center gap-1 bg-teal-100 text-teal-800 px-2 py-1 rounded-md">
              <span className="font-medium">
                {(instructor.student_count || 0).toLocaleString("en-US")}
              </span>
              <span>học viên</span>
            </div>
            {instructor.rating_avg ? (
              <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md">
                <HiStar className="h-3 w-3" />
                <span className="font-medium">
                  {instructor.rating_avg.toFixed(1)}
                </span>
                <span className="text-xs">
                  ({instructor.evaluated_count || 0} đánh giá)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                <HiStar className="h-3 w-3" />
                <span className="text-xs">Chưa có đánh giá</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
