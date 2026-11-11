"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { InstructorResponse } from "@/types/user/instructor";
import { LearningCourseData } from "@/types/user/learning";

interface OverviewTabProps {
  title: string;
  course?: LearningCourseData | null;
  instructor?: InstructorResponse;
}

export default function OverviewTab({
  title,
  course,
  instructor,
}: OverviewTabProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4 lg:mb-6">
          {title}
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
          <div className="p-3 rounded-xl bg-surface border border-border">
            <div className="text-[11px] text-muted-foreground mb-1">Cấp độ</div>
            <div className="text-xl lg:text-2xl font-extrabold text-foreground tracking-tight uppercase">
              {course?.level || "-"}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-border">
            <div className="text-[11px] text-muted-foreground mb-1">Ngôn ngữ</div>
            <div className="text-xl lg:text-2xl font-extrabold text-foreground tracking-tight uppercase">
              {course?.language || "-"}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary-pastel/50 to-secondary-pastel/40 border border-primary-light/40">
            <div className="text-[11px] text-muted-foreground mb-1">Lượt xem</div>
            <div className="text-2xl lg:text-3xl font-black text-primary tabular-nums">
              {(course?.views ?? 0).toLocaleString("en-US")}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100">
            <div className="text-[11px] text-muted-foreground mb-1">Đánh giá</div>
            <div className="text-2xl lg:text-3xl font-black text-amber-700 tabular-nums">
              {(course?.rating_avg ?? 0).toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {(course?.rating_count ?? 0).toLocaleString("en-US")} lượt
            </div>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-border">
            <div className="text-[11px] text-muted-foreground mb-1">Cập nhật</div>
            <div className="text-base lg:text-lg font-bold text-foreground">
              {course?.updated_at
                ? new Date(course.updated_at).toLocaleDateString()
                : "-"}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-2">
          <h3 className="text-xl font-bold text-foreground mb-3">
            Mô tả khóa học
          </h3>
          <MarkdownRenderer
            content={course?.description || ""}
            isHtml={false}
            className="prose prose-sm max-w-none text-foreground/90 text-justify break-words"
          />

          {course?.outcomes?.length ? (
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-foreground mb-3">
                Bạn sẽ học được
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                {course.outcomes.map((o, idx) => (
                  <li key={idx}>{o}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {course?.requirements?.length ? (
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-foreground mb-3">
                Yêu cầu
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                {course.requirements.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {course?.target_audience?.length ? (
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-foreground mb-3">
                Phù hợp với
              </h4>
              <div className="flex flex-wrap gap-2">
                {course.target_audience.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs bg-primary-pastel/60 text-primary border border-primary-light/50 font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {instructor && (
        <div className="mt-12">
          <div className="flex-1 pb-5 items-center gap-4">
            <div className="p-5 lg:p-6 rounded-2xl border border-border bg-gradient-to-br from-surface to-primary-pastel/30">
              <div className="text-sm text-muted-foreground mb-3">Giảng viên</div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-pastel flex items-center justify-center text-primary font-bold select-none">
                  {(instructor.id || "GV").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm lg:text-base font-semibold text-foreground truncate">
                    {instructor.fullname}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {(instructor.course_count ?? 0).toLocaleString("en-US")}{" "}
                    khóa •{" "}
                    {(instructor.student_count ?? 0).toLocaleString("en-US")}{" "}
                    học viên
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <div className="text-base lg:text-lg font-bold text-foreground tabular-nums tracking-tight">
                    {Number(instructor.rating_avg ?? 0).toLocaleString(
                      "en-US"
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Đánh giá</div>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <div className="text-base lg:text-lg font-bold text-foreground tabular-nums tracking-tight">
                    {(instructor.evaluated_count ?? 0).toLocaleString("en-US")}
                  </div>
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                    Lượt đánh giá
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <div className="text-base lg:text-lg font-bold text-foreground tabular-nums tracking-tight">
                    {(instructor.student_count ?? 0).toLocaleString("en-US")}
                  </div>
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                    Học viên
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {instructor.facebook_url && (
                  <a
                    href={instructor.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium text-white bg-primary hover:bg-primary-hover transition-colors"
                  >
                    Trang giảng viên
                  </a>
                )}
                <button className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium border border-primary-light/60 text-primary hover:bg-primary-pastel/50 transition-colors cursor-pointer">
                  Theo dõi
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="p-5 lg:p-6 rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="text-base font-semibold text-foreground mb-3">
                Giới thiệu giảng viên
              </div>
              <MarkdownRenderer
                content={instructor.instructor_description || ""}
                isHtml={false}
                className="prose prose-sm max-w-none text-foreground/90 text-justify break-words"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

