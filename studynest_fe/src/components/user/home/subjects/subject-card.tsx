import { cn } from "@/lib/utils";
import type { TaxonomyItem } from "@/types/catalog";
import {
  ArrowUpRight,
  Atom,
  BookOpen,
  Calculator,
  Feather,
  FlaskConical,
  History,
  Languages,
  Map as MapIcon,
  Microscope,
  Monitor,
  Orbit,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { CloudBlob, GlassCard, IconBubble, Pill, TONE, type Tone } from "../landing-ui";

const subjectIcons = new Map<string, LucideIcon>([
  ["toan", Calculator],
  ["toan-hoc", Calculator],
  ["tieng-viet", BookOpen],
  ["ngu-van", Feather],
  ["tieng-anh", Languages],
  ["vat-ly", Atom],
  ["vat-li", Atom],
  ["hoa-hoc", FlaskConical],
  ["sinh-hoc", Microscope],
  ["tin-hoc", Monitor],
  ["tin-hoc-cong-nghe", Monitor],
  ["lich-su", History],
  ["dia-ly", MapIcon],
  ["dia-li", MapIcon],
  ["lich-su-dia-ly", MapIcon],
  ["lich-su-dia-li", MapIcon],
  ["tu-nhien-xa-hoi", Orbit],
  ["khoa-hoc", Microscope],
  ["khtn", Atom],
  ["khoa-hoc-tu-nhien", Atom],
]);

export const formatCount = new Intl.NumberFormat("vi-VN");

const subjectFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface SubjectCardProps {
  subject: TaxonomyItem;
  courseCount: number;
  levelCode?: string;
  grade: number | null;
  featured: boolean;
  tone: Tone;
}

export function SubjectCard({ subject, courseCount, levelCode, grade, featured, tone }: SubjectCardProps) {
  const Icon = subjectIcons.get(subject.code) ?? subjectIcons.get(subject.slug ?? "") ?? BookOpen;
  const params = new URLSearchParams();
  if (levelCode) params.set("level", levelCode);
  if (grade !== null) params.set("grade", String(grade));
  params.set("subject", subject.slug || subject.code);

  const countLabel = `${formatCount.format(courseCount)} khóa học`;

  return (
    <GlassCard
      as={Link}
      href={`/courses?${params.toString()}`}
      className={cn(
        "group relative isolate flex h-full min-w-0 flex-col hover:border-primary-pastel! motion-reduce:hover:translate-y-0",
        subjectFocus,
        featured ? "min-h-64 justify-end p-5 sm:p-7 lg:p-8" : "min-h-36 justify-between gap-3 p-4 sm:p-5",
      )}
    >
      {featured ? (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] bg-linear-to-br from-surface via-primary-light/55 to-accent/65">
            <CloudBlob className="-bottom-10 -left-14 h-36 w-72" />
            <div className="absolute -right-14 -top-28 size-72 rounded-full border border-accent-border/70 bg-accent/25 sm:right-0" />
            <div className="absolute -right-4 -top-16 size-52 rounded-full border border-surface sm:right-9" />
            <div className="absolute right-4 top-8 size-3 rounded-full bg-primary-pastel sm:right-10" />
            <div className="absolute right-28 top-8 size-2 rounded-full bg-primary-pastel sm:right-44 sm:top-10" />
          </div>
          <div className="pointer-events-none relative mb-7 flex h-20 items-end justify-end pr-4 sm:pr-9 lg:h-24">
            <div aria-hidden="true">
              <span className="absolute right-7 top-0 size-20 rotate-12 rounded-3xl border border-surface bg-surface/55 shadow-md sm:right-12 lg:size-24" />
              <IconBubble tone={tone} className="relative h-20! w-20! -rotate-6 shadow-lg lg:h-24! lg:w-24!">
                <Icon className="size-10 lg:size-12" strokeWidth={1.5} />
              </IconBubble>
            </div>
            <Pill tone={tone} className="absolute -right-1 -bottom-2 z-10 rotate-2 shadow-md sm:right-0">
              {countLabel}
            </Pill>
          </div>
        </>
      ) : (
        <div className="flex min-w-0 items-start gap-3">
          <IconBubble tone={tone} className="h-10! w-10! rounded-xl! shadow-sm">
            <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </IconBubble>
          <div className="min-w-0 self-center">
            <h3 className="wrap-break-word text-sm font-bold leading-snug text-foreground group-hover:text-info-foreground sm:text-base">
              {subject.name}
            </h3>
            {subject.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground/85">{subject.description}</p>}
          </div>
        </div>
      )}

      {featured && (
        <div className="min-w-0">
          <h3 className="wrap-break-word text-2xl font-bold leading-tight tracking-tight text-foreground group-hover:text-info-foreground sm:text-3xl">
            {subject.name}
          </h3>
          {subject.description && <p className="mt-2 line-clamp-2 max-w-md text-sm leading-relaxed text-foreground/85">{subject.description}</p>}
        </div>
      )}

      <div className={cn("flex min-w-0 items-center justify-between gap-2.5", featured && "mt-4")}>
        {featured ? (
          <span className="text-sm font-semibold text-info-foreground group-hover:underline group-hover:underline-offset-4">Xem khóa học</span>
        ) : (
          <span className={cn("text-xs font-semibold tabular-nums", TONE[tone].fg)}>{countLabel}</span>
        )}
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-primary-pastel bg-surface/90 text-info-foreground group-hover:bg-primary-light">
          <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </span>
      </div>
    </GlassCard>
  );
}
