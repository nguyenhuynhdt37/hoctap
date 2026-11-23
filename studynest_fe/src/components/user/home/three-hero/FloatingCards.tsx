"use client";

import * as React from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import {
  LEVELS,
  LEVEL_DEPTH_RANGE,
  clamp01,
  type FloatingCardsProps,
  type HeroProgressRef,
  type LevelId,
} from "./contract";
import { AiBubble, Chip, LessonCard, QuizCard } from "./HeroCardContents";

interface Pose {
  x: number;
  y: number;
  z: number; // offset so với worldZ, nằm trong LEVEL_DEPTH_RANGE
  rotY: number; // độ
  rotX: number;
  rotZ: number;
}

interface CardSpec {
  key: string;
  pose: Pose;
  render: () => React.ReactNode;
}

const DEG = Math.PI / 180;
const DISTANCE_FACTOR = 10; // 1 đơn vị thế giới ≈ 40px

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Hiện dần khi camera tới gần (a<0), mờ dần sau khi đi qua (a>0). */
function levelPresence(progress: number, stop: number): { opacity: number; scale: number } {
  const a = progress - stop;
  const fadeIn = a < 0 ? smooth(clamp01((a + 0.3) / 0.2)) : 1;
  const fadeOut = a > 0 ? 1 - smooth(clamp01((a - 0.07) / 0.17)) : 1;
  const opacity = fadeIn * fadeOut;
  const scale = a < 0 ? 0.82 + 0.18 * fadeIn : 1 + 0.14 * (1 - fadeOut);
  return { opacity, scale };
}

const CARDS: Record<LevelId, readonly CardSpec[]> = {
  primary: [
    {
      key: "lesson",
      pose: { x: 7.8, y: 3.4, z: -2, rotY: -14, rotX: 3, rotZ: 1.5 },
      render: () => (
        <LessonCard title="Phép cộng trong phạm vi 100" meta="Toán lớp 2 · 12 phút" progress={64} />
      ),
    },
    {
      key: "quiz",
      pose: { x: 6.4, y: -1.9, z: -1, rotY: -11, rotX: -2, rotZ: -1.5 },
      render: () => <QuizCard question="7 × 8 bằng bao nhiêu?" options={["54", "56", "64"]} correctIndex={1} />,
    },
    {
      key: "ai",
      pose: { x: 12.2, y: 0.4, z: -9, rotY: -17, rotX: 2, rotZ: 2 },
      render: () => <AiBubble>Trợ lý AI: Bạn thử tách 7 × 8 = 7 × 10 − 7 × 2 nhé!</AiBubble>,
    },
    {
      key: "formula",
      pose: { x: 10, y: 6.4, z: -14, rotY: -15, rotX: -3, rotZ: -2 },
      render: () => (
        <Chip tone="lavender" display>
          f(x) = ax² + bx + c
        </Chip>
      ),
    },
    {
      key: "free",
      pose: { x: 3.6, y: 5.2, z: 4, rotY: -9, rotX: 2, rotZ: 2.5 },
      render: () => <Chip tone="pink">Học thử miễn phí</Chip>,
    },
  ],
  middle: [
    {
      key: "lesson",
      pose: { x: 7.6, y: 3.2, z: -3, rotY: -13, rotX: 2, rotZ: -1.5 },
      render: () => (
        <LessonCard title="Nghị luận xã hội – Bài 11" meta="Ngữ văn lớp 9 · 20 phút" progress={42} />
      ),
    },
    {
      key: "quiz",
      pose: { x: 6.4, y: -2.0, z: -1, rotY: -12, rotX: -2, rotZ: 1.5 },
      render: () => (
        <QuizCard question="Nghiệm của x² − 5x + 6 = 0?" options={["1 và 6", "2 và 3", "−2 và −3"]} correctIndex={1} />
      ),
    },
    {
      key: "ai",
      pose: { x: 12.2, y: 0.4, z: -10, rotY: -16, rotX: 3, rotZ: -2 },
      render: () => <AiBubble>Trợ lý AI: Hãy phân tích Δ = b² − 4ac trước, rồi tìm hai nghiệm nhé!</AiBubble>,
    },
    {
      key: "exam",
      pose: { x: 10.2, y: 6.2, z: -13, rotY: -15, rotX: -2, rotZ: 2 },
      render: () => <Chip tone="vanilla">Ôn luyện vào lớp 10</Chip>,
    },
    {
      key: "python",
      pose: { x: 3.4, y: 5.4, z: 4, rotY: -9, rotX: 2, rotZ: -2.5 },
      render: () => <Chip tone="primary">Python cơ bản</Chip>,
    },
  ],
  high: [
    {
      key: "lesson",
      pose: { x: 7.8, y: 3.4, z: -2, rotY: -14, rotX: 2, rotZ: 1.5 },
      render: () => (
        <LessonCard title="Luyện đề thi tốt nghiệp THPT" meta="Toán 12 · 45 phút" progress={78} />
      ),
    },
    {
      key: "quiz",
      pose: { x: 6.4, y: -1.9, z: -1, rotY: -11, rotX: -2, rotZ: -1.5 },
      render: () => (
        <QuizCard question="Đạo hàm của sin x là?" options={["−cos x", "cos x", "tan x"]} correctIndex={1} />
      ),
    },
    {
      key: "ai",
      pose: { x: 12.2, y: 0.4, z: -9, rotY: -17, rotX: 2, rotZ: 2 },
      render: () => <AiBubble>Trợ lý AI: Hãy lập bảng biến thiên rồi xét dấu đạo hàm nhé!</AiBubble>,
    },
    {
      key: "integral",
      pose: { x: 10, y: 6.4, z: -14, rotY: -15, rotX: -3, rotZ: -2 },
      render: () => (
        <Chip tone="lavender" display>
          ∫ x² dx = x³/3 + C
        </Chip>
      ),
    },
    {
      key: "uni",
      pose: { x: 3.6, y: 5.2, z: 4, rotY: -9, rotX: 2, rotZ: 2.5 },
      render: () => <Chip tone="pink">Ôn thi đại học</Chip>,
    },
  ],
};

