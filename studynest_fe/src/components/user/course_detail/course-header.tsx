"use client";

import { getImageUrl } from "@/lib/utils/helpers/image";
import { CategoryItem, Course } from "@/types/user/course_detail";
import { HiClock, HiGlobe, HiPlay, HiStar } from "react-icons/hi";

interface CourseHeaderProps {
  course: Course;
  categoryChain: CategoryItem[];
  formatDate: (dateString: string) => string;
  onPreview?: (courseId: string, lessonId?: string) => void;
  isFireActive?: boolean;
}

export default function CourseHeader({
  course,
  categoryChain,
  formatDate,
  onPreview,
  isFireActive = false,
}: CourseHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-[#E8F2FA] via-[#F6FAFF] to-[#FCE8EF]/50 border-b border-[#E7EEF7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#6F7C8C] mb-6"
        >
          <a
            href="/"
            className="hover:text-[#356FA7] font-medium transition-colors"
          >
            Trang chủ
          </a>
          {categoryChain.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <span className="text-[#8190A3]">/</span>
              <a
                href={`/categories/${category.slug}`}
                className="hover:text-[#356FA7] font-medium transition-colors"
              >
                {category.name}
              </a>
            </div>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#3D4A5A] mb-4 leading-tight tracking-tight">
              {course.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3.5 mb-5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#FCE8EF] text-[#8A3B58] border border-[#F7C9D9]">
                Bán chạy nhất
              </span>

              <div className="flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full border border-[#E7EEF7]">
                <span className="font-bold text-sm text-[#3D4A5A]">
                  {course.rating.toFixed(1)}
                </span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <HiStar
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(course.rating)
                          ? "text-[#D99B26]"
                          : i < course.rating
                          ? "text-[#D99B26] opacity-50"
                          : "text-[#D3DFEE]"
                      }`}
                    />
                  ))}
                </div>
                <a
                  href="#reviews"
                  className="text-xs text-[#6F7C8C] hover:text-[#356FA7] transition-colors ml-0.5"
                >
                  ({course.rating_count.toLocaleString("en-US")} đánh giá)
                </a>
              </div>

              <span className="text-sm text-[#6F7C8C] font-medium">
                {course.total_enrolls.toLocaleString("en-US")} học viên
              </span>
            </div>

            <div className="text-sm text-[#6F7C8C] mb-4">
              <span>Được tạo bởi </span>
              <a
                href={`/instructors/${course.instructor.id}`}
                className="font-semibold text-[#356FA7] hover:text-[#285C90] transition-colors"
              >
                {course.instructor.fullname}
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-[#6F7C8C] text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <HiClock className="h-4 w-4 text-[#356FA7]" />
                <span>
                  Lần cập nhật gần đây nhất {formatDate(course.last_updated)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <HiGlobe className="h-4 w-4 text-[#356FA7]" />
                <span>{(course.language || "Vietnamese").toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Preview Video */}
          {onPreview && (
            <div
              className={`relative rounded-[20px] overflow-hidden transition-all duration-200 border shadow-sm ${
                isFireActive
                  ? "bg-[#FFF9F6] border-[#F7C9D9]"
                  : "bg-white border-[#E7EEF7]"
              }`}
            >
              <div className="relative h-52 bg-[#E8F2FA]">
                <img
                  src={getImageUrl(course.thumbnail_url)}
                  alt={course.title}
                  className="w-full h-full object-cover relative z-10"
                />
                <div className="absolute inset-0 bg-[#3D4A5A]/25 z-10" />
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <button
                    onClick={() => onPreview(course.id)}
                    className="bg-white/95 text-[#356FA7] rounded-full p-3.5 hover:bg-[#356FA7] hover:text-white transition-all duration-200 shadow-md cursor-pointer"
                    aria-label="Xem trước khóa học"
                  >
                    <HiPlay className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
