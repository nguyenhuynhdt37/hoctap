"use client";

import { CourseThumb } from "./home-ui";
import type { ReviewQueueItem } from "@/lib/learning-hub/types";

export function ReviewPreview({ item }: { item: ReviewQueueItem }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-4 rounded-[1.75rem] bg-surface p-3 shadow-ambient-md sm:grid-cols-[11rem_minmax(0,1fr)]">
      <CourseThumb src={item.course.thumbnail_url} sizes="176px" className="rounded-xl" />
      <div className="min-w-0 py-1 pr-2">
        <p className="text-sm font-bold text-info-foreground wrap-anywhere">Xem trước một câu ôn{item.course.title ? ` · ${item.course.title}` : ""}</p>
        <p className="mt-1 text-base font-bold wrap-anywhere">{item.question}</p>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2" aria-label="Các phương án trả lời">
          {item.options.map((option, index) => <li key={option.id} className="wrap-anywhere">{String.fromCharCode(65 + index)}. {option.text}</li>)}
        </ul>
      </div>
    </div>
  );
}
