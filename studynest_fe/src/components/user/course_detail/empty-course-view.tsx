"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
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
    <div className="fixed inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] bg-teal-300/20 rounded-full blur-3xl"
          style={{ top: "-10%", left: "-5%" }}
        />
        <div
          className="absolute w-[500px] h-[500px] bg-emerald-300/20 rounded-full blur-3xl"
          style={{ top: "40%", right: "-10%", animationDelay: "2s" }}
        />
        <div
          className="absolute w-[400px] h-[400px] bg-teal-300/20 rounded-full blur-3xl"
          style={{ bottom: "-5%", left: "30%", animationDelay: "4s" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#14b8a620_1px,transparent_1px),linear-gradient(to_bottom,#14b8a620_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_110%)]" />
      </div>

      <div className="relative h-full flex items-center justify-center p-6">
        <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative order-2 lg:order-1">
            {course.thumbnail_url && (
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-teal-400 to-emerald-500 rounded-3xl opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-500" />
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white/80 backdrop-blur">
                  <img
                    src={getGoogleDriveImageUrl(course.thumbnail_url)}
                    alt={course.title}
                    className="w-full aspect-square object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-teal-900/40 via-transparent to-transparent opacity-60" />
                  <div className="absolute top-6 left-6 right-6">
                    <div className="inline-flex items-center gap-3 bg-white/95 backdrop-blur-sm px-5 py-3 rounded-full shadow-lg border-2 border-teal-200">
                      <HiClock className="h-5 w-5 text-teal-600" />
                      <span className="font-bold text-teal-800 text-sm">
                        Đang Phát Triển
                      </span>
                    </div>
                  </div>
                  {course.instructor && (
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg border border-teal-200">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-md">
                          {course.instructor.avatar ? (
                            <img
                              src={getGoogleDriveImageUrl(
                                course.instructor.avatar
                              )}
                              alt={course.instructor.fullname}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-base font-bold text-white">
                              {course.instructor.fullname.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-teal-600 font-semibold">
                            Giảng viên
                          </p>
                          <p className="font-bold text-gray-900 truncate">
                            {course.instructor.fullname}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 order-1 lg:order-2">
            <div>
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 mb-4 leading-[1.1] tracking-tight">
                {course.title}
              </h1>
              {course.description && (
                <div className="text-xl text-gray-600 leading-relaxed line-clamp-2">
                  <MarkdownRenderer
                    content={course.description}
                    isHtml={true}
                  />
                </div>
              )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm border-2 border-teal-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <HiAcademicCap className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">
                    Khóa học đang được xây dựng
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {message ||
                      "Khóa học này chưa có bài học nào. Giảng viên đang chuẩn bị nội dung chất lượng cao cho bạn!"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: HiPlay, title: "Video HD" },
                { icon: HiCheckCircle, title: "Bài tập thực hành" },
                { icon: HiBookOpen, title: "Tài liệu đầy đủ" },
                { icon: HiStar, title: "Hỗ trợ 24/7" },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="group bg-white/80 backdrop-blur-sm border-2 border-teal-100 rounded-xl p-4 hover:border-teal-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">
                      {feature.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => router.push("/")}
                className="group flex-1 relative px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-teal-500/50 hover:shadow-2xl hover:shadow-teal-500/60 hover:scale-[1.02] transition-all duration-300 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-teal-600 to-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center gap-3">
                  <HiBookOpen className="h-6 w-6" />
                  Khám phá khóa học khác
                </span>
              </button>

              <button
                onClick={onToggleFavourite}
                disabled={isTogglingFavourite}
                className={`group flex-1 px-8 py-4 font-bold text-lg rounded-xl border-2 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
                  isFavourite
                    ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                    : "bg-white/80 backdrop-blur-sm border-teal-300 text-gray-700 hover:border-teal-500"
                }`}
              >
                <span className="flex items-center justify-center gap-3">
                  <HiHeart
                    className={`h-6 w-6 ${
                      isFavourite ? "fill-current text-red-600" : ""
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {isTogglingFavourite
                      ? "Đang xử lý..."
                      : isFavourite
                      ? "Đã yêu thích"
                      : "Yêu thích"}
                  </span>
                </span>
              </button>
            </div>

            <p className="text-gray-500 text-sm text-center sm:text-left">
              💡 Nhấn <strong className="text-gray-700">Yêu thích</strong> để
              nhận thông báo khi có bài học mới
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
