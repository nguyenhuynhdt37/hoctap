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
    <section
      id="reviews"
      className="bg-surface rounded-[24px] p-6 sm:p-8 border border-border shadow-xs"
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">
        Cảm nhận thực tế
      </span>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5">
        Đánh giá từ học viên Mây Mây
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map((rv) => (
          <div
            key={rv.id}
            className="border border-border bg-background/60 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-light border border-primary-pastel flex items-center justify-center text-xs font-bold text-primary">
                  {rv.user_fullname?.charAt(0) || "H"}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {rv.user_fullname}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(rv.created_at).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-vanilla border border-accent-vanilla-border text-warning-foreground text-xs font-bold">
                <HiStar className="h-3.5 w-3.5" />
                <span>{rv.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <MarkdownRenderer content={rv.content} isHtml={true} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
