"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  InstancedBufferAttribute,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
} from "three";
import { LEVELS, PALETTE, type HeroQuality } from "./contract";

interface CloudFieldProps {
  quality: HeroQuality;
}

const VERT = /* glsl */ `
attribute vec3 aOffset;
attribute vec4 aParams; // size, alpha, phase, speed
attribute vec3 aColor;
uniform float uTime;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 c = aOffset;
  c.x += sin(uTime * aParams.w + aParams.z) * 2.5;
  c.y += cos(uTime * aParams.w * 0.7 + aParams.z) * 0.7;
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  mv.xy += position.xy * aParams.x;
  float d = -mv.z;
  float fade = smoothstep(4.0, 18.0, d) * (1.0 - smoothstep(80.0, 190.0, d));
  vAlpha = aParams.y * fade;
  vColor = aColor;
  vUv = uv;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 t = texture2D(uMap, vUv);
  float a = t.a * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor * mix(0.92, 1.0, t.r), a);
  #include <colorspace_fragment>
}
`;

/** PRNG có seed để bố cục mây ổn định giữa các lần render. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Độ cao "mặt sàn" của hành trình tại z (nội suy giữa các tầng). */
function levelYAt(z: number): number {
  for (let i = 0; i < LEVELS.length - 1; i++) {
    const a = LEVELS[i];
    const b = LEVELS[i + 1];
    if (z <= a.worldZ && z >= b.worldZ) {
      const t = (a.worldZ - z) / (a.worldZ - b.worldZ);
      return a.worldY + (b.worldY - a.worldY) * t;
    }
  }
  return z > LEVELS[0].worldZ ? LEVELS[0].worldY : LEVELS[LEVELS.length - 1].worldY;
}

function createPuffTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Vài blob chồng nhau cho cảm giác bông xốp thay vì một vòng tròn.
    const blobs: Array<[number, number, number]> = [
      [0.5, 0.52, 0.34],
      [0.34, 0.58, 0.24],
      [0.66, 0.58, 0.25],
      [0.5, 0.4, 0.22],
    ];
    for (const [bx, by, br] of blobs) {
      const g = ctx.createRadialGradient(bx * size, by * size, 0, bx * size, by * size, br * size);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(0.5, "rgba(255,255,255,0.4)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export default function CloudField({ quality }: CloudFieldProps) {
  const { cloudCount, tier } = quality;

  const { geometry, material, texture, count } = useMemo(() => {
    const puffsPer = tier === "low" ? 3 : 5;
    const clusters = Math.max(1, Math.floor(cloudCount));
    const total = clusters * puffsPer;
    const rnd = mulberry32(20240607);

    const offsets = new Float32Array(total * 3);
    const params = new Float32Array(total * 4);
    const colors = new Float32Array(total * 3);

    const zNear = LEVELS[0].worldZ + 10;
    const zFar = LEVELS[2].worldZ - 30;
    const white = new Color(PALETTE.white);
    const blue = new Color(PALETTE.blue100);
    const pink = new Color(PALETTE.pink100);
    const tint = new Color();

    let n = 0;
    for (let c = 0; c < clusters; c++) {
      const isFloor = rnd() < 0.5;
      let z: number;
      let x: number;
      let y: number;
      let baseSize: number;
      if (isFloor) {
        // Lớp mây sàn ngay dưới mỗi tầng.
        const lv = LEVELS[Math.floor(rnd() * LEVELS.length)];
        z = lv.worldZ + (rnd() - 0.5) * 70 + 5;
        z = Math.min(zNear, Math.max(zFar, z));
        x = (rnd() - 0.5) * 90;
        y = levelYAt(z) - 4 - rnd() * 4;
        baseSize = 16 + rnd() * 14;
      } else {
        z = zFar + rnd() * (zNear - zFar);
        const side = rnd() < 0.5 ? -1 : 1;
        x = side * (9 + rnd() * 38);
        y = levelYAt(z) + (rnd() - 0.4) * 18;
        baseSize = 10 + rnd() * 14;
      }

      // Xa hơn (z nhỏ hơn) thì nhạt hơn một chút; gần camera dùng mây to.
      const depthT = (zNear - z) / (zNear - zFar);
      const baseAlpha = 0.5 + rnd() * 0.35;
      const pinkMix = Math.max(0, (depthT - 0.6) / 0.4);
      const pick = rnd();
      tint.copy(white);
      if (pick < 0.35) tint.lerp(blue, 0.6 + rnd() * 0.4);
      tint.lerp(pink, pinkMix * (0.4 + rnd() * 0.5) * (pick > 0.3 ? 1 : 0.4));

      for (let p = 0; p < puffsPer; p++) {
        const size = baseSize * (0.6 + rnd() * 0.7);
        offsets[n * 3] = x + (rnd() - 0.5) * baseSize * 1.3;
        offsets[n * 3 + 1] = y + (rnd() - 0.4) * baseSize * 0.25;
        offsets[n * 3 + 2] = z + (rnd() - 0.5) * 6;
        params[n * 4] = size;
        params[n * 4 + 1] = baseAlpha * (0.75 + rnd() * 0.25);
        params[n * 4 + 2] = rnd() * Math.PI * 2;
        params[n * 4 + 3] = 0.06 + rnd() * 0.12;
        colors[n * 3] = tint.r;
        colors[n * 3 + 1] = tint.g;
        colors[n * 3 + 2] = tint.b;
        n++;
      }
    }

    const geometry = new PlaneGeometry(1, 1);
    geometry.setAttribute("aOffset", new InstancedBufferAttribute(offsets, 3));
    geometry.setAttribute("aParams", new InstancedBufferAttribute(params, 4));
    geometry.setAttribute("aColor", new InstancedBufferAttribute(colors, 3));

    const texture = createPuffTexture();
    const material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMap: { value: texture } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    return { geometry, material, texture, count: total };
  }, [cloudCount, tier]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
    [geometry, material, texture],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <instancedMesh
      key={count}
      args={[geometry, material, count]}
      frustumCulled={false}
      renderOrder={-20}
    />
  );
}
