"use client";

import { Progress, Select } from "@/components/ui";
import { GlassCard, Pill, Reveal, SectionHeader, SectionShell } from "@/components/user/home/landing-ui";
import { mayPortrait, StudyImage } from "@/components/user/home/study-image";
import { useHubCourseMastery, useHubMasteryCourses } from "@/lib/learning-hub/hooks";
import type { MasteryStatus } from "@/lib/learning-hub/types";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { HubLoadError } from "./hub-page-state";
import { HomeLink, SectionLoading } from "./home/section";
import { MockDataChip } from "./mock-data-chip";

const statusLabels: Record<MasteryStatus, string> = {
  solid: "Đã nắm vững", needs_review: "Cần ôn", fading: "Sắp quên", not_started: "Chưa bắt đầu", no_quiz: "Không có trắc nghiệm",
};
const statusTones = { solid: "success", needs_review: "pink", fading: "vanilla", not_started: "blue", no_quiz: "blue" } as const;

function Status({ value }: { value: MasteryStatus }) {
  return <Pill tone={statusTones[value]}>{statusLabels[value]}</Pill>;
}

export function MasteryView() {
  const courses = useHubMasteryCourses();
  const [selected, setSelected] = useState("");
  const course = courses.data?.courses.find(({ id }) => id === selected) ?? courses.data?.courses[0];
  const mastery = useHubCourseMastery(course?.id ?? null);
  const data = mastery.data;
  const title = data?.course.title ?? course?.title;
  const thumbnail = data?.course.thumbnail_url ?? course?.thumbnail_url;
  const reviewHref = course && `/review?course_id=${encodeURIComponent(course.id)}`;

  return (
    <main>
      <SectionShell tone="blue" label="Bản đồ năng lực">
        <SectionHeader eyebrow="Theo dõi những gì bạn đã nắm" title="Bản đồ năng lực" tone="lavender" />
        <Reveal className="mx-auto max-w-3xl">
          <GlassCard className="space-y-4 p-5 sm:p-7">
            <StudyImage src={thumbnail} fallback={course ? undefined : mayPortrait} alt={title ? `Ảnh bìa khóa học ${title}` : ""}
              sizes="(min-width: 840px) 712px, 86vw" className="aspect-[2/1] shadow-ambient-sm sm:aspect-[5/2]" />
            {courses.error ? (
              <HubLoadError error={courses.error} message="Mây chưa tải được khóa học của bạn." onRetry={courses.retry} isRetrying={courses.isValidating} />
            ) : courses.isLoading ? (
              <SectionLoading label="Đang tải danh sách khóa học" />
            ) : course ? (
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="min-w-0 flex-1 space-y-1.5 text-sm font-semibold">
                  <span>Khóa học</span>
                  <Select value={course.id} onChange={(event) => setSelected(event.target.value)}>
                    {courses.data?.courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </Select>
                </label>
                <MockDataChip source={courses.source} />
              </div>
            ) : (
              <p className="rounded-xl bg-primary-light p-3 text-sm">Bạn chưa có khóa học để xem năng lực.</p>
            )}
            {course && <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Status value={data?.status ?? course.status} />
                  <span className="text-sm">{course.quiz_lessons}/{course.total_lessons} bài có trắc nghiệm</span>
                </div>
                {(data ? data.course_score : course.course_score) != null && (
                  <Progress value={(data ? data.course_score : course.course_score) ?? 0} label="Năng lực toàn khóa" showValue size="sm" />
                )}
              </div>
              {mastery.error ? (
                <HubLoadError error={mastery.error} message="Mây chưa tải được năng lực theo chương." onRetry={mastery.retry} isRetrying={mastery.isValidating} />
              ) : mastery.isLoading ? (
                <SectionLoading label="Đang tải năng lực theo chương" />
              ) : data?.sections.length ? (
                <div className="space-y-2.5">
                  {[...data.sections].sort((a, b) => a.position - b.position).map((section) => (
                    <details key={section.id} className="group rounded-2xl border border-primary-pastel bg-background p-3 sm:p-4">
                      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                        <StudyImage src={thumbnail} sizes="(min-width: 640px) 96px, 64px" className="aspect-[4/3] w-16 shrink-0 rounded-xl sm:w-24" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <span className="block text-sm font-semibold wrap-anywhere">{section.title}</span>
                          <Status value={section.status} />
                          {section.score != null && <Progress value={section.score} label="Mức độ nắm bài" showValue size="sm" />}
                        </div>
                        <ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open:rotate-180" />
                      </summary>
                      <ul className="my-3 space-y-1.5">
                        {[...section.lessons].sort((a, b) => a.position - b.position).map((lesson) => (
                          <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                            <span className="wrap-anywhere">{lesson.title}</span>
                            <span className="flex flex-wrap items-center gap-2">
                              {lesson.score != null && <span>{Math.round(lesson.score)}%</span>}
                              <Status value={lesson.status} />
                            </span>
                          </li>
                        ))}
                      </ul>
                      {reviewHref && section.lessons.some(({ has_quiz }) => has_quiz) && <HomeLink href={reviewHref}>Ôn phần này</HomeLink>}
                    </details>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-primary-light p-3 text-sm">Khóa học này chưa có dữ liệu năng lực theo chương.</p>
              )}
            </>}
          </GlassCard>
        </Reveal>
      </SectionShell>
    </main>
  );
}
