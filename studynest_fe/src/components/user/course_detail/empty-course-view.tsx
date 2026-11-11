"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { Course } from "@/types/user/course_detail";
import { useRouter } from "next/navigation";
import {
  HiAcademicCap,
  HiBookOpen,
  HiCheckCircle,
  HiClock,
  HiHeart,
  HiPlay,
  HiStar,
} from "react-icons/hi";

interface EmptyCourseViewProps {
  course: Course;
  message?: string;
  isFavourite: boolean;
  isTogglingFavourite: boolean;
  onToggleFavourite: () => void;
}

export default function EmptyCourseView({
  course,
  message,
  isFavourite,
  isTogglingFavourite,
  onToggleFavourite,
}: EmptyCourseViewProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-secondary-light/50 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
        <div className="relative order-2 lg:order-1">
          {course.thumbnail_url && (
            <div className="relative rounded-[28px] overflow-hidden shadow-xl border-4 border-surface bg-surface">
              <img
                src={getImageUrl(course.thumbnail_url)}
                alt={course.title}
                className="w-full aspect-video object-cover"
              />
              <div className="absolute top-4 left-4">
                <div className="inline-flex items-center gap-2 bg-surface/92 backdrop-blur-md px-4 py-2 rounded-full shadow-xs border border-primary-pastel">
                  <HiClock className="h-4 w-4 text-primary" />
                  <span className="font-bold text-primary text-xs">
                    Đang hoàn thiện bài giảng
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 order-1 lg:order-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-2">
              Học viện Mây Mây
            </span>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight">
              {course.title}
            </h1>
            {course.description && (
              <div className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-3">
                <MarkdownRenderer content={course.description} isHtml={true} />
              </div>
            )}
          </div>

          <div className="bg-surface border border-primary-pastel rounded-[24px] p-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-light border border-primary-pastel rounded-2xl flex items-center justify-center shrink-0 text-primary">
                <HiAcademicCap className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-base mb-1">
                  Khóa học đang được cập nhật trên Mây Mây
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {message ||
                    "Giảng viên đang biên soạn và kiểm duyệt các bài học chất lượng cao cho lộ trình này."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: HiPlay, title: "Video bài giảng chuẩn HD" },
              { icon: HiCheckCircle, title: "Luyện tập tương tác" },
              { icon: HiBookOpen, title: "Tài liệu chuyên đề" },
              { icon: HiStar, title: "Trợ giảng Mây Mây AI" },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-surface border border-border rounded-2xl p-3.5 flex items-center gap-3"
              >
                <div className="w-9 h-9 bg-primary-light text-primary rounded-xl flex items-center justify-center shrink-0">
                  <feature.icon className="h-4 w-4" />
                </div>
                <p className="font-semibold text-foreground text-xs sm:text-sm">
                  {feature.title}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex-1 px-6 py-3.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <HiBookOpen className="h-5 w-5" />
              <span>Khám phá khóa học khác</span>
            </button>

            <button
              type="button"
              onClick={onToggleFavourite}
              disabled={isTogglingFavourite}
              className={`flex-1 px-6 py-3.5 font-semibold text-sm rounded-xl border transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                isFavourite
                  ? "bg-secondary-light border-secondary-pastel text-secondary-foreground"
                  : "bg-surface border-border text-foreground hover:border-primary-pastel"
              }`}
            >
              <HiHeart
                className={`h-5 w-5 ${isFavourite ? "fill-current" : ""}`}
              />
              <span>
                {isTogglingFavourite
                  ? "Đang lưu..."
                  : isFavourite
                  ? "Đã lưu yêu thích"
                  : "Lưu nhận thông báo"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
