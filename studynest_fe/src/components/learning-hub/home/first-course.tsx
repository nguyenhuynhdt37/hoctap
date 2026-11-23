"use client";

import { Button, Skeleton } from "@/components/ui";
import { toYoutubeEmbedUrl } from "@/components/user/course_detail/youtube-embed";
import { academyCover, mayPortrait, pathCover, StudyImage } from "@/components/user/home/study-image";
import { cn } from "@/lib/utils";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import { isAxiosError } from "axios";
import type { CatalogCourseCard, CatalogCourseCardResult } from "@/types/catalog";
import { BookOpen, Check, X } from "pulsoicon-react";
import { useEffect, useRef, useState } from "react";
import { HubLoadError } from "../hub-page-state";
import { CourseThumb } from "./home-ui";
import { HomeLink, SectionLoading } from "./section";

const levels = [
  { id: "tieu-hoc", label: "Tiểu học", detail: "Lớp 1 đến lớp 5", image: mayPortrait },
  { id: "thcs", label: "THCS", detail: "Lớp 6 đến lớp 9", image: pathCover },
  { id: "thpt", label: "THPT", detail: "Lớp 10 đến lớp 12", image: academyCover },
] as const;

export type SchoolLevel = typeof levels[number]["id"];

export function FirstCourse({ level, course, onLevel, onCourse }: {
  level?: SchoolLevel;
  course?: CatalogCourseCard;
  onLevel: (level: SchoolLevel) => void;
  onCourse: (course: CatalogCourseCard) => void;
}) {
  const results = useAuthedSWR<CatalogCourseCardResult>(
    level ? `/catalog/courses?level=${level}&limit=3&sort=popular` : null,
    { shouldRetryOnError: false },
  );
  const courses = results.data?.items ?? [];

  return (
    <div className="relative isolate">
      <div aria-hidden="true" className="absolute inset-0 -z-10 rotate-[0.8deg] rounded-[2.5rem] bg-primary-light" />
      <div className="p-5 sm:p-8">
        <fieldset id="choose-grade" tabIndex={-1} className="min-w-0 scroll-mt-24 focus-visible:outline-2 focus-visible:outline-ring">
          <legend className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Bạn đang học cấp nào?</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {levels.map(({ id, label, detail, image }, index) => (
              <button key={id} type="button" aria-pressed={level === id} onClick={() => onLevel(id)}
                className={cn("group relative isolate flex min-h-36 cursor-pointer flex-col justify-end overflow-hidden rounded-[1.75rem] p-4 text-left text-primary-foreground ring-offset-2 ring-offset-primary-light focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:min-h-52",
                  index === 1 ? "sm:mt-6" : index === 2 ? "sm:mt-2" : "", level === id ? "ring-4 ring-primary" : "")}>
                <StudyImage src={image} fallback={image} sizes="(min-width: 640px) 360px, 92vw" className="absolute inset-0 -z-10 rounded-none" />
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-4/5 bg-linear-to-t from-foreground via-foreground/70 to-transparent" />
                <span className="text-2xl font-extrabold">{label}</span>
                <span className="text-sm font-medium">{detail}{level === id && " · Đã chọn"}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {level && (
          <div id="choose-course" tabIndex={-1} className="mt-8 scroll-mt-24 rounded-md focus-visible:outline-2 focus-visible:outline-ring">
            <h3 className="mb-3 text-xl font-extrabold">Chọn một khóa để học thử</h3>
            {results.error ? (
              <HubLoadError title="Chưa tải được khóa học theo cấp" message="Tải lại để xem các khóa của cấp vừa chọn." onRetry={() => void results.mutate().catch(() => undefined)} isRetrying={results.isValidating} />
            ) : !results.data ? (
              <SectionLoading label="Đang tìm khóa học" className="grid gap-3 space-y-0 border-0 bg-transparent p-0 sm:grid-cols-3">
                {[0, 1, 2].map((item) => <Skeleton key={item} className="aspect-video rounded-[1.5rem]" />)}
              </SectionLoading>
            ) : courses.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-3">
                {courses.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <button type="button" aria-pressed={course?.id === item.id} onClick={() => onCourse(item)}
                      className="group block w-full cursor-pointer overflow-hidden rounded-[1.5rem] bg-surface text-left shadow-ambient-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:ring-4 aria-pressed:ring-primary">
                      <CourseThumb src={item.thumbnail} sizes="(min-width: 640px) 360px, 92vw" />
                      <span className="block p-3.5 text-sm font-bold wrap-anywhere">{item.title}{course?.id === item.id && <span className="mt-1 flex items-center gap-1 text-info-foreground"><Check aria-hidden="true" className="size-4" />Đã chọn</span>}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm">Chưa có khóa ở cấp này. Bạn có thể chọn cấp khác hoặc xem tất cả khóa học.</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {course && <p role="status" className="text-sm font-semibold">Đã chọn {course.title}. Bấm Học thử ở đầu trang để bắt đầu.</p>}
              <HomeLink href={`/courses?level=${level}`} endIcon={false} className="bg-surface text-sm">Xem thêm khóa học</HomeLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TrialDialog({ course, onClose }: { course: CatalogCourseCard; onClose: (openedLesson: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string>();
  const previews = useAuthedSWR<{ id: string; title: string; video_url: string | null }[]>(
    `/courses/${encodeURIComponent(course.id)}/preview`, { shouldRetryOnError: false },
  );
  const lessons = (Array.isArray(previews.data) ? previews.data : []).flatMap((lesson) => {
    const url = lesson.video_url && toYoutubeEmbedUrl(lesson.video_url);
    return url ? [{ ...lesson, url }] : [];
  });
  const noPreview = isAxiosError(previews.error) && previews.error.response?.status === 404
    && previews.error.response.data?.detail === "Không tìm thấy bài học xem trước nào";
  const active = lessons.find(({ id }) => id === selected) ?? lessons[0];

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="trial-title" onClose={() => onClose(Boolean(active) && !previews.error)}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-auto rounded-2xl border border-border bg-surface p-4 text-foreground shadow-ambient-lg backdrop:bg-foreground/55 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="trial-title" className="font-display text-xl font-semibold">Học thử</h2>
          <p className="mt-1 text-sm wrap-anywhere">{course.title}</p>
        </div>
        <Button variant="outline" size="icon" aria-label="Đóng học thử" onClick={() => dialog.current?.close()}><X aria-hidden="true" className="size-5" /></Button>
      </div>
      {previews.error && !noPreview ? (
        <HubLoadError title="Chưa tải được bài học thử" message="Tải lại để lấy video của khóa này." onRetry={() => void previews.mutate().catch(() => undefined)} isRetrying={previews.isValidating} />
      ) : !previews.data && !noPreview ? (
        <Skeleton role="status" aria-label="Đang tải bài học thử" className="aspect-video w-full motion-reduce:animate-none" />
      ) : active ? (
        <>
          <iframe key={active.id} title={active.title} src={active.url} allowFullScreen className="aspect-video w-full rounded-xl bg-primary-light" />
          {lessons.length > 1 && <ul aria-label="Bài học thử" className="mt-2 flex flex-wrap gap-2">
            {lessons.map(({ id, title }) => <li key={id}><Button variant={active.id === id ? "pastel" : "outline"} aria-pressed={active.id === id} onClick={() => setSelected(id)}>{title}</Button></li>)}
          </ul>}
        </>
      ) : <p className="text-sm">Khóa này chưa có video học thử. Bạn có thể xem đề cương hoặc chọn khóa khác.</p>}
      <HomeLink href={`/course/${encodeURIComponent(course.slug)}`} className="mt-4" icon={<BookOpen aria-hidden="true" className="size-4" />}>Xem khóa học</HomeLink>
    </dialog>
  );
}
