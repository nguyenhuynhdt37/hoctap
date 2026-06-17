"use client";

import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { CategoryItem, Course } from "@/types/user/course_detail";
import { useMemo } from "react";
import { HiClock, HiGlobe, HiPlay, HiStar } from "react-icons/hi";

// Fire Effect Component
const FireEffect = ({ active = false }: { active?: boolean }) => {
  const flameData = useMemo(() => {
    const data = [
      {
        width: 25,
        height: 50,
        duration: 0.6,
        clipPath:
          "polygon(25% 0%, 45% 0%, 65% 0%, 85% 0%, 100% 100%, 80% 100%, 60% 100%, 40% 100%, 20% 100%, 0% 100%)",
      },
      {
        width: 20,
        height: 45,
        duration: 0.7,
        clipPath:
          "polygon(30% 0%, 50% 0%, 70% 0%, 90% 0%, 100% 100%, 85% 100%, 65% 100%, 45% 100%, 25% 100%, 0% 100%)",
      },
      {
        width: 30,
        height: 60,
        duration: 0.5,
        clipPath:
          "polygon(20% 0%, 40% 0%, 60% 0%, 80% 0%, 100% 100%, 75% 100%, 55% 100%, 35% 100%, 15% 100%, 0% 100%)",
      },
      {
        width: 22,
        height: 55,
        duration: 0.8,
        clipPath:
          "polygon(28% 0%, 48% 0%, 68% 0%, 88% 0%, 100% 100%, 82% 100%, 62% 100%, 42% 100%, 22% 100%, 0% 100%)",
      },
      {
        width: 28,
        height: 50,
        duration: 0.6,
        clipPath:
          "polygon(22% 0%, 42% 0%, 62% 0%, 82% 0%, 100% 100%, 78% 100%, 58% 100%, 38% 100%, 18% 100%, 0% 100%)",
      },
      {
        width: 24,
        height: 65,
        duration: 0.7,
        clipPath:
          "polygon(35% 0%, 55% 0%, 75% 0%, 95% 0%, 100% 100%, 90% 100%, 70% 100%, 50% 100%, 30% 100%, 0% 100%)",
      },
      {
        width: 26,
        height: 48,
        duration: 0.5,
        clipPath:
          "polygon(26% 0%, 46% 0%, 66% 0%, 86% 0%, 100% 100%, 83% 100%, 63% 100%, 43% 100%, 23% 100%, 0% 100%)",
      },
      {
        width: 29,
        height: 58,
        duration: 0.9,
        clipPath:
          "polygon(32% 0%, 52% 0%, 72% 0%, 92% 0%, 100% 100%, 87% 100%, 67% 100%, 47% 100%, 27% 100%, 0% 100%)",
      },
      {
        width: 23,
        height: 52,
        duration: 0.6,
        clipPath:
          "polygon(24% 0%, 44% 0%, 64% 0%, 84% 0%, 100% 100%, 81% 100%, 61% 100%, 41% 100%, 21% 100%, 0% 100%)",
      },
      {
        width: 27,
        height: 47,
        duration: 0.7,
        clipPath:
          "polygon(29% 0%, 49% 0%, 69% 0%, 89% 0%, 100% 100%, 86% 100%, 66% 100%, 46% 100%, 26% 100%, 0% 100%)",
      },
      {
        width: 25,
        height: 62,
        duration: 0.5,
        clipPath:
          "polygon(27% 0%, 47% 0%, 67% 0%, 87% 0%, 100% 100%, 84% 100%, 64% 100%, 44% 100%, 24% 100%, 0% 100%)",
      },
      {
        width: 21,
        height: 49,
        duration: 0.8,
        clipPath:
          "polygon(31% 0%, 51% 0%, 71% 0%, 91% 0%, 100% 100%, 88% 100%, 68% 100%, 48% 100%, 28% 100%, 0% 100%)",
      },
      {
        width: 30,
        height: 56,
        duration: 0.6,
        clipPath:
          "polygon(23% 0%, 43% 0%, 63% 0%, 83% 0%, 100% 100%, 79% 100%, 59% 100%, 39% 100%, 19% 100%, 0% 100%)",
      },
      {
        width: 24,
        height: 54,
        duration: 0.7,
        clipPath:
          "polygon(33% 0%, 53% 0%, 73% 0%, 93% 0%, 100% 100%, 89% 100%, 69% 100%, 49% 100%, 29% 100%, 0% 100%)",
      },
      {
        width: 26,
        height: 51,
        duration: 0.5,
        clipPath:
          "polygon(28% 0%, 48% 0%, 68% 0%, 88% 0%, 100% 100%, 85% 100%, 65% 100%, 45% 100%, 25% 100%, 0% 100%)",
      },
    ];
    return data;
  }, []);

  if (!active) return null;

  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg z-0">
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-red-600 via-orange-500 to-transparent opacity-60 animate-fire-flicker" />
        {flameData.map((flame, i) => (
          <div
            key={i}
            className="absolute bottom-0"
            style={{
              left: `${(i * 6.67) % 100}%`,
              width: `${flame.width}px`,
              height: `${flame.height}px`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: `${flame.duration}s`,
            }}
          >
            <div
              className="w-full h-full bg-gradient-to-t from-red-600 via-orange-500 to-yellow-400 rounded-t-full animate-fire-flame"
              style={{ clipPath: flame.clipPath }}
            />
          </div>
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute bottom-0 w-1 h-1 bg-yellow-400 rounded-full animate-fire-particle opacity-80"
            style={{
              left: `${10 + i * 12}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${1 + (i % 3) * 0.2}s`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 via-orange-400/10 to-transparent animate-fire-glow" />
      </div>
      <style jsx>{`
        @keyframes fire-flicker {
          0%,
          100% {
            opacity: 0.6;
            transform: scaleY(1);
          }
          25% {
            opacity: 0.8;
            transform: scaleY(1.1);
          }
          50% {
            opacity: 0.7;
            transform: scaleY(0.95);
          }
          75% {
            opacity: 0.9;
            transform: scaleY(1.05);
          }
        }
        @keyframes fire-flame {
          0%,
          100% {
            transform: translateX(0) translateY(0) scaleY(1);
            opacity: 0.8;
          }
          25% {
            transform: translateX(-2px) translateY(-3px) scaleY(1.1);
            opacity: 1;
          }
          50% {
            transform: translateX(2px) translateY(-5px) scaleY(0.9);
            opacity: 0.9;
          }
          75% {
            transform: translateX(-1px) translateY(-2px) scaleY(1.05);
            opacity: 1;
          }
        }
        @keyframes fire-particle {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-30px) translateX(5px) scale(1.5);
            opacity: 1;
          }
          100% {
            transform: translateY(-60px) translateX(-5px) scale(0.5);
            opacity: 0;
          }
        }
        @keyframes fire-glow {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-fire-flicker {
          animation: fire-flicker 0.3s ease-in-out infinite;
        }
        .animate-fire-flame {
          animation: fire-flame 0.4s ease-in-out infinite;
        }
        .animate-fire-particle {
          animation: fire-particle 1.2s ease-out infinite;
        }
        .animate-fire-glow {
          animation: fire-glow 0.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

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
    <div className="bg-gradient-to-br from-teal-700 via-emerald-700 to-teal-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex items-center space-x-2 text-sm text-gray-300 mb-6">
          <a href="/" className="hover:text-white transition-colors">
            Trang chủ
          </a>
          {categoryChain.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <span className="text-gray-500">/</span>
              <a
                href={`/category/${category.slug}`}
                className="hover:text-white transition-colors"
              >
                {category.name}
              </a>
            </div>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
              {course.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-teal-500 text-white">
                Bán chạy nhất
              </span>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg text-white">
                  {course.rating.toFixed(1)}
                </span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <HiStar
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(course.rating)
                          ? "text-yellow-400"
                          : i < course.rating
                          ? "text-yellow-400 opacity-50"
                          : "text-gray-400"
                      }`}
                    />
                  ))}
                </div>
                <a
                  href="#reviews"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  ({course.rating_count.toLocaleString("en-US")} đánh giá)
                </a>
              </div>

              <span className="text-gray-300">
                {course.total_enrolls.toLocaleString("en-US")} học viên
              </span>
            </div>

            <div className="text-gray-300 mb-4">
              <span>Được tạo bởi </span>
              <a
                href="#"
                className="text-teal-400 hover:text-teal-300 transition-colors"
              >
                {course.instructor.fullname}
              </a>
            </div>

            <div className="flex items-center gap-6 text-gray-300 text-sm">
              <div className="flex items-center gap-2">
                <HiClock className="h-4 w-4" />
                <span>
                  Lần cập nhật gần đây nhất {formatDate(course.last_updated)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <HiGlobe className="h-4 w-4" />
                <span>{(course.language || "Vietnamese").toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Preview Video - Ngắn gọn, không tiêu đề */}
          {onPreview && (
            <div
              className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
                isFireActive
                  ? "bg-gradient-to-b from-red-50 via-orange-50 to-red-100 border-2 border-red-300"
                  : "bg-white"
              }`}
            >
              <FireEffect active={isFireActive} />
              <div className="relative h-48 bg-gray-900">
                <img
                  src={getGoogleDriveImageUrl(course.thumbnail_url)}
                  alt={course.title}
                  className="w-full h-full object-cover relative z-10"
                />
                <div className="absolute inset-0 bg-black/30 z-10" />
                <div className="absolute inset-0 flex items-center justify-center z-1">
                  <button
                    onClick={() => onPreview(course.id)}
                    className="bg-white/90 rounded-full p-3 hover:bg-white transition shadow-lg"
                    aria-label="Xem trước khóa học"
                  >
                    <HiPlay className="h-6 w-6 text-gray-900" />
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
