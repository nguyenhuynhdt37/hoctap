"use client";

import { Badge } from "@/components/ui";
import { IconBubble } from "@/components/user/home/landing-ui";
import { mayPortrait, StudyImage } from "@/components/user/home/study-image";
import { useLearningBadges } from "@/lib/learning-hub/hooks";
import { Medal } from "pulsoicon-react";
import { useId } from "react";
import { SectionLoading } from "../home/section";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";

export function BadgeCollection() {
  const collection = useLearningBadges();
  const id = useId();

  return (
    <section aria-labelledby={id} className="min-w-0 rounded-2xl border border-accent-border bg-accent/25 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <IconBubble tone="lavender" shape="circle" className="size-10!"><Medal aria-hidden="true" className="size-5" /></IconBubble>
        <h3 id={id} className="text-sm font-semibold">Huy hiệu</h3>
        {collection.data && !collection.error && <MockDataChip source={collection.source} />}
      </div>
      <div className="mt-3">
        {collection.error ? (
          <HubLoadError error={collection.error} message="Mây chưa tải được huy hiệu." onRetry={collection.retry} isRetrying={collection.isValidating} />
        ) : !collection.data ? (
          <SectionLoading label="Đang tải huy hiệu" />
        ) : collection.data.badges.length ? (
          <ul className="grid grid-cols-2 gap-2">
            {collection.data.badges.map((badge) => (
              <li key={badge.id} className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-2 text-center">
                <StudyImage src={badge.image_url} fallback={mayPortrait} sizes="56px"
                  imageClassName="object-contain" className={`size-14 rounded-xl ${badge.earned ? "" : "opacity-55 grayscale"}`} />
                <p className="text-sm font-semibold wrap-anywhere">{badge.name}</p>
                {badge.description && <p className="text-xs wrap-anywhere">{badge.description}</p>}
                <Badge variant={badge.earned ? "success" : "outline"}>{badge.earned ? "Đã đạt" : "Chưa đạt"}</Badge>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm">Chưa có huy hiệu trong bộ sưu tập.</p>}
      </div>
    </section>
  );
}
