"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { LEVELS, type HeroProgressRef, type ScrollThreeHeroProps } from "./contract";
import { HERO_LEVEL_COPY } from "./hero-copy";
import ThreeHeroFallback from "./ThreeHeroFallback";
import { useHeroQuality, useReducedMotionPreference, useWebGLSupport } from "./useHeroQuality";

const ThreeHeroCanvas = dynamic(() => import("./ThreeHeroCanvas"), { ssr: false });
const FloatingCards = dynamic(() => import("./FloatingCards"), { ssr: false });

export default function ScrollThreeHero({ onExploreCourses, onSelectGradeLevel }: ScrollThreeHeroProps) {
  const quality = useHeroQuality();
  const webgl = useWebGLSupport();
  const reducedMotion = useReducedMotionPreference();
  const visualRef = useRef<HTMLDivElement>(null);
  const progressRef: HeroProgressRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showCanvas, setShowCanvas] = useState(false);
  const useFallback = reducedMotion || webgl === false;
  const copy = HERO_LEVEL_COPY[activeIndex];

  useEffect(() => {
    const visual = visualRef.current;
    if (useFallback || !visual || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setShowCanvas(entry.isIntersecting));
    observer.observe(visual);
    return () => observer.disconnect();
  }, [useFallback]);

  useEffect(() => {
    const target = LEVELS[activeIndex].stop;
    const start = progressRef.current;
    if (useFallback || !showCanvas || start === target) {
      progressRef.current = target;
      return;
    }

    const started = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const elapsed = Math.min(1, (now - started) / 400);
      progressRef.current = start + (target - start) * (1 - (1 - elapsed) ** 3);
      if (elapsed < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, showCanvas, useFallback]);

  if (useFallback) return <ThreeHeroFallback onExploreCourses={onExploreCourses} onSelectGradeLevel={onSelectGradeLevel} />;

  return (
    <section aria-labelledby="guest-home-heading" className="user-container pt-5 sm:pt-8">
      <div className="grid overflow-hidden rounded-3xl border border-border bg-linear-to-br from-primary-light via-surface to-secondary-light/65 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <div className="p-5 sm:p-8 lg:p-10">
          <div role="group" aria-label="Xem theo cấp học" className="mb-5 flex flex-wrap gap-2">
            {LEVELS.map((level, index) => (
              <Button
                key={level.id}
                variant={index === activeIndex ? "pastel" : "outline"}
                size="sm"
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                className={cn("whitespace-nowrap px-2.5 sm:px-3.5", index === activeIndex && "font-semibold")}
              >
                {level.label}
              </Button>
            ))}
          </div>
          <div aria-live="polite">
            <h1 id="guest-home-heading" className="font-display max-w-[16ch] whitespace-pre-line text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {copy.headline}
            </h1>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-foreground/85 sm:text-base">{copy.description}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={onExploreCourses}>Khám phá khóa học</Button>
            <Button variant="outline" onClick={() => onSelectGradeLevel(LEVELS[activeIndex].id)}>Xem môn học {LEVELS[activeIndex].label}</Button>
          </div>
        </div>

        <div ref={visualRef} aria-hidden="true" className="pointer-events-none relative hidden min-h-[23rem] overflow-hidden bg-primary-light/70 lg:block">
          {webgl && showCanvas && (
            <div className="absolute inset-0">
              <ThreeHeroCanvas progressRef={progressRef} quality={quality}>
                <FloatingCards progressRef={progressRef} quality={quality} />
              </ThreeHeroCanvas>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
