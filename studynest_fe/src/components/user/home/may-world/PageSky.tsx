"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { clamp01, type HeroProgressRef } from "../three-hero/contract";
import { useHeroQuality, useReducedMotionPreference, useWebGLSupport } from "../three-hero/useHeroQuality";

const HERO_SELECTOR =
  'section[aria-label^="Hành trình qua các tầng mây"], section[aria-label^="Giới thiệu hành trình học tập Mây Mây"]';

const ThreeHeroCanvas = dynamic(() => import("../three-hero/ThreeHeroCanvas"), { ssr: false });

/**
 * Lớp 3D phía sau cả trang chủ: bầu trời + biển mây, camera bay lên cao dần khi cuộn
 * (xanh bình minh → tím nhạt → hồng hoàng hôn). Tái dùng hạ tầng của hero three.js cũ.
 */
export default function PageSky({ animated = true }: { animated?: boolean }) {
  return animated ? <AnimatedSky /> : (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-primary-pastel/65 via-background to-surface-muted"
    />
  );
}

function AnimatedSky() {
  const quality = useHeroQuality();
  const webgl = useWebGLSupport();
  const reduced = useReducedMotionPreference();
  const progressRef: HeroProgressRef = useRef(0);
  const enabled = webgl === true && !reduced;
  // Hero three.js có canvas riêng: chỉ bật bầu trời của cả trang khi hero đã cuộn khuất.
  const [heroInView, setHeroInView] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const hero = document.querySelector<HTMLElement>(HERO_SELECTOR);
    if (!hero) {
      setHeroInView(false);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setHeroInView(entry.isIntersecting), { rootMargin: "20% 0px 20% 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      progressRef.current = range > 0 ? clamp01(window.scrollY / range) : 0;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    document.documentElement.dataset.sky3d = "on";
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      delete document.documentElement.dataset.sky3d;
    };
  }, [enabled]);

  if (!enabled || heroInView) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <ThreeHeroCanvas progressRef={progressRef} quality={quality} />
    </div>
  );
}
