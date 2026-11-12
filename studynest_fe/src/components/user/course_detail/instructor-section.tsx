"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { Badge } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { Instructor } from "@/types/user/course_detail";
import Link from "next/link";
import { HiBookOpen, HiStar, HiUserGroup } from "react-icons/hi";

interface InstructorSectionProps {
  instructor: Instructor;
}

export default function InstructorSection({
  instructor,
}: InstructorSectionProps) {
  if (!instructor) return null;

  return (
    <section className="bg-surface rounded-[24px] p-6 sm:p-8 border border-border shadow-xs">
      <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">
        Người đồng hành
      </span>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5">
        Giảng viên phụ trách
      </h2>

      <div className="flex flex-col sm:flex-row items-start gap-5 min-w-0">
        <Link
          href={`/instructors/${instructor.id}`}
          className="w-20 h-20 rounded-full bg-primary-light border-2 border-primary-pastel flex items-center justify-center shrink-0 overflow-hidden shadow-xs"
        >
          {instructor.avatar ? (
            <img
              src={getImageUrl(instructor.avatar)}
              alt={instructor.fullname}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-primary">
              {instructor.fullname?.charAt(0) || "M"}
            </span>
          )}
        </Link>

        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <Link
              href={`/instructors/${instructor.id}`}
              className="font-bold text-foreground hover:text-primary transition-colors text-lg"
            >
              {instructor.fullname}
            </Link>
            <p className="text-xs text-muted-foreground">
              Giảng viên trên nền tảng Mây Mây
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant="default" size="md">
              <HiBookOpen className="w-3.5 h-3.5 mr-1 inline" />
              {instructor.course_count || 0} khóa học
            </Badge>
            <Badge variant="secondary" size="md">
              <HiUserGroup className="w-3.5 h-3.5 mr-1 inline" />
              {(instructor.student_count || 0).toLocaleString("vi-VN")} học viên
            </Badge>
            {instructor.rating_avg ? (
              <Badge variant="vanilla" size="md">
                <HiStar className="h-3.5 w-3.5 mr-1 inline" />
                {instructor.rating_avg.toFixed(1)} (
                {instructor.evaluated_count || 0} đánh giá)
              </Badge>
            ) : null}
          </div>

          {instructor.instructor_description ? (
            <div className="text-sm text-muted-foreground leading-relaxed pt-1">
              <MarkdownRenderer
                content={instructor.instructor_description}
                isHtml={false}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Giảng viên giàu kinh nghiệm giảng dạy chương trình phổ thông, tận tâm đồng hành cùng học sinh trên Mây Mây.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
