"use client";

import { useEffect, useState } from "react";
import type { HeroQuality } from "./contract";

const QUALITY_TIERS: Record<HeroQuality["tier"], HeroQuality> = {
  high: { tier: "high", dpr: [1, 2], cloudCount: 46, enableDepthBlur: true, enableHtmlCards: true },
  medium: { tier: "medium", dpr: [1, 1.5], cloudCount: 30, enableDepthBlur: false, enableHtmlCards: true },
  low: { tier: "low", dpr: [1, 1], cloudCount: 16, enableDepthBlur: false, enableHtmlCards: false },
};

/** Người dùng bật "giảm chuyển động". SSR trả false, cập nhật sau mount. */
export function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** null = chưa kiểm tra; true/false sau khi thử tạo WebGL context. */
export function useWebGLSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    let ok = false;
    try {
      const canvas = document.createElement("canvas");
      const gl = (canvas.getContext("webgl2") ||
        canvas.getContext("webgl")) as WebGL2RenderingContext | WebGLRenderingContext | null;
      ok = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      ok = false;
    }
    setSupported(ok);
  }, []);
  return supported;
}

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

function computeQuality(): HeroQuality {
  const nav = navigator as NavigatorExtras;
  const width = window.innerWidth;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory; // GB, có thể undefined
  const dpr = window.devicePixelRatio || 1;
  const saveData = !!nav.connection?.saveData;
  const mobile = width < 768;

  if (saveData || cores <= 2 || (memory !== undefined && memory <= 2)) return QUALITY_TIERS.low;
  if (mobile) return cores >= 6 && (memory === undefined || memory >= 4) ? QUALITY_TIERS.medium : QUALITY_TIERS.low;
  if (cores >= 8 && (memory === undefined || memory >= 8) && dpr <= 2.5) return QUALITY_TIERS.high;
  return QUALITY_TIERS.medium;
}

/** SSR và render đầu: tier low (an toàn), nâng cấp sau mount. */
export function useHeroQuality(): HeroQuality {
  const [quality, setQuality] = useState<HeroQuality>(QUALITY_TIERS.low);
  useEffect(() => {
    setQuality(computeQuality());
  }, []);
  return quality;
}
