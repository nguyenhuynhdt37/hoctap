/**
 * Hợp đồng chung cho Three.js hero "Hành trình qua các tầng mây".
 * KHÔNG sửa file này nếu không báo lại — 4 module cùng phụ thuộc vào nó.
 *
 * Ý tưởng: người dùng cuộn trang (sticky stage), camera bay xuyên 3 tầng mây:
 * Tiểu học (progress 0) → THCS (0.5) → THPT (1). `progressRef.current` ∈ [0,1].
 */

export type LevelId = "primary" | "middle" | "high";

/** Giá trị cuộn đã làm mượt, ghi bởi ScrollThreeHero, đọc trong useFrame (KHÔNG dùng React state). */
export type HeroProgressRef = { current: number };

export interface HeroLevel {
  id: LevelId;
  index: 0 | 1 | 2;
  label: string; // "Tiểu học"
  grades: string; // "Lớp 1–5"
  /** progress tại đó camera dừng đúng tầng này */
  stop: number;
  /** tọa độ thế giới của tầng (camera nhìn về -Z) */
  worldY: number;
  worldZ: number;
}

export const LEVELS: readonly HeroLevel[] = [
  { id: "primary", index: 0, label: "Tiểu học", grades: "Lớp 1–5", stop: 0, worldY: 0, worldZ: 0 },
  { id: "middle", index: 1, label: "THCS", grades: "Lớp 6–9", stop: 0.5, worldY: 14, worldZ: -70 },
  { id: "high", index: 2, label: "THPT", grades: "Lớp 10–12", stop: 1, worldY: 28, worldZ: -140 },
] as const;

/** Camera cách tầng hiện tại bao xa theo +Z, và độ cao so với tầng. */
export const CAMERA_OFFSET = { z: 22, y: 1.5 } as const;
export const CAMERA_FOV = 42;

/** Nội dung 3D/DOM của mỗi tầng nằm trong khoảng này quanh worldZ (so với camera dừng). */
export const LEVEL_DEPTH_RANGE = { near: 6, far: -40 } as const;

/** Màu theo token Cloudy Blue (globals.css). Dùng cho three.js vì không đọc được CSS var trực tiếp. */
export const PALETTE = {
  white: "#FFFFFF",
  background: "#F6FAFF",
  surfaceWarm: "#FFF9F6",
  blue100: "#E8F2FA",
  blue200: "#BFD7ED",
  blue600: "#356FA7",
  pink100: "#FCE8EF",
  pink200: "#F7C9D9",
  lavender100: "#E3D5F5",
  vanilla100: "#F8E9C9",
  foreground: "#3D4A5A",
  mutedForeground: "#6F7C8C",
} as const;

/** Màu bầu trời [đỉnh, giữa, đáy] cho từng tầng. Cảnh được nội suy giữa các tầng theo progress. */
export const SKY_BY_LEVEL: Record<LevelId, readonly [string, string, string]> = {
  primary: ["#BFD7ED", "#E8F2FA", "#F6FAFF"],
  middle: ["#E3D5F5", "#E8F2FA", "#F6FAFF"],
  high: ["#F7C9D9", "#FCE8EF", "#FFF9F6"],
};

/** Mức chất lượng, do useHeroQuality quyết định, truyền xuống Canvas và cards. */
export interface HeroQuality {
  tier: "high" | "medium" | "low";
  dpr: [number, number];
  cloudCount: number; // tổng số cụm mây (toàn hành trình)
  enableDepthBlur: boolean;
  enableHtmlCards: boolean;
}

export interface HeroLevelCopy {
  id: LevelId;
  badge: string;
  headline: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
}

/** Props các module công khai (mỗi agent export default đúng chữ ký này). */
export interface ThreeHeroCanvasProps {
  progressRef: HeroProgressRef;
  quality: HeroQuality;
}

export interface FloatingCardsProps {
  progressRef: HeroProgressRef;
  quality: HeroQuality;
}

export interface ScrollThreeHeroProps {
  onExploreCourses: () => void;
  onSelectGradeLevel: (level: "primary" | "middle" | "high") => void;
}

export interface ThreeHeroFallbackProps {
  onExploreCourses: () => void;
  onSelectGradeLevel: (level: "primary" | "middle" | "high") => void;
}

/** Nội suy tuyến tính tiện ích dùng chung. */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Vị trí camera (x,y,z) theo progress ∈ [0,1], đi qua 3 tầng bằng smoothstep giữa các stop. */
export function cameraPositionAt(progress: number): { x: number; y: number; z: number } {
  const p = clamp01(progress);
  const seg = p < 0.5 ? 0 : 1;
  const from = LEVELS[seg];
  const to = LEVELS[seg + 1];
  const t = clamp01((p - from.stop) / (to.stop - from.stop));
  const e = t * t * (3 - 2 * t);
  return {
    x: 0,
    y: from.worldY + (to.worldY - from.worldY) * e + CAMERA_OFFSET.y,
    z: from.worldZ + (to.worldZ - from.worldZ) * e + CAMERA_OFFSET.z,
  };
}

/** Index tầng đang active (gần nhất) theo progress. */
export function activeLevelIndex(progress: number): 0 | 1 | 2 {
  return progress < 0.25 ? 0 : progress < 0.75 ? 1 : 2;
}
