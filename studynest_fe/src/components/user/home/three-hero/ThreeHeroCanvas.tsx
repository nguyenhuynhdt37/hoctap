"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, MathUtils, NoToneMapping, type Fog } from "three";
import {
  CAMERA_FOV,
  PALETTE,
  cameraPositionAt,
  clamp01,
  type HeroProgressRef,
  type HeroQuality,
  type ThreeHeroCanvasProps,
} from "./contract";
import SkyGradient, { sampleSky } from "./SkyGradient";
import CloudField from "./CloudField";

interface RigProps {
  progressRef: HeroProgressRef;
  quality: HeroQuality;
}

function CameraRig({ progressRef, quality }: RigProps) {
  const smoothed = useRef(progressRef.current);
  const sway = quality.tier === "low" ? 0.25 : 1;

  useFrame(({ camera, pointer }, delta) => {
    smoothed.current = MathUtils.damp(smoothed.current, clamp01(progressRef.current), 6, delta);
    const p = smoothed.current;
    const pos = cameraPositionAt(p);
    const ahead = cameraPositionAt(Math.min(1, p + 0.05));

    const px = pointer.x * 0.9 * sway;
    const py = pointer.y * 0.5 * sway;
    camera.position.x = MathUtils.damp(camera.position.x, pos.x + px, 3, delta);
    camera.position.y = MathUtils.damp(camera.position.y, pos.y + py, 3, delta);
    camera.position.z = pos.z;
    camera.lookAt(pos.x + px * 0.4, ahead.y + 0.5 + py * 0.3, ahead.z - 25);
  });
  return null;
}

function SceneFog({ progressRef }: { progressRef: HeroProgressRef }) {
  const fogRef = useRef<Fog>(null);
  const stops = useMemo<[Color, Color, Color]>(() => [new Color(), new Color(), new Color()], []);
  useFrame(() => {
    if (!fogRef.current) return;
    sampleSky(progressRef.current, stops);
    fogRef.current.color.copy(stops[1]);
  });
  return <fog ref={fogRef} attach="fog" args={[PALETTE.blue100, 50, 220]} />;
}

export default function ThreeHeroCanvas({
  progressRef,
  quality,
  children,
}: ThreeHeroCanvasProps & { children?: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // r3f tự dispose renderer khi unmount. KHÔNG tự loseContext ở đây: StrictMode (dev)
  // mount→unmount→mount sẽ làm hỏng context đang dùng ("reading 'precision'").
  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
      <Canvas
        dpr={quality.dpr}
        frameloop="always"
        camera={{ fov: CAMERA_FOV, near: 0.1, far: 700, position: [0, 1.5, 22] }}
        gl={{
          antialias: quality.tier !== "low",
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: NoToneMapping,
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <SceneFog progressRef={progressRef} />
        <ambientLight intensity={1.1} color={PALETTE.white} />
        <directionalLight position={[12, 24, 10]} intensity={1.1} color={PALETTE.vanilla100} />
        <CameraRig progressRef={progressRef} quality={quality} />
        <SkyGradient progressRef={progressRef} />
        <CloudField quality={quality} />
        {children}
      </Canvas>
    </div>
  );
}
