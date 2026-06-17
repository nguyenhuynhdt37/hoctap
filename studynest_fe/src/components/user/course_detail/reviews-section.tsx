"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { SampleReview } from "@/types/user/course_detail";
import { HiStar } from "react-icons/hi";

interface ReviewsSectionProps {
  reviews: SampleReview[];
}

export default function ReviewsSection({ reviews }: ReviewsSectionProps) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Đánh giá mẫu
      </h2>
      <div className="space-y-4">
        {reviews.map((rv) => (
          <div key={rv.id} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                  {rv.user_fullname.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {rv.user_fullname}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(rv.created_at).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-yellow-500 text-sm">
                <HiStar className="h-4 w-4" />
                <span className="font-medium">{rv.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="text-sm leading-relaxed">
              <MarkdownRenderer content={rv.content} isHtml={true} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

