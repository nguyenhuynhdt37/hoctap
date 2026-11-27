"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  LEVELS,
  activeLevelIndex,
  clamp01,
  type HeroProgressRef,
  type ScrollThreeHeroProps,
} from "./contract";
import { HERO_LEVEL_COPY } from "./hero-copy";
import ThreeHeroFallback from "./ThreeHeroFallback";
import {
  useHeroQuality,
  useReducedMotionPreference,
  useWebGLSupport,
} from "./useHeroQuality";

const ThreeHeroCanvas = dynamic(() => import("./ThreeHeroCanvas"), {
  ssr: false,
});
const FloatingCards = dynamic(() => import("./FloatingCards"), { ssr: false });

const LEVEL_NUMBERS = ["01", "02", "03"] as const;

export default function ScrollThreeHero({
  onExploreCourses,
  onSelectGradeLevel,
}: ScrollThreeHeroProps) {
  const quality = useHeroQuality();
  const webgl = useWebGLSupport();
  const reducedMotion = useReducedMotionPreference();
  const useFallback = reducedMotion || webgl === false;

  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const progressRef: HeroProgressRef = useRef(0);
  const barRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);

  const [activeIndex, setActiveIndex] = useState<0 | 1 | 2>(0);
  const [nearViewport, setNearViewport] = useState(false);
  const activeRef = useRef<0 | 1 | 2>(0);

  // Chỉ mount canvas khi section gần viewport.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || useFallback || typeof IntersectionObserver === "undefined") {
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setNearViewport(entry.isIntersecting),
      { rootMargin: "50% 0px 50% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [useFallback]);

  // Tính + làm mượt progress; chỉ chạy khi section gần viewport.
  useEffect(() => {
    if (useFallback) return;
    const el = sectionRef.current;
    const stage = stageRef.current;
    if (!el || !stage) return;

    let raf = 0;
    let running = false;
    let target = 0;
    let last = performance.now();
    let hintHidden = false;

    const readTarget = () => {
      const rect = el.getBoundingClientRect();
      const range = Math.max(1, rect.height - stage.offsetHeight);
      const stageTop = stage.getBoundingClientRect().top;
      target = clamp01((stageTop - rect.top) / range);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      readTarget();
      const cur = progressRef.current;
      // Damp độc lập tốc độ khung hình.
      const next = cur + (target - cur) * (1 - Math.exp(-6 * dt));
      progressRef.current = Math.abs(target - next) < 0.0005 ? target : next;
      const p = progressRef.current;

      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${p})`;
      }
      if (hintRef.current) {
        const hide = p > 0.04 && activeRef.current === 0;
        if (hide !== hintHidden) {
          hintHidden = hide;
          hintRef.current.style.opacity = hide ? "0" : "1";
        }
      }
      const idx = activeLevelIndex(target);
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActiveIndex(idx);
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    readTarget();
    progressRef.current = target;

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "20% 0px 20% 0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, [useFallback]);

  const scrollToLevel = useCallback((index: number) => {
    const el = sectionRef.current;
    const stage = stageRef.current;
    if (!el || !stage) return;
    const stickyTop = Number.parseFloat(getComputedStyle(stage).top) || 0;
    const top = el.getBoundingClientRect().top + window.scrollY - stickyTop;
    const range = Math.max(0, el.offsetHeight - stage.offsetHeight);
    window.scrollTo({
      top: top + range * LEVELS[index].stop,
      behavior: "smooth",
    });
  }, []);

  if (useFallback) {
    return (
      <ThreeHeroFallback
        onExploreCourses={onExploreCourses}
        onSelectGradeLevel={onSelectGradeLevel}
      />
    );
  }

  const handlePrimary = (index: number) => {
    if (index === 0) onExploreCourses();
    else onSelectGradeLevel(LEVELS[index].id);
  };

  const handleSecondary = () => scrollToLevel(1);

  const showCanvas = webgl === true && nearViewport;

  return (
    <section
      ref={sectionRef}
      aria-label="Hành trình qua các tầng mây: chọn lộ trình học theo cấp lớp"
      className="relative h-[240dvh] bg-background md:h-[300dvh]"
    >
      <div ref={stageRef} className="sticky top-16 h-[calc(100dvh-4rem)] w-full overflow-hidden bg-gradient-to-b from-primary-light via-background to-background">
        {showCanvas && (
          <div className="absolute inset-0" aria-hidden="true">
            <ThreeHeroCanvas progressRef={progressRef} quality={quality}>
              <FloatingCards progressRef={progressRef} quality={quality} />
            </ThreeHeroCanvas>
          </div>
        )}

        {/* Lớp phủ giúp chữ đạt AA trên nền trời pastel */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-background/85 via-background/55 to-transparent md:w-3/5"
        />

        <div className="sr-only">
          <h2>Ba tầng mây học tập</h2>
          <ul>
            {HERO_LEVEL_COPY.map((c) => (
              <li key={c.id}>
                {c.badge}: {c.headline.replace("\n", " ")}. {c.description}
              </li>
            ))}
          </ul>
        </div>

        {/* Copy theo tầng */}
        <div className="pointer-events-none relative z-10 user-container flex h-full items-center pb-24 sm:pb-16">
          <div className="relative w-full max-w-xl">
            {HERO_LEVEL_COPY.map((copy, i) => {
              const active = i === activeIndex;
              const Heading = i === 0 ? "h1" : "h2";
              return (
                <div
                  key={copy.id}
                  aria-hidden={!active}
                  className={cn(
                    "transition-all duration-500 ease-out",
                    i === 0 ? "relative" : "absolute inset-x-0 top-0",
                    active
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-3 opacity-0"
                  )}
                  style={{ visibility: active ? "visible" : "hidden" }}
                >
                  <Badge variant="default" size="md">
                    {copy.badge}
                  </Badge>
                  <Heading
                    className="font-display mt-4 whitespace-pre-line text-3xl leading-[1.12] font-semibold text-foreground sm:text-5xl lg:text-6xl"
                  >
                    {copy.headline}
                  </Heading>
                  <p className="mt-5 max-w-md text-base leading-relaxed text-foreground sm:text-lg">
                    {copy.description}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      size="lg"
                      tabIndex={active ? 0 : -1}
                      onClick={() => handlePrimary(i)}
                    >
                      {copy.primaryCta}
                    </Button>
                    {i === 0 && (
                      <Button
                        variant="outline"
                        size="lg"
                        tabIndex={active ? 0 : -1}
                        onClick={handleSecondary}
                      >
                        {copy.secondaryCta}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Journey rail */}
        <nav
          aria-label="Lộ trình các tầng mây"
          className="absolute bottom-4 left-[max(clamp(1rem,3vw,2rem),calc((100%-80rem)/2+2rem))] z-20 w-[min(21rem,calc(100%-2rem))] rounded-2xl border border-border bg-surface/90 p-2.5 shadow-sm backdrop-blur sm:bottom-6"
        >
          <ol className="flex items-stretch gap-1">
            {LEVELS.map((level, i) => {
              const active = i === activeIndex;
              return (
                <li key={level.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => scrollToLevel(i)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex w-full cursor-pointer flex-col items-start rounded-xl px-2.5 py-1.5 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary-light text-primary"
                        : "text-foreground hover:bg-primary-light/60"
                    )}
                  >
                    <span className="text-xs font-semibold tabular-nums">
                      {LEVEL_NUMBERS[i]}
                    </span>
                    <span className="text-sm font-medium">{level.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div
            aria-hidden="true"
            className="mt-2.5 h-1 overflow-hidden rounded-full bg-border"
          >
            <div
              ref={barRef}
              className="h-full origin-left rounded-full bg-primary"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        </nav>

        <a
          href="#home-main-content"
          onClick={(event) => {
            const target = document.getElementById("home-main-content");
            if (!target) return;
            event.preventDefault();
            target.focus({ preventScroll: true });
            target.scrollIntoView({ behavior: "smooth" });
          }}
          className="absolute top-3 right-4 z-20 rounded-xl bg-surface/95 px-3 py-2 text-sm font-medium text-primary shadow-xs hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-ring sm:right-8"
        >
          Bỏ qua giới thiệu
        </a>

        {/* Gợi ý cuộn */}
        <div
          ref={hintRef}
          aria-hidden="true"
          className="pointer-events-none absolute right-5 bottom-6 z-20 hidden rounded-full border border-border bg-surface/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-opacity duration-500 sm:block sm:right-24 lg:right-28"
        >
          Cuộn để bay lên tầng tiếp theo
        </div>
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-5 bottom-6 z-20 hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity duration-500 sm:block sm:right-24 lg:right-28",
            activeIndex === 2 ? "opacity-100" : "opacity-0"
          )}
        >
          Sẵn sàng? Chọn khóa học của bạn
        </div>
      </div>
    </section>
  );
}
