"use client";

import { Badge, Button } from "@/components/ui";
import { HiArrowRight, HiCheckCircle, HiLightBulb, HiPlay } from "react-icons/hi";
import { LEVELS, SKY_BY_LEVEL, type LevelId, type ThreeHeroFallbackProps } from "./contract";

const sky = SKY_BY_LEVEL.primary;

const ACCENTS: Record<LevelId, string> = {
  primary: "bg-primary-light border-primary-pastel text-primary",
  middle: "bg-accent border-accent-border text-accent-foreground",
  high: "bg-secondary border-secondary-pastel text-secondary-foreground",
};

const CLOUDS = [
  "top-[8%] -left-24 h-40 w-96 opacity-80",
  "top-[28%] right-[-6rem] h-48 w-[28rem] opacity-70",
  "bottom-[12%] left-[10%] h-44 w-[26rem] opacity-80",
  "bottom-[-3rem] right-[8%] h-40 w-96 opacity-90",
];

export default function ThreeHeroFallback({ onExploreCourses, onSelectGradeLevel }: ThreeHeroFallbackProps) {
  return (
    <section
      aria-label="Giới thiệu hành trình học tập Mây Mây Lớp 1 đến Lớp 12"
      className="relative isolate flex min-h-[calc(100vh-4rem)] items-center overflow-hidden border-b border-border py-14 sm:py-20"
      style={{ backgroundImage: `linear-gradient(to bottom, ${sky[0]}, ${sky[1]} 55%, ${sky[2]})` }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {CLOUDS.map((c) => (
          <div key={c} className={`absolute rounded-full bg-white blur-3xl ${c}`} />
        ))}
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="space-y-6 lg:col-span-6">
          <Badge variant="default" size="md" dot className="border-primary-pastel bg-surface font-semibold text-primary">
            Lớp 1–12 · Học trên mây
          </Badge>
          <h1 className="font-display text-4xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Học tập nhẹ nhàng,
            <br />
            <span className="italic text-primary">tiến bộ mỗi ngày</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Bài giảng trực quan, luyện tập tương tác và lộ trình rõ ràng cho học sinh từ Tiểu học đến THPT, cùng
            trợ lý AI luôn đồng hành.
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            <Button variant="primary" size="lg" onClick={onExploreCourses} className="px-7">
              <HiPlay className="h-5 w-5" />
              Khám phá khóa học
            </Button>
            <Button variant="secondary" size="lg" onClick={() => onSelectGradeLevel("primary")} className="px-6">
              Chọn cấp học
              <HiArrowRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
            {LEVELS.map((lv) => (
              <button
                key={lv.id}
                type="button"
                onClick={() => onSelectGradeLevel(lv.id)}
                className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${ACCENTS[lv.id]}`}
              >
                <span className="block text-sm font-bold">{lv.label}</span>
                <span className="block text-xs font-medium text-foreground">{lv.grades}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Static glass composition */}
        <div aria-hidden className="relative mx-auto hidden h-[26rem] w-full max-w-lg sm:block lg:col-span-6">
          <div className="absolute left-0 top-4 w-72 -rotate-3 rounded-3xl border border-white/80 bg-surface/80 p-5 shadow-lg backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Bài học hôm nay</p>
            <p className="mt-1 font-display text-lg font-semibold text-foreground">Phân số và số thập phân</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-light">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Hoàn thành 66%</p>
          </div>
          <div className="absolute right-0 top-32 w-64 rotate-2 rounded-3xl border border-accent-border bg-accent/90 p-5 shadow-lg backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-accent-foreground">Quiz nhanh</p>
            <p className="mt-1 text-sm font-semibold text-foreground">1/2 + 1/4 = ?</p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm text-foreground">
              <HiCheckCircle className="h-4 w-4 text-primary" /> 3/4
            </div>
          </div>
          <div className="absolute bottom-2 left-12 flex max-w-xs -rotate-1 items-start gap-3 rounded-3xl border border-secondary-pastel bg-secondary/90 p-4 shadow-lg backdrop-blur-md">
            <HiLightBulb aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-secondary-foreground" />
            <p className="text-sm text-foreground">Mây gợi ý: ôn lại quy đồng mẫu số trước khi làm bài nhé!</p>
          </div>
        </div>
      </div>
    </section>
  );
}