interface FloatingCardProps {
  spec: CardSpec;
  index: number;
  levelIndex: 0 | 1 | 2;
  progressRef: HeroProgressRef;
  xScale: number;
  reducedMotion: React.RefObject<boolean>;
}

function FloatingCard({ spec, index, levelIndex, progressRef, xScale, reducedMotion }: FloatingCardProps) {
  const level = LEVELS[levelIndex];
  const { pose } = spec;
  const groupRef = React.useRef<Group>(null);
  const domRef = React.useRef<HTMLDivElement>(null);
  const shown = React.useRef<boolean | null>(null);
  const phase = index * 1.7 + levelIndex * 0.9;
  const dz = Math.min(LEVEL_DEPTH_RANGE.near, Math.max(LEVEL_DEPTH_RANGE.far, pose.z));

  useFrame((state) => {
    const group = groupRef.current;
    const el = domRef.current;
    if (!group || !el) return;

    const { opacity, scale } = levelPresence(progressRef.current, level.stop);
    const visible = opacity > 0.01;
    if (shown.current !== visible) {
      shown.current = visible;
      el.style.display = visible ? "" : "none";
      group.visible = visible;
    }
    if (!visible) return;

    el.style.opacity = opacity.toFixed(3);
    el.style.transform = `scale(${scale.toFixed(3)})`;

    const t = reducedMotion.current ? 0 : state.clock.elapsedTime;
    group.position.set(
      pose.x * xScale + Math.cos(t * 0.35 + phase) * 0.18,
      level.worldY + pose.y + Math.sin(t * 0.6 + phase) * 0.38,
      level.worldZ + dz,
    );
    group.rotation.set(
      pose.rotX * DEG + Math.sin(t * 0.45 + phase) * 0.025,
      pose.rotY * xScale * DEG + Math.sin(t * 0.38 + phase * 1.3) * 0.05,
      pose.rotZ * DEG + Math.sin(t * 0.5 + phase * 0.7) * 0.02,
    );
  });

  return (
    <group ref={groupRef} visible={false} position={[pose.x * xScale, level.worldY + pose.y, level.worldZ + dz]}>
      <Html
        transform
        occlude={false}
        center
        distanceFactor={DISTANCE_FACTOR}
        pointerEvents="none"
        zIndexRange={[10, 0]}
      >
        <div
          ref={domRef}
          aria-hidden="true"
          className="pointer-events-none select-none will-change-transform"
          style={{ display: "none", opacity: 0 }}
        >
          {spec.render()}
        </div>
      </Html>
    </group>
  );
}

export default function FloatingCards({ progressRef, quality }: FloatingCardsProps) {
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const reducedMotion = React.useRef(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotion.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Màn hẹp: kéo cụm card về gần trục giữa để không tràn khung.
  const xScale = Math.min(1, Math.max(0.42, aspect / 1.78));
  const perLevel = quality.enableHtmlCards ? 5 : 2;

  return (
    <group>
      {LEVELS.map((level) =>
        CARDS[level.id].slice(0, perLevel).map((spec, i) => (
          <FloatingCard
            key={`${level.id}-${spec.key}`}
            spec={spec}
            index={i}
            levelIndex={level.index}
            progressRef={progressRef}
            xScale={xScale}
            reducedMotion={reducedMotion}
          />
        )),
      )}
    </group>
  );
}
