"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CINEMATIC_SCENES, VIDEO_ASSETS } from "./scenes-data";

export interface UseScrollVideoScrubberReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
  activeSceneIndex: number;
  uiProgress: number;
  isVideoReady: boolean;
  hasVideoError: boolean;
  prefersReducedMotion: boolean;
  isMobileViewport: boolean;
  handleVideoLoadedMetadata: () => void;
  handleVideoError: () => void;
  scrollToScene: (index: number) => void;
}

const clamp = (val: number, min: number, max: number) =>
  Math.min(max, Math.max(min, val));

// Slowed down 2x:
// - Maximum normalized progress speed: 0.17/sec (~6 seconds minimum to traverse 0 -> 1)
// - Damping responsiveness: 3.4 for buttery, unhurried camera motion
// - Wheel delta attenuation inside the cinematic hero: 0.45x with a strict 52px per-event cap
const MAX_PROGRESS_SPEED_PER_SEC = 0.17;
const DAMPING_RESPONSIVENESS = 3.4;
const SCENE_HYSTERESIS = 0.016;
const WHEEL_DAMPING_FACTOR = 0.45;
const MAX_WHEEL_STEP_PX = 52;

export function useScrollVideoScrubber(): UseScrollVideoScrubberReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [uiProgress, setUiProgress] = useState<number>(0);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [hasVideoError, setHasVideoError] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean>(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);

  const targetProgressRef = useRef<number>(0);
  const smoothProgressRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const activeSceneRef = useRef<number>(0);
  const lastUiProgressRef = useRef<number>(0);
  const videoDurationRef = useRef<number>(VIDEO_ASSETS.durationSeconds);
  const isTouchUnlockedRef = useRef<boolean>(false);

  // Detect reduced motion and mobile viewport
  useEffect(() => {
    if (typeof window === "undefined") return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setPrefersReducedMotion(motionQuery.matches);
    updateMotion();

    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    updateViewport();

    motionQuery.addEventListener("change", updateMotion);
    window.addEventListener("resize", updateViewport, { passive: true });

    return () => {
      motionQuery.removeEventListener("change", updateMotion);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  // Resolve scene index from normalized progress [0..1] with boundary hysteresis
  const resolveSceneIndex = useCallback(
    (progress: number, currentIndex: number): number => {
      let rawIndex = 0;
      for (let i = CINEMATIC_SCENES.length - 1; i >= 0; i--) {
        if (progress >= CINEMATIC_SCENES[i].startProgress) {
          rawIndex = i;
          break;
        }
      }

      if (rawIndex === currentIndex) return currentIndex;

      if (rawIndex > currentIndex) {
        const threshold = CINEMATIC_SCENES[rawIndex].startProgress;
        if (progress < threshold + SCENE_HYSTERESIS && progress < 0.985) {
          return currentIndex;
        }
      }

      if (rawIndex < currentIndex) {
        const threshold = CINEMATIC_SCENES[currentIndex].startProgress;
        if (progress > threshold - SCENE_HYSTERESIS && progress > 0.015) {
          return currentIndex;
        }
      }

      return rawIndex;
    },
    []
  );

  // Apply authoritative smoothed progress to video element, DOM progress bar, and React scene state
  const applyProgress = useCallback(
    (progress: number) => {
      const normalized = clamp(progress, 0, 1);

      // 1. Direct DOM progress bar update
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${normalized.toFixed(4)})`;
      }

      // 2. Sync HTML5 video currentTime safely from the same smoothed progress source
      const video = videoRef.current;
      if (video && video.readyState >= 1 && !video.seeking) {
        const duration =
          Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : videoDurationRef.current;
        const targetTime = clamp(
          normalized * duration,
          0,
          Math.max(0, duration - 0.04)
        );

        if (Math.abs(video.currentTime - targetTime) > 0.015) {
          try {
            video.currentTime = targetTime;
          } catch {
            // Ignore transient DOMException during rapid seeks
          }
        }
      }

      // 3. Update active scene state using hysteresis-protected resolver
      const nextScene = resolveSceneIndex(normalized, activeSceneRef.current);
      if (nextScene !== activeSceneRef.current) {
        activeSceneRef.current = nextScene;
        setActiveSceneIndex(nextScene);
      }

      // 4. Throttled UI progress update
      if (
        Math.abs(normalized - lastUiProgressRef.current) >= 0.01 ||
        normalized === 0 ||
        normalized === 1
      ) {
        lastUiProgressRef.current = normalized;
        setUiProgress(normalized);
      }
    },
    [resolveSceneIndex]
  );

  // Velocity-capped, time-delta damped animation loop (2x slower & smoother)
  const startAnimationLoop = useCallback(() => {
    if (rafIdRef.current !== null) return;

    lastFrameTimeRef.current = performance.now();

    const tick = (now: number) => {
      const prevTime = lastFrameTimeRef.current ?? now;
      const dt = clamp((now - prevTime) / 1000, 0.004, 0.05);
      lastFrameTimeRef.current = now;

      const target = targetProgressRef.current;
      const current = smoothProgressRef.current;
      const diff = target - current;

      if (Math.abs(diff) < 0.0005) {
        smoothProgressRef.current = target;
        applyProgress(target);
        rafIdRef.current = null;
        lastFrameTimeRef.current = null;
        return;
      }

      const desiredStep = diff * (1 - Math.exp(-DAMPING_RESPONSIVENESS * dt));
      const maxStep = MAX_PROGRESS_SPEED_PER_SEC * dt;
      const boundedStep =
        Math.sign(desiredStep) * Math.min(Math.abs(desiredStep), maxStep);

      const next = clamp(current + boundedStep, 0, 1);
      smoothProgressRef.current = next;
      applyProgress(next);

      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    rafIdRef.current = window.requestAnimationFrame(tick);
  }, [applyProgress]);

  // Compute target progress from scroll position
  const computeScrollProgress = useCallback(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const rect = container.getBoundingClientRect();
    const viewportHeight = Math.max(window.innerHeight, 1);
    const totalScrollable = Math.max(rect.height - viewportHeight, 1);

    const scrolledDistance = -rect.top;
    const rawProgress = clamp(scrolledDistance / totalScrollable, 0, 1);

    targetProgressRef.current = rawProgress;
    startAnimationLoop();
  }, [startAnimationLoop]);

  // Attach scroll, resize, and wheel-speed limiter inside the cinematic section
  useEffect(() => {
    if (typeof window === "undefined" || prefersReducedMotion) return;

    computeScrollProgress();

    const unlockVideoOnInteraction = () => {
      if (!isTouchUnlockedRef.current && videoRef.current) {
        isTouchUnlockedRef.current = true;
        const vid = videoRef.current;
        if (vid.paused && vid.readyState >= 1) {
          const playPromise = vid.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                vid.pause();
              })
              .catch(() => {
                // Ignore autoplay restriction
              });
          }
        }
      }
    };

    const onScroll = () => {
      unlockVideoOnInteraction();
      computeScrollProgress();
    };

    // Intercept overly fast wheel/trackpad bursts while inside the sticky cinematic hero
    // so the user cannot accidentally fling past all 4 scenes in a single wheel spin
    const onWheel = (e: WheelEvent) => {
      // Do not interfere with pinch-zoom
      if (e.ctrlKey || e.metaKey) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      const totalScrollable = Math.max(rect.height - viewportHeight, 1);
      const scrolledDistance = -rect.top;
      const rawProgress = scrolledDistance / totalScrollable;

      const isInsideHero = rect.top <= 4 && rect.bottom >= viewportHeight - 4;
      if (!isInsideHero) return;

      // Allow natural exit at the very top (scrolling up) or very bottom (scrolling down once video finished)
      if (rawProgress <= 0.001 && e.deltaY < 0) return;
      if (
        rawProgress >= 0.995 &&
        smoothProgressRef.current >= 0.96 &&
        e.deltaY > 0
      ) {
        return;
      }

      e.preventDefault();
      unlockVideoOnInteraction();

      // Normalize wheel delta across pixel/line/page modes
      const rawDeltaY =
        e.deltaMode === 1
          ? e.deltaY * 32
          : e.deltaMode === 2
          ? e.deltaY * viewportHeight
          : e.deltaY;

      // Cut scroll speed by >2x and cap maximum step per wheel event
      const dampedDelta = clamp(
        rawDeltaY * WHEEL_DAMPING_FACTOR,
        -MAX_WHEEL_STEP_PX,
        MAX_WHEEL_STEP_PX
      );

      // Also prevent scroll position from running too far ahead of smoothed video progress (max 14% lead)
      const currentSmooth = smoothProgressRef.current;
      const maxAllowedProgress = clamp(currentSmooth + 0.14, 0, 1);
      const minAllowedProgress = clamp(currentSmooth - 0.14, 0, 1);

      const containerTopDoc = window.scrollY + rect.top;
      const proposedScrollY = window.scrollY + dampedDelta;
      const minScrollY = containerTopDoc + minAllowedProgress * totalScrollable;
      const maxScrollY = containerTopDoc + maxAllowedProgress * totalScrollable;

      const nextScrollY = clamp(proposedScrollY, minScrollY, maxScrollY);
      window.scrollTo({
        top: Math.max(0, nextScrollY),
        behavior: "instant" as ScrollBehavior,
      });
      computeScrollProgress();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", computeScrollProgress, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", computeScrollProgress);
      window.removeEventListener("wheel", onWheel);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [computeScrollProgress, prefersReducedMotion]);

  // Handle video metadata ready
  const handleVideoLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Number.isFinite(video.duration) && video.duration > 0) {
      videoDurationRef.current = video.duration;
    }

    video.pause();
    setIsVideoReady(true);
    setHasVideoError(false);

    applyProgress(smoothProgressRef.current);
  }, [applyProgress]);

  const handleVideoError = useCallback(() => {
    setHasVideoError(true);
    setIsVideoReady(false);
  }, []);

  // Programmatic scroll to a specific scene
  const scrollToScene = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const targetScene =
      CINEMATIC_SCENES[clamp(index, 0, CINEMATIC_SCENES.length - 1)];
    if (!targetScene) return;

    const rect = container.getBoundingClientRect();
    const containerTopDocument = window.scrollY + rect.top;
    const viewportHeight = Math.max(window.innerHeight, 1);
    const totalScrollable = Math.max(rect.height - viewportHeight, 1);

    const targetNorm = clamp(
      targetScene.startProgress +
        (targetScene.endProgress - targetScene.startProgress) * 0.25,
      0,
      0.98
    );

    const targetScrollY = containerTopDocument + targetNorm * totalScrollable;

    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: "smooth",
    });
  }, []);

  return {
    containerRef,
    videoRef,
    progressBarRef,
    activeSceneIndex,
    uiProgress,
    isVideoReady,
    hasVideoError,
    prefersReducedMotion,
    isMobileViewport,
    handleVideoLoadedMetadata,
    handleVideoError,
    scrollToScene,
  };
}
