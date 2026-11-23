"use client";

import { Badge } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { coinCopy } from "@/lib/learning-hub/shop-logic";
import type { Equipment, Rarity, ShopItem } from "@/lib/learning-hub/shop-types";
import { cn } from "@/lib/utils";
import { useId, useState, type ReactNode } from "react";

const blue = "var(--color-primary)";
const sky = "var(--color-primary-pastel)";
const white = "var(--color-surface)";
const pink = "var(--color-secondary-pastel)";
const rose = "var(--color-secondary-foreground)";
const lilac = "var(--color-accent)";
const plum = "var(--color-accent-foreground)";
const cream = "var(--color-accent-vanilla)";
const gold = "var(--color-accent-vanilla-foreground)";
const sage = "var(--color-success-border)";
const green = "var(--color-success-foreground)";
const navy = "var(--color-primary-active)";

const rarityStyles = {
  common: { label: "Phổ thông", variant: "info" },
  rare: { label: "Hiếm", variant: "secondary" },
  epic: { label: "Sử thi", variant: "lavender" },
  legendary: { label: "Huyền thoại", variant: "vanilla" },
} as const;

function cloud(fill: string, outline: string, transform?: string) {
  return <path transform={transform} d="M14 74a7 7 0 0 1-1-14 10 10 0 0 1 18-2 8 8 0 0 1 13 6 5 5 0 0 1-5 10Z" fill={fill} stroke={outline} strokeWidth="1.7" />;
}

function leaves(color: string) {
  return (
    <g fill={color}>
      <path d="M48 89C26 86 14 72 11 50M52 89c22-3 34-17 37-39" fill="none" stroke={color} strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <ellipse cx={11 + i * i * 2} cy={49 + i * 10} rx="4" ry="7" transform={`rotate(${-28 - i * 15} ${11 + i * i * 2} ${49 + i * 10})`} />
          <ellipse cx={89 - i * i * 2} cy={49 + i * 10} rx="4" ry="7" transform={`rotate(${28 + i * 15} ${89 - i * i * 2} ${49 + i * 10})`} />
        </g>
      ))}
    </g>
  );
}

