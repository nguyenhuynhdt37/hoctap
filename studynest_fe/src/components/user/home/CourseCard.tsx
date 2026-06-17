"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { CourseCardProps } from "@/types/user/course";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const CourseCard = ({
  course,
  section,
  showPreview = true,
}: CourseCardProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewCache, setPreviewCache] = useState<Record<string, any>>({});
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [previewPos, setPreviewPos] = useState<{
    top: number;
    left: number;
    place: "right" | "left";
  } | null>(null);
  const router = useRouter();
  const leftBadgeClass =
    section === "featured"
      ? "bg-gradient-to-r from-green-500 to-emerald-500"
      : section === "trending"
      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
      : section === "newest"
      ? "bg-gradient-to-r from-green-400 to-green-600"
      : "bg-gradient-to-r from-teal-500 to-green-500";

  const fetchPreview = useCallback(
    async (courseId: string) => {
      if (!courseId || previewCache[courseId] || !showPreview) return;
      try {
        const res = await api.get(`/courses/${courseId}/detail-info`);
        setPreviewCache((prev) => ({ ...prev, [courseId]: res.data }));
      } catch {
        // ignore errors in preview
      }
    },
    [previewCache, showPreview]
  );

  const checkEnrollmentAndNavigate = useCallback(
    async (courseId: string, slug: string) => {
      console.log("courseId", courseId);
      console.log("slug", slug);
      if (isCheckingEnrollment) return;

      setIsCheckingEnrollment(true);
      try {
        const response = await api.get(`/courses/${courseId}/is_enroll`);
        const { is_enroll } = response.data;

        if (is_enroll) {
          // User đã đăng ký -> chuyển đến learning page
          router.push(`/learning/${slug}`);
        } else {
          // User chưa đăng ký -> chuyển đến course detail page
          router.push(`/course/${slug}`);
        }
      } catch (error) {
        // Nếu API lỗi, fallback về course detail page
        // Suppress console error để không ảnh hưởng UX
        // console.error("Error checking enrollment:", error);
        router.push(`/course/${slug}`);
      } finally {
        setIsCheckingEnrollment(false);
      }
    },
    [isCheckingEnrollment, router]
  );

  const computePreviewPosition = useCallback((): {
    top: number;
    left: number;
    place: "right" | "left";
  } | null => {
    if (!cardRef.current || typeof window === "undefined") return null;
    const rect = cardRef.current.getBoundingClientRect();
    const gap = 12;
    const width = 320; // tooltip width (w-80)
    const hasRight = window.innerWidth - rect.right > width + gap;
    const left = hasRight ? rect.right + gap : rect.left - width - gap;
    const top = Math.min(Math.max(rect.top, 8), window.innerHeight - 240);
    return { top, left: Math.max(left, 8), place: hasRight ? "right" : "left" };
  }, []);

  const handleEnter = useCallback(
    (courseId: string) => {
      if (!showPreview) return;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setHoveredId(courseId);
        const pos = computePreviewPosition();
        if (pos) setPreviewPos(pos);
        fetchPreview(courseId);
      }, 600); // Delay 0.6s mới hiện
    },
    [showPreview, computePreviewPosition, fetchPreview]
  );

  const handleLeave = useCallback(() => {
    if (!showPreview) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredId(null);
      setPreviewPos(null);
    }, 200); // Delay 200ms trước khi ẩn
  }, [showPreview]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!hoveredId) return;
    const update = () => {
      const pos = computePreviewPosition();
      if (pos) setPreviewPos(pos);
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [hoveredId]);

  return (
    <div
      className="group relative bg-white border border-gray-100 rounded-xl hover:shadow-lg hover:shadow-green-50/50 hover:border-green-200 transition-all duration-300 overflow-hidden flex flex-col h-full"
      onMouseEnter={() => handleEnter(course.id)}
      onMouseLeave={handleLeave}
      ref={cardRef}
    >
      <div className="relative overflow-hidden">
        <img
          src={getGoogleDriveImageUrl(course.image || "")}
          alt={course.title}
          className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          onError={(e) => {
            (
              e.target as HTMLImageElement
            ).src = `https://via.placeholder.com/400x300/00bba7/ffffff?text=${encodeURIComponent(
              course.title
            )}`;
          }}
        />
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3
          className={`text-[15px] font-semibold text-gray-900 mb-3 line-clamp-2 cursor-pointer hover:text-green-600 transition-colors duration-200 leading-relaxed ${
            isCheckingEnrollment ? "opacity-50 cursor-wait" : ""
          }`}
          onClick={() =>
            checkEnrollmentAndNavigate(course.id, course.slug || "")
          }
        >
          {course.title}
          {isCheckingEnrollment && (
            <span className="ml-2 text-xs text-gray-400 font-normal">
              Đang kiểm tra...
            </span>
          )}
        </h3>

        {course.instructor && (
          <div className="flex items-center gap-2 mb-4">
            {(course as any).instructorAvatar && (
              <img
                src={getGoogleDriveImageUrl((course as any).instructorAvatar)}
                alt={course.instructor}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200"
                onError={(e) => {
                  (
                    e.target as HTMLImageElement
                  ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    course.instructor || ""
                  )}&background=00bba7&color=fff&size=28`;
                }}
              />
            )}
            <p className="text-xs text-gray-600 font-medium">
              {course.instructor}
            </p>
          </div>
        )}

        {Array.isArray((course as any).tags) &&
          (course as any).tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(course as any).tags.map((tag: string, i: number) => (
                <span
                  key={i}
                  className={`${
                    tag === "bán chạy nhất"
                      ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      : tag === "thịnh hành"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : tag === "được yêu thích"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : tag === "mới ra mắt"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-gray-50 text-gray-600 border border-gray-200"
                  } px-2.5 py-1 rounded-md text-[11px] font-medium`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

        {/* Spacer */}
        <div className="flex-grow"></div>

        {/* Price */}
        {course.price !== null && course.price !== undefined && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-green-600">
                {course.price === 0
                  ? "Miễn phí"
                  : `${Number(course.price).toLocaleString("en-US")}đ`}
              </span>
              {typeof (course as any).originalPrice === "number" && (
                <span className="text-sm text-gray-400 line-through font-normal">
                  {(course as any).originalPrice.toLocaleString("en-US")}đ
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {showPreview &&
        hoveredId === course.id &&
        previewPos &&
        createPortal(
          <div
            className="fixed z-[9999] w-80 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ top: previewPos.top, left: previewPos.left }}
            onMouseEnter={() =>
              hoverTimerRef.current && clearTimeout(hoverTimerRef.current!)
            }
            onMouseLeave={handleLeave}
          >
            <div className="relative rounded-2xl shadow-2xl p-5 text-sm bg-white backdrop-blur-xl border-2 border-green-200 ring-2 ring-green-500/10">
              {/* top gradient bar */}
              <div className="pointer-events-none absolute inset-x-0 -top-px h-1.5 rounded-t-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
              {previewPos.place === "right" ? (
                <>
                  <div className="absolute -left-2 top-6 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-green-200" />
                  <div className="absolute -left-[7px] top-6 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-white" />
                </>
              ) : (
                <>
                  <div className="absolute -right-2 top-6 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-green-200" />
                  <div className="absolute -right-[7px] top-6 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-white" />
                </>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-green-100 to-emerald-100 flex-shrink-0 ring-2 ring-green-200">
                  <img
                    src={getGoogleDriveImageUrl(
                      course.image ||
                        previewCache[course.id]?.thumbnail_url ||
                        ""
                    )}
                    alt="thumb"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-900 line-clamp-2 text-base">
                    {previewCache[course.id]?.title || course.title}
                  </div>
                  {course.instructor && (
                    <div className="flex items-center gap-2 mt-1">
                      {(course as any).instructorAvatar && (
                        <img
                          src={getGoogleDriveImageUrl(
                            (course as any).instructorAvatar
                          )}
                          alt={course.instructor}
                          className="w-5 h-5 rounded-full object-cover"
                          onError={(e) => {
                            (
                              e.target as HTMLImageElement
                            ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              course.instructor || ""
                            )}&background=00bba7&color=fff&size=20`;
                          }}
                        />
                      )}
                      <div className="text-xs text-emerald-600 line-clamp-1 font-medium">
                        {course.instructor}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div>
                    <span className="font-medium text-gray-600">Cập nhật:</span>{" "}
                    {previewCache[course.id]?.last_updated
                      ? new Date(
                          previewCache[course.id].last_updated
                        ).toLocaleDateString("vi-VN")
                      : "--"}
                  </div>
                  <div className="font-semibold text-green-600">
                    {previewCache[course.id]?.language?.toUpperCase() || "--"}
                  </div>
                </div>
              </div>

              {Array.isArray(previewCache[course.id]?.outcomes) &&
              previewCache[course.id].outcomes.length > 0 ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
                  <div className="text-xs font-bold text-green-700 mb-2">
                    Bạn sẽ học được:
                  </div>
                  <ul className="space-y-1.5 text-gray-700">
                    {previewCache[course.id].outcomes
                      .slice(0, 4)
                      .map((o: string, i: number) => (
                        <li
                          key={i}
                          className="leading-snug text-xs flex items-start gap-2"
                        >
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span className="flex-1">{o}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <div className="text-gray-600 text-xs line-clamp-3 leading-relaxed bg-gray-50 rounded-lg p-3">
                  {(previewCache[course.id]?.description || "")
                    .replace(/<[^>]*>/g, " ")
                    .trim() || (
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      Đang tải thông tin...
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-green-100 flex items-center justify-end">
                <div className="text-xs font-bold text-green-600">
                  Xem chi tiết →
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CourseCard;
