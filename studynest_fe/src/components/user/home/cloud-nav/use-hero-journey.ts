"use client";

import { useMotionValue } from "framer-motion";
import { useEffect, useState } from "react";
import { activeLevelIndex, clamp01 } from "../three-hero/contract";

const JOURNEY_SELECTOR = 'section[aria-label^="Hành trình qua các tầng mây"]';
const FALLBACK_SELECTOR =
  'section[aria-label^="Giới thiệu hành trình học tập Mây Mây"]';

function getJourneyRange(section: HTMLElement) {
  return Math.max(0, section.offsetHeight - window.innerHeight);
}

export function scrollToCloudLevel(stop: number, reducedMotion: boolean) {
  const hero = document.querySelector<HTMLElement>(JOURNEY_SELECTOR);
  if (!hero) return;

  window.scrollTo({
    top: window.scrollY + hero.getBoundingClientRect().top + getJourneyRange(hero) * stop,
    behavior: reducedMotion ? "instant" : "smooth",
  });
}

export function useHeroJourney() {
  const progress = useMotionValue(0);
  const [status, setStatus] = useState({
    isVisible: false,
    hasLevels: false,
    activeIndex: 0,
  });

  useEffect(() => {
    let hero: HTMLElement | null = null;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const viewportHeight = window.innerHeight;
      const rect = hero?.getBoundingClientRect();
      const isVisible = !!rect && rect.top < viewportHeight && rect.bottom > 0;
      const range = hero?.matches(JOURNEY_SELECTOR) ? getJourneyRange(hero) : 0;
      const nextProgress = rect && range > 0 ? clamp01(-rect.top / range) : 0;
      const hasLevels = range > 0;
      const activeIndex = activeLevelIndex(nextProgress);

      progress.set(nextProgress);
      setStatus((previous) =>
        previous.isVisible === isVisible &&
        previous.hasLevels === hasLevels &&
        previous.activeIndex === activeIndex
          ? previous
          : { isVisible, hasLevels, activeIndex },
      );
    };

    const scheduleMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    const sizeObserver = new ResizeObserver(scheduleMeasure);
    const findHero = () => {
      const next = document.querySelector<HTMLElement>(
        `${JOURNEY_SELECTOR}, ${FALLBACK_SELECTOR}`,
      );
      if (next !== hero) {
        sizeObserver.disconnect();
        hero = next;
        if (hero) sizeObserver.observe(hero);
      }
      scheduleMeasure();
    };

    // WebGL and reduced-motion preferences can swap the scrolling and static heroes.
    const main = document.getElementById("home-main-content")?.parentElement;
    const heroObserver = new MutationObserver(findHero);
    if (main) heroObserver.observe(main, { childList: true });

    findHero();
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      heroObserver.disconnect();
      sizeObserver.disconnect();
    };
  }, [progress]);

  return { ...status, progress };
}