type FrameDesign = { colors: readonly [string, string, ...string[]]; trim?: ReactNode };
const frameFallback: FrameDesign = { colors: [sky, blue] };
export const frameArt: Readonly<Record<string, FrameDesign>> = Object.freeze({
  frame_sky: { colors: [white, sky, blue] },
  frame_cloud: { colors: [sky, blue], trim: <>{cloud(white, blue)}{cloud(white, blue, "translate(100 18) scale(-1 .82)")}</> },
  frame_dawn: { colors: [cream, pink, blue], trim: <path d="M22 29a36 36 0 0 1 56 0M34 17l-2-6m18 2V5m16 12 2-6" fill="none" stroke={gold} strokeWidth="2.5" strokeLinecap="round" /> },
  frame_rain: { colors: [sky, blue, navy], trim: <path d="M13 61l-7 10m15 1-7 10m69-16 7 10m-16 0 7 10" fill="none" stroke={blue} strokeWidth="3" strokeLinecap="round" /> },
  frame_rose: { colors: [white, pink, rose], trim: <path d="M50 95 38 84c-11-10 4-21 12-10 8-11 23 0 12 10Z" fill={pink} stroke={rose} strokeWidth="2" /> },
  frame_moon: { colors: [navy, plum, lilac], trim: <><path d="M76 6a15 15 0 1 0 17 20A13 13 0 0 1 76 6Z" fill={cream} stroke={gold} strokeWidth="1.8" /><circle cx="13" cy="68" r="3" fill={lilac} /></> },
  frame_aurora: { colors: [navy, lilac, sage, green], trim: <path d="M8 76c22-14 36 21 83-10M15 81c22-6 35 18 69-2" fill="none" stroke={green} strokeWidth="2.5" strokeLinecap="round" /> },
  frame_laurel: { colors: [cream, gold, cream], trim: <>{leaves(gold)}<circle cx="50" cy="9" r="5" fill={cream} stroke={gold} strokeWidth="2" /></> },
  frame_kite: { colors: [sky, pink, plum], trim: <><path d="m80 7 15 12-12 15-14-11Z" fill={lilac} stroke={plum} strokeWidth="2" /><path d="m80 7 3 27m-14-11 26-4m-12 15c-4 8 11 8 7 18" fill="none" stroke={plum} strokeWidth="1.7" /></> },
  frame_horizon: { colors: [cream, pink, plum], trim: <><path d="M27 81h46a23 13 0 0 1-46 0Z" fill={cream} stroke={gold} strokeWidth="2" /><path d="M33 86h34m-26 5h18" stroke={gold} strokeWidth="1.6" strokeLinecap="round" /></> },
  frame_orbit: { colors: [navy, sky, plum], trim: <><path d="M17 64C3 59 0 51 23 40m61-3c30 1 7 20-9 26" fill="none" stroke={plum} strokeWidth="3" strokeLinecap="round" /><circle cx="16" cy="67" r="5" fill={cream} stroke={gold} strokeWidth="2" /></> },
  frame_cloud_crown: { colors: [navy, sky, cream, gold], trim: <>{leaves(blue)}<path d="m34 7 8 6 8-10 8 10 8-6-4 15H38Z" fill={cream} stroke={gold} strokeWidth="2" strokeLinejoin="round" />{cloud(white, blue, "translate(22 32) scale(1 .8)")}</> },
  frame_crescent: { colors: [navy, lilac, cream], trim: <><path d="M15 66a25 25 0 0 0 34 24A23 23 0 0 1 15 66Z" fill={cream} stroke={gold} strokeWidth="2" /><circle cx="80" cy="17" r="5" fill={lilac} stroke={plum} strokeWidth="2" /></> },
  frame_aurora_ribbon: { colors: [plum, lilac, sage, blue], trim: <><path d="M5 56q17-32 44-32T95 7Q81 44 52 42T5 56Z" fill={sage} stroke={green} strokeWidth="2" /><path d="M4 69q18-17 38-15" fill="none" stroke={plum} strokeWidth="2" strokeLinecap="round" /></> },
  frame_laurel_seal: { colors: [gold, cream, rose, gold], trim: <>{leaves(gold)}<path d="M37 12q13-12 26 0l-4 9-9 6-9-6Z" fill={cream} stroke={gold} strokeWidth="2" /><path d="M45 13h10m-8 4h6" stroke={gold} strokeWidth="2" strokeLinecap="round" /></> },
});

const emblemFallback = {
  fill: sky, stroke: blue,
  shape: <path d="M19 15h26v28l-13 8-13-8Z M25 28h14m-14 6h10" />,
};
type EmblemDesign = typeof emblemFallback;
export const emblemArt: Readonly<Record<string, EmblemDesign>> = Object.freeze({
  emblem_cloud: { fill: sky, stroke: blue, shape: <path d="M18 42a9 9 0 0 1-1-18 13 13 0 0 1 23-5 9 9 0 0 1 10 9 7 7 0 0 1-1 14Z M27 33q5 5 10 0" /> },
  emblem_moon: { fill: cream, stroke: gold, shape: <path d="M38 13a20 20 0 1 0 13 27A18 18 0 0 1 38 13Z M48 23h.01m5 7h.01" /> },
  emblem_kite: { fill: pink, stroke: rose, shape: <path d="M35 10 51 25 30 41 17 27Z M35 10l-5 31m-13-14 34-2M30 41c-13 3-3 14-15 13" /> },
  emblem_aurora: { fill: lilac, stroke: plum, shape: <path d="M11 39c15-30 25 3 42-23l-3 13c-13 24-28-1-39 16Z M14 49c17-13 20 5 36-6" /> },
  emblem_laurel: { fill: cream, stroke: gold, shape: <path d="M32 50c-14-3-20-14-19-26m19 26c14-3 20-14 19-26M13 29c-9-4-7-13 1-15 4 5 3 11-1 15Zm7 15c-9 0-13-7-8-13 8 1 11 7 8 13Zm31-15c9-4 7-13-1-15-4 5-3 11 1 15Zm-7 15c9 0 13-7 8-13-8 1-11 7-8 13ZM26 18h12v15l-6 5-6-5Z" /> },
  emblem_balloon: { fill: lilac, stroke: plum, shape: <path d="M32 12c21 0 27 23 7 34H25C5 35 11 12 32 12Zm0 0c-9 4-9 21-3 34m3-34c9 4 9 21 3 34m-9 0 2 8h8l2-8" /> },
  emblem_island: { fill: sage, stroke: green, shape: <path d="M11 34c4-8 11-11 17-9 7-12 18-9 25 9l-10 12-10 6-12-9Zm0 0h42M25 40l8 12 6-12M32 24V11m0 0 12 3-12 5" /> },
  emblem_breeze: { fill: sky, stroke: navy, shape: <path d="M10 25h31c9 0 9-12 1-12-3 0-5 2-6 4M7 33h44m-39 8h25c10 0 10 12 2 12-3 0-5-2-6-4" fill="none" strokeWidth="3" /> },
  emblem_dawn: { fill: cream, stroke: gold, shape: <path d="M20 37a12 12 0 0 1 24 0M13 39h38m-32 7h26m-20 6h14M32 17v-5m-12 9-4-4m28 4 4-4" fill="none" /> },
});

