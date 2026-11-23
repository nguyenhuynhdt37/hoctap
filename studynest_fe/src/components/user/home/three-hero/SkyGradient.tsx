"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  type Group,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  BackSide,
} from "three";
import {
  LEVELS,
  PALETTE,
  SKY_BY_LEVEL,
  clamp01,
  type HeroProgressRef,
} from "./contract";

type SkyStops = [Color, Color, Color];

const LEVEL_COLORS: SkyStops[] = LEVELS.map(
  (l) => SKY_BY_LEVEL[l.id].map((h) => new Color(h)) as SkyStops,
);

/** Nội suy 3 màu bầu trời [đỉnh, giữa, đáy] theo progress (ghi vào `out`). */
export function sampleSky(progress: number, out: SkyStops): SkyStops {
  const p = clamp01(progress);
  const seg = p < 0.5 ? 0 : 1;
  const from = LEVELS[seg];
  const to = LEVELS[seg + 1];
  const t = clamp01((p - from.stop) / (to.stop - from.stop));
  const e = t * t * (3 - 2 * t);
  for (let i = 0; i < 3; i++) {
    out[i].lerpColors(LEVEL_COLORS[seg][i], LEVEL_COLORS[seg + 1][i], e);
  }
  return out;
}

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBottom;
varying vec3 vDir;
void main() {
  float h = clamp(normalize(vDir).y * 1.7 + 0.5, 0.0, 1.0);
  vec3 col = h < 0.5
    ? mix(uBottom, uMid, smoothstep(0.0, 0.5, h))
    : mix(uMid, uTop, smoothstep(0.5, 1.0, h));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

function createGlowTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.55)");
    g.addColorStop(0.6, "rgba(255,255,255,0.14)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

interface SkyGradientProps {
  progressRef: HeroProgressRef;
}

export default function SkyGradient({ progressRef }: SkyGradientProps) {
  const groupRef = useRef<Group>(null);
  const stops = useMemo<SkyStops>(() => [new Color(), new Color(), new Color()], []);

  const { geometry, material, glow } = useMemo(() => {
    const geometry = new SphereGeometry(500, 24, 16);
    const material = new ShaderMaterial({
      uniforms: {
        uTop: { value: new Color(SKY_BY_LEVEL.primary[0]) },
        uMid: { value: new Color(SKY_BY_LEVEL.primary[1]) },
        uBottom: { value: new Color(SKY_BY_LEVEL.primary[2]) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    });
    return { geometry, material, glow: createGlowTexture() };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      glow.dispose();
    },
    [geometry, material, glow],
  );

  useFrame(({ camera }) => {
    sampleSky(progressRef.current, stops);
    material.uniforms.uTop.value.copy(stops[0]);
    material.uniforms.uMid.value.copy(stops[1]);
    material.uniforms.uBottom.value.copy(stops[2]);
    groupRef.current?.position.copy(camera.position);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={material} renderOrder={-100} frustumCulled={false} />
      <sprite position={[26, 16, -90]} scale={[110, 110, 1]} renderOrder={-90}>
        <spriteMaterial
          map={glow}
          color={PALETTE.vanilla100}
          transparent
          opacity={0.75}
          depthWrite={false}
          depthTest={false}
          fog={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
