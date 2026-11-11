"use client";

import { Badge, BadgeVariant, Card } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
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
import { HiStar, HiUsers } from "react-icons/hi";

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
    <Card
      density="none"
      className="group relative hover:shadow-md hover:border-primary-pastel hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col h-full"
      onMouseEnter={() => handleEnter(course.id)}
      onMouseLeave={handleLeave}
      ref={cardRef}
    >
      <div className="relative overflow-hidden bg-primary-light">
        <img
          src={getImageUrl(course.image || "")}
          alt={course.title}
          className="w-full h-44 object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/logo/maymay-logo.svg";
          }}
        />
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3
          className={`text-[15px] font-semibold text-foreground mb-2.5 line-clamp-2 cursor-pointer hover:text-primary transition-colors duration-200 leading-snug ${
            isCheckingEnrollment ? "opacity-50 cursor-wait" : ""
          }`}
          onClick={() =>
            checkEnrollmentAndNavigate(course.id, course.slug || "")
          }
        >
          {course.title}
          {isCheckingEnrollment && (
            <span className="ml-2 text-xs text-subtle-foreground font-normal">
              Đang kiểm tra...
            </span>
          )}
        </h3>

        {course.instructor && (
          <div className="flex items-center gap-2 mb-3">
            {(course as any).instructorAvatar && (
              <img
                src={getImageUrl((course as any).instructorAvatar)}
                alt={course.instructor}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-border"
                onError={(e) => {
                  (
                    e.target as HTMLImageElement
                  ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    course.instructor || ""
                  )}&size=28`;
                }}
              />
            )}
            <p className="text-xs text-muted-foreground font-medium truncate">
              {course.instructor}
            </p>
          </div>
        )}

        {/* Rating & Student Enrollment Meta */}
        {((typeof course.rating === "number" && course.rating > 0) ||
          (typeof course.students === "number" && course.students > 0)) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            {typeof course.rating === "number" && course.rating > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-warning-foreground">
                <HiStar className="w-4 h-4 fill-current" />
                {course.rating.toFixed(1)}
              </span>
            )}
            {typeof course.students === "number" && course.students > 0 && (
              <span className="inline-flex items-center gap-1">
                <HiUsers className="w-3.5 h-3.5 text-primary" />
                {course.students.toLocaleString("vi-VN")} học viên
              </span>
            )}
          </div>
        )}

        {Array.isArray((course as any).tags) &&
          (course as any).tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(course as any).tags.map((tag: string, i: number) => {
                const variant: BadgeVariant =
                  tag === "bán chạy nhất"
                    ? "warning"
                    : tag === "thịnh hành"
                    ? "secondary"
                    : tag === "được yêu thích"
                    ? "lavender"
                    : tag === "mới ra mắt"
                    ? "default"
                    : "neutral";
                return (
                  <Badge key={i} variant={variant} size="sm">
                    {tag}
                  </Badge>
                );
              })}
            </div>
          )}

        <div className="flex-grow" />

        {/* Price */}
        {course.price !== null && course.price !== undefined && (
          <div className="pt-3.5 border-t border-border flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-primary">
                {course.price === 0
                  ? "Miễn phí"
                  : `${Number(course.price).toLocaleString("en-US")}đ`}
              </span>
              {typeof (course as any).originalPrice === "number" && (
                <span className="text-xs text-subtle-foreground line-through font-normal">
                  {(course as any).originalPrice.toLocaleString("en-US")}đ
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
            <Card className="relative rounded-2xl shadow-lg p-5 text-sm border-primary-pastel">
              <div className="pointer-events-none absolute inset-x-0 -top-px h-1 rounded-t-2xl bg-primary-pastel" />
              {previewPos.place === "right" ? (
                <>
                  <div className="absolute -left-2 top-6 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-primary-pastel" />
                  <div className="absolute -left-[7px] top-6 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-surface" />
                </>
              ) : (
                <>
                  <div className="absolute -right-2 top-6 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-primary-pastel" />
                  <div className="absolute -right-[7px] top-6 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-surface" />
                </>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary-light flex-shrink-0 border border-primary-pastel">
                  <img
                    src={getImageUrl(
                      course.image ||
                        previewCache[course.id]?.thumbnail_url ||
                        ""
                    )}
                    alt="thumb"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground line-clamp-2 text-sm leading-snug">
                    {previewCache[course.id]?.title || course.title}
                  </div>
                  {course.instructor && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {(course as any).instructorAvatar && (
                        <img
                          src={getImageUrl((course as any).instructorAvatar)}
                          alt={course.instructor}
                          className="w-4 h-4 rounded-full object-cover"
                          onError={(e) => {
                            (
                              e.target as HTMLImageElement
                            ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              course.instructor || ""
                            )}&size=20`;
                          }}
                        />
                      )}
                      <div className="text-xs text-muted-foreground line-clamp-1 font-medium">
                        {course.instructor}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">
                      Cập nhật:
                    </span>{" "}
                    {previewCache[course.id]?.last_updated
                      ? new Date(
                          previewCache[course.id].last_updated
                        ).toLocaleDateString("vi-VN")
                      : "--"}
                  </div>
                  <Badge variant="default" size="sm">
                    {previewCache[course.id]?.language?.toUpperCase() || "--"}
                  </Badge>
                </div>
              </div>

              {Array.isArray(previewCache[course.id]?.outcomes) &&
              previewCache[course.id].outcomes.length > 0 ? (
                <div className="bg-background rounded-xl p-3 border border-border">
                  <div className="text-xs font-semibold text-foreground mb-2">
                    Bạn sẽ học được:
                  </div>
                  <ul className="space-y-1.5 text-muted-foreground">
                    {previewCache[course.id].outcomes
                      .slice(0, 4)
                      .map((o: string, i: number) => (
                        <li
                          key={i}
                          className="leading-snug text-xs flex items-start gap-2"
                        >
                          <span className="text-primary font-bold mt-0.5">
                            ✓
                          </span>
                          <span className="flex-1">{o}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <div className="text-muted-foreground text-xs line-clamp-3 leading-relaxed bg-background rounded-xl p-3 border border-border">
                  {(previewCache[course.id]?.description || "")
                    .replace(/<[^>]*>/g, " ")
                    .trim() || (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                      Đang tải thông tin...
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-end">
                <div className="text-xs font-semibold text-primary">
                  Xem chi tiết →
                </div>
              </div>
            </Card>
          </div>,
          document.body
        )}
    </Card>
  );
};

export default CourseCard;
