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
      if (isCheckingEnrollment) return;

      setIsCheckingEnrollment(true);
      try {
        const response = await api.get(`/courses/${courseId}/is_enroll`);
        const { is_enroll } = response.data;

        if (is_enroll) {
          router.push(`/learning/${slug}`);
        } else {
          router.push(`/course/${slug}`);
        }
      } catch (error) {
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
    const width = 320;
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
      }, 600);
    },
    [showPreview, computePreviewPosition, fetchPreview]
  );

  const handleLeave = useCallback(() => {
    if (!showPreview) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredId(null);
      setPreviewPos(null);
    }, 200);
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
  }, [hoveredId, computePreviewPosition]);

  return (
    <div
      className="group relative bg-white border border-[#E7EEF7] rounded-[20px] hover:shadow-md hover:border-[#BFD7ED] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col h-full"
      onMouseEnter={() => handleEnter(course.id)}
      onMouseLeave={handleLeave}
      ref={cardRef}
    >
      <div className="relative overflow-hidden bg-[#E8F2FA]">
        <img
          src={getGoogleDriveImageUrl(course.image || "")}
          alt={course.title}
          className="w-full h-44 object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
          onError={(e) => {
            (
              e.target as HTMLImageElement
            ).src = `https://via.placeholder.com/400x300/BFD7ED/3D4A5A?text=${encodeURIComponent(
              course.title
            )}`;
          }}
        />
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3
          className={`text-[15px] font-semibold text-[#3D4A5A] mb-2.5 line-clamp-2 cursor-pointer hover:text-[#356FA7] transition-colors duration-200 leading-snug ${
            isCheckingEnrollment ? "opacity-50 cursor-wait" : ""
          }`}
          onClick={() =>
            checkEnrollmentAndNavigate(course.id, course.slug || "")
          }
        >
          {course.title}
          {isCheckingEnrollment && (
            <span className="ml-2 text-xs text-[#8190A3] font-normal">
              Đang kiểm tra...
            </span>
          )}
        </h3>

        {course.instructor && (
          <div className="flex items-center gap-2 mb-3.5">
            {(course as any).instructorAvatar && (
              <img
                src={getGoogleDriveImageUrl((course as any).instructorAvatar)}
                alt={course.instructor}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-[#E7EEF7]"
                onError={(e) => {
                  (
                    e.target as HTMLImageElement
                  ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    course.instructor || ""
                  )}&background=BFD7ED&color=3D4A5A&size=28`;
                }}
              />
            )}
            <p className="text-xs text-[#6F7C8C] font-medium truncate">
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
                      ? "bg-[#FFF1D9] text-[#875415] border border-[#F8E9C9]"
                      : tag === "thịnh hành"
                      ? "bg-[#FCE8EF] text-[#3D4A5A] border border-[#F7C9D9]"
                      : tag === "được yêu thích"
                      ? "bg-[#E3D5F5]/60 text-[#3D4A5A] border border-[#E3D5F5]"
                      : tag === "mới ra mắt"
                      ? "bg-[#E8F2FA] text-[#356FA7] border border-[#BFD7ED]"
                      : "bg-[#F6FAFF] text-[#6F7C8C] border border-[#E7EEF7]"
                  } px-2.5 py-0.5 rounded-full text-[11px] font-medium`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

        <div className="flex-grow"></div>

        {/* Price */}
        {course.price !== null && course.price !== undefined && (
          <div className="pt-3.5 border-t border-[#E7EEF7] flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-[#356FA7]">
                {course.price === 0
                  ? "Miễn phí"
                  : `${Number(course.price).toLocaleString("en-US")}đ`}
              </span>
              {typeof (course as any).originalPrice === "number" && (
                <span className="text-xs text-[#8190A3] line-through font-normal">
                  {(course as any).originalPrice.toLocaleString("en-US")}đ
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-[#356FA7] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Xem →
            </span>
          </div>
        )}
      </div>

      {showPreview &&
        hoveredId === course.id &&
        previewPos &&
        createPortal(
          <div
            className="fixed z-[9999] w-80 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{ top: previewPos.top, left: previewPos.left }}
            onMouseEnter={() =>
              hoverTimerRef.current && clearTimeout(hoverTimerRef.current!)
            }
            onMouseLeave={handleLeave}
          >
            <div className="relative rounded-2xl shadow-lg p-5 text-sm bg-white border border-[#BFD7ED]">
              <div className="pointer-events-none absolute inset-x-0 -top-px h-1 rounded-t-2xl bg-[#BFD7ED]" />
              {previewPos.place === "right" ? (
                <>
                  <div className="absolute -left-2 top-6 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-[#BFD7ED]" />
                  <div className="absolute -left-[7px] top-6 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-white" />
                </>
              ) : (
                <>
                  <div className="absolute -right-2 top-6 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-[#BFD7ED]" />
                  <div className="absolute -right-[7px] top-6 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-white" />
                </>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#E8F2FA] flex-shrink-0 border border-[#BFD7ED]">
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
                  <div className="font-semibold text-[#3D4A5A] line-clamp-2 text-sm leading-snug">
                    {previewCache[course.id]?.title || course.title}
                  </div>
                  {course.instructor && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {(course as any).instructorAvatar && (
                        <img
                          src={getGoogleDriveImageUrl(
                            (course as any).instructorAvatar
                          )}
                          alt={course.instructor}
                          className="w-4 h-4 rounded-full object-cover"
                          onError={(e) => {
                            (
                              e.target as HTMLImageElement
                            ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              course.instructor || ""
                            )}&background=BFD7ED&color=3D4A5A&size=20`;
                          }}
                        />
                      )}
                      <div className="text-xs text-[#6F7C8C] line-clamp-1 font-medium">
                        {course.instructor}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs text-[#6F7C8C]">
                  <div>
                    <span className="font-medium text-[#3D4A5A]">Cập nhật:</span>{" "}
                    {previewCache[course.id]?.last_updated
                      ? new Date(
                          previewCache[course.id].last_updated
                        ).toLocaleDateString("vi-VN")
                      : "--"}
                  </div>
                  <div className="font-semibold text-[#356FA7] bg-[#E8F2FA] px-2 py-0.5 rounded-full text-[11px]">
                    {previewCache[course.id]?.language?.toUpperCase() || "--"}
                  </div>
                </div>
              </div>

              {Array.isArray(previewCache[course.id]?.outcomes) &&
              previewCache[course.id].outcomes.length > 0 ? (
                <div className="bg-[#F6FAFF] rounded-xl p-3 border border-[#E7EEF7]">
                  <div className="text-xs font-semibold text-[#3D4A5A] mb-2">
                    Bạn sẽ học được:
                  </div>
                  <ul className="space-y-1.5 text-[#6F7C8C]">
                    {previewCache[course.id].outcomes
                      .slice(0, 4)
                      .map((o: string, i: number) => (
                        <li
                          key={i}
                          className="leading-snug text-xs flex items-start gap-2"
                        >
                          <span className="text-[#356FA7] font-bold mt-0.5">
                            ✓
                          </span>
                          <span className="flex-1">{o}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <div className="text-[#6F7C8C] text-xs line-clamp-3 leading-relaxed bg-[#F6FAFF] rounded-xl p-3 border border-[#E7EEF7]">
                  {(previewCache[course.id]?.description || "")
                    .replace(/<[^>]*>/g, " ")
                    .trim() || (
                    <div className="flex items-center gap-2 text-[#6F7C8C]">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#356FA7] animate-pulse" />
                      Đang tải thông tin...
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 pt-2.5 border-t border-[#E7EEF7] flex items-center justify-end">
                <div className="text-xs font-semibold text-[#356FA7]">
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