const titleFallback = "M2 4h12l-2 4 2 4H2l2-4Z";
export const titleArt: Readonly<Record<string, string>> = Object.freeze({
  title_wind: "M2 5h8q3 0 3-2M2 8h11M2 11h6q3 0 3 2",
  title_pilot: "M1 4h14l-4 3H5Zm4 3v3l3 3 3-3V7",
  title_horizon: "M1 12h14M3 10a5 5 0 0 1 10 0M8 1v2m-6 2 2 1m10-1-2 1",
  title_crown: "M2 10 4 4l4 3 4-3 2 6-2 2H4Z",
  title_book: "M8 4C6 2 4 2 1 3v9c3-1 5-1 7 1 2-2 4-2 7-1V3c-3-1-5-1-7 1Zm0 0v9",
  title_cloud: "M4 12a3 3 0 0 1-1-6 4 4 0 0 1 7-1 4 4 0 0 1 3 7Z",
  title_moon: "M9 2a6 6 0 1 0 5 9A5 5 0 0 1 9 2Z",
});

const frameAliases: Readonly<Record<string, string>> = {
  "sky-gradient": "frame_sky",
  "soft-cloud": "frame_cloud",
  "aurora-ring": "frame_aurora",
  "moon-ring": "frame_moon",
  "gold-laurel": "frame_laurel",
};
const titleAliases: Readonly<Record<string, string>> = { "early-reader": "title_book", "cloud-guide": "title_cloud" };
const seededIslands: Partial<Record<number, { frame: string; title: string; emblem: string }>> = {
  10: { frame: "frame_dawn", title: "title_horizon", emblem: "emblem_dawn" },
  20: { frame: "frame_crescent", title: "title_moon", emblem: "emblem_moon" },
  30: { frame: "frame_aurora_ribbon", title: "title_wind", emblem: "emblem_aurora" },
  40: { frame: "frame_laurel_seal", title: "title_crown", emblem: "emblem_laurel" },
  50: { frame: "frame_horizon", title: "title_pilot", emblem: "emblem_island" },
};

function registryEntry<T>(registry: Readonly<Record<string, T>>, key: string | undefined, fallback: T) {
  return key && Object.hasOwn(registry, key) ? registry[key] : fallback;
}

function seededIsland(level?: number | null) {
  return level == null ? undefined : seededIslands[level];
}

export function resolveTitleArt(key?: string, level?: number | null) {
  const alias = key === "milestone-title" ? seededIsland(level)?.title ?? "title_pilot" :
    registryEntry(titleAliases, key, key);
  return registryEntry(titleArt, alias, titleFallback);
}

export function resolveFrameArt(key?: string, level?: number | null) {
  const alias = key === "milestone-frame" ? seededIsland(level)?.frame ?? "frame_cloud_crown" :
    registryEntry(frameAliases, key, key);
  return registryEntry(frameArt, alias, frameFallback);
}

export function resolveEmblemArt(key?: string, level?: number | null) {
  const alias = key === "milestone-emblem" ? seededIsland(level)?.emblem ?? "emblem_island" :
    key === "blue-breeze" ? "emblem_breeze" : key;
  return registryEntry(emblemArt, alias, emblemFallback);
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  const { label, variant } = rarityStyles[rarity];
  return <Badge variant={variant} className="w-fit">{label}</Badge>;
}

function AvatarPhoto({ src, name, alt = "" }: { src?: string | null; name?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "M";
  return src && !failed ? (
    <img src={getImageUrl(src)} alt={alt} className="absolute inset-0 size-full object-cover" onError={() => setFailed(true)} />
  ) : (
    <span aria-hidden={!alt || undefined} role={alt ? "img" : undefined} aria-label={alt || undefined}>{initials}</span>
  );
}

const frameAuraByRarity: Record<Rarity, string> = {
  common: "drop-shadow-[0_2px_6px_rgba(53,111,167,0.18)]",
  rare: "drop-shadow-[0_4px_10px_rgba(196,88,132,0.28)]",
  epic: "drop-shadow-[0_4px_14px_rgba(124,77,204,0.38)]",
  legendary: "drop-shadow-[0_4px_16px_rgba(217,153,24,0.45)]",
};

export function FramedAvatar({ equipment, src, name, alt, className }: {
  equipment?: Pick<Equipment, "avatar_frame"> | null;
  src?: string | null;
  name?: string;
  alt?: string;
  className?: string;
}) {
  const id = useId();
  const frame = equipment?.avatar_frame;
  const design = resolveFrameArt(frame?.asset.key, frame?.unlock_level);
  const rare = frame && frame.rarity !== "common";
  const ornate = frame?.rarity === "epic" || frame?.rarity === "legendary";
  return (
    <span
      className={cn(
        "relative isolate inline-grid size-11 shrink-0 place-items-center overflow-visible align-middle",
        !frame && "overflow-hidden rounded-full",
        frame && frameAuraByRarity[frame.rarity],
        className,
      )}
    >
      <span
        className={cn(
          "relative grid aspect-square place-items-center overflow-hidden rounded-full bg-accent font-semibold text-accent-foreground ring-1 ring-white/50",
          frame ? "w-[72%]" : "size-full border-2 border-surface",
        )}
      >
        <AvatarPhoto key={src} src={src} name={name} alt={alt} />
      </span>
      {frame && (
        <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
              {design.colors.map((color, index) => (
                <stop key={index} offset={index / (design.colors.length - 1)} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
          {/* Vòng chính ánh kim */}
          <circle cx="50" cy="50" r="40" fill="none" stroke={`url(#${id})`} strokeWidth="8.5" />
          {/* Đường bevel sáng bên trong */}
          <circle cx="50" cy="50" r="36.2" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.1" />
          {rare && (
            <circle cx="50" cy="50" r="44.8" fill="none" stroke={design.colors[0]} strokeWidth="1.5" opacity="0.9" />
          )}
          {ornate && (
            <circle
              cx="50"
              cy="50"
              r="47.2"
              fill="none"
              stroke={design.colors[1]}
              strokeWidth="1.8"
              strokeDasharray={frame.rarity === "legendary" ? "2 3" : "8 4"}
              className="origin-center motion-safe:animate-[spin_22s_linear_infinite]"
            />
          )}
          {design.trim}
        </svg>
      )}
    </span>
  );
}

const titleCrestStyles: Record<Rarity, { pill: string; iconWrap: string; accent: string }> = {
  common: {
    pill: "border-[#A9CBEB] bg-gradient-to-r from-[#EEF6FD] via-[#F7FBFF] to-[#DFEEFA] text-[#1D4E7F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(53,111,167,0.12)]",
    iconWrap: "bg-[#D9EBFA] text-[#285C90]",
    accent: "bg-[#356FA7]/50",
  },
  rare: {
    pill: "border-[#E398B8] bg-gradient-to-r from-[#FFF0F6] via-[#FCE1EC] to-[#F6CBE0] text-[#7D2448] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_6px_rgba(176,68,112,0.16)]",
    iconWrap: "bg-white/75 text-[#9C2F5B]",
    accent: "bg-[#C94C7E]/65",
  },
  epic: {
    pill: "border-[#C8B0F7] bg-gradient-to-r from-[#281948] via-[#452B7A] to-[#6544AE] text-[#F9F6FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_12px_rgba(88,52,163,0.32)]",
    iconWrap: "bg-white/18 text-[#E5D8FF] ring-1 ring-white/25",
    accent: "bg-[#D9C7FF]",
  },
  legendary: {
    pill: "border-[#F5C542] bg-gradient-to-r from-[#241607] via-[#4C310D] to-[#7C5214] text-[#FFEBA8] shadow-[inset_0_1px_0_rgba(255,236,168,0.4),0_4px_14px_rgba(196,126,10,0.38)]",
    iconWrap: "bg-[#F5C542]/25 text-[#FFD966] ring-1 ring-[#F5C542]/55",
    accent: "bg-[#FFD966]",
  },
};

export function TitleBadge({ item, className }: { item?: ShopItem | null; className?: string }) {
  if (!item) return null;
  const icon = resolveTitleArt(item.asset.key, item.unlock_level);
  const style = titleCrestStyles[item.rarity];
  const highTier = item.rarity === "epic" || item.rarity === "legendary";

  return (
    <span
      className={cn(
        "relative inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tracking-[0.01em] leading-snug",
        style.pill,
        className,
      )}
    >
      {highTier && (
        <span aria-hidden="true" className={cn("h-2.5 w-0.5 shrink-0 rounded-full", style.accent)} />
      )}
      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", style.iconWrap)}>
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" className="size-3">
          <path d={icon} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
      <span className="min-w-0 wrap-anywhere">{coinCopy(item.name)}</span>
      {highTier && (
        <span aria-hidden="true" className={cn("h-2.5 w-0.5 shrink-0 rounded-full", style.accent)} />
      )}
    </span>
  );
}

const hexPath = "M32 3 L56 16.5 Q59 18.2 59 21.8 L59 42.2 Q59 45.8 56 47.5 L32 61 L8 47.5 Q5 45.8 5 42.2 L5 21.8 Q5 18.2 8 16.5 Z";
const octagonPath = "M22 4 L42 4 L58 18 L58 46 L42 60 L22 60 L6 46 L6 18 Z";

export function EmblemIcon({ item, className, decorative = false }: { item?: ShopItem | null; className?: string; decorative?: boolean }) {
  const gradId = useId();
  if (!item) return null;
  const { fill, stroke, shape } = resolveEmblemArt(item.asset.key, item.unlock_level);
  const isEpic = item.rarity === "epic";
  const isLegendary = item.rarity === "legendary";

  return (
    <svg
      viewBox="0 0 64 64"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : coinCopy(item.name)}
      className={cn(
        "size-7 shrink-0",
        isLegendary
          ? "drop-shadow-[0_4px_10px_rgba(217,153,24,0.42)]"
          : isEpic
            ? "drop-shadow-[0_3px_8px_rgba(124,77,204,0.34)]"
            : "drop-shadow-[0_2px_4px_rgba(53,111,167,0.18)]",
        className,
      )}
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor={white} stopOpacity="0.95" />
          <stop offset="48%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.35" />
        </radialGradient>
      </defs>

      {/* Hình dáng huy hiệu phân cấp theo độ hiếm */}
      {isLegendary ? (
        <>
          <path d={octagonPath} fill={`url(#${gradId})`} stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="24" fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.85" />
          <path d="M8 32h4m40 0h4M32 8v4m0 40v4" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : isEpic ? (
        <>
          <path d={hexPath} fill={`url(#${gradId})`} stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <path d={hexPath} transform="translate(32 32) scale(0.86) translate(-32 -32)" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
          <path d="M9 32h3.5m39 0H55M32 9v3.5m0 39V55" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="32" cy="32" r="29" fill={`url(#${gradId})`} stroke={stroke} strokeWidth="2.2" />
          <circle cx="32" cy="32" r="25.5" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" />
          {item.rarity === "rare" && (
            <>
              <circle cx="32" cy="32" r="26.8" fill="none" stroke={stroke} strokeWidth="1" opacity="0.6" />
              <circle cx="32" cy="7" r="1.8" fill={stroke} />
              <circle cx="32" cy="57" r="1.8" fill={stroke} />
              <circle cx="7" cy="32" r="1.8" fill={stroke} />
              <circle cx="57" cy="32" r="1.8" fill={stroke} />
            </>
          )}
        </>
      )}

      {/* Cung phản chiếu ánh sáng phía trên tạo cảm giác nổi 3D */}
      <path d="M18 19a19 19 0 0 1 28 0" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" />

      <g fill={white} stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {shape}
      </g>
    </svg>
  );
}

export function EquippedMarks({ equipment, className }: { equipment?: Equipment | null; className?: string }) {
  if (!equipment?.title && !equipment?.emblem) return null;
  return (
    <span className={cn("inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5", className)}>
      <TitleBadge item={equipment.title} />
      <EmblemIcon item={equipment.emblem} />
    </span>
  );
}
