"use client";

import type { ComponentType } from "react";
import {
  Atom,
  Award,
  Bookmark,
  BookMarked,
  BookOpen,
  Brain,
  Calculator,
  Code2,
  Compass,
  Cpu,
  Dna,
  Feather,
  Flag,
  Flame,
  FlaskConical,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  Languages,
  Laptop,
  Layers,
  Lightbulb,
  Map as MapIcon,
  Medal,
  Microscope,
  Music,
  Palette,
  PenTool,
  Rocket,
  School,
  Star,
  Target,
  Telescope,
  TrendingUp,
  Trophy,
  Zap,
} from "pulsoicon-react";
import type { CatalogColorToken, CatalogTaxonomyKind } from "@/types/catalog";

type PulsoIconComponent = ComponentType<{
  size?: number;
  className?: string;
  animated?: boolean;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export const CATALOG_ICON_MAP: Record<string, PulsoIconComponent> = {
  GraduationCap,
  School,
  BookOpen,
  BookMarked,
  Bookmark,
  Calculator,
  Compass,
  Atom,
  FlaskConical,
  Dna,
  Globe,
  Landmark,
  Languages,
  Laptop,
  Cpu,
  PenTool,
  Feather,
  Microscope,
  Telescope,
  Brain,
  Lightbulb,
  Target,
  Trophy,
  Award,
  Medal,
  Flag,
  Rocket,
  Flame,
  Star,
  Layers,
  Map: MapIcon,
  Heart,
  Music,
  Palette,
  Code2,
  Zap,
  TrendingUp,
};

export const CATALOG_ICON_LIST = Object.keys(CATALOG_ICON_MAP);

export function CatalogIcon({
  name,
  size = 18,
  className = "",
  animated = false,
}: {
  name?: string | null;
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const Icon = (name && CATALOG_ICON_MAP[name]) || BookOpen;
  return (
    <Icon
      size={size}
      className={className}
      animated={animated}
      aria-hidden="true"
    />
  );
}

export interface PastelPaletteStyle {
  key: CatalogColorToken;
  label: string;
  swatch: string;
  softBg: string;
  border: string;
  text: string;
  badgeBg: string;
  ring: string;
}

export const CLOUDY_PALETTES: Record<CatalogColorToken, PastelPaletteStyle> = {
  primary: {
    key: "primary",
    label: "Xanh Mây",
    swatch: "bg-primary",
    softBg: "bg-primary-light",
    border: "border-primary-pastel",
    text: "text-primary",
    badgeBg: "bg-primary-light text-primary border-primary-pastel",
    ring: "ring-primary/25",
  },
  secondary: {
    key: "secondary",
    label: "Hồng Pastel",
    swatch: "bg-secondary-pastel",
    softBg: "bg-secondary-light",
    border: "border-secondary-pastel",
    text: "text-secondary-foreground",
    badgeBg: "bg-secondary-light text-secondary-foreground border-secondary-pastel",
    ring: "ring-secondary-pastel/60",
  },
  lavender: {
    key: "lavender",
    label: "Tím Oải Hương",
    swatch: "bg-accent-border",
    softBg: "bg-accent",
    border: "border-accent-border",
    text: "text-accent-foreground",
    badgeBg: "bg-accent text-accent-foreground border-accent-border",
    ring: "ring-accent-border/60",
  },
  vanilla: {
    key: "vanilla",
    label: "Vani Ấm",
    swatch: "bg-accent-vanilla-border",
    softBg: "bg-accent-vanilla",
    border: "border-accent-vanilla-border",
    text: "text-accent-vanilla-foreground",
    badgeBg:
      "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
    ring: "ring-accent-vanilla-border/60",
  },
  success: {
    key: "success",
    label: "Xanh Lá Dịu",
    swatch: "bg-success-border",
    softBg: "bg-success-bg",
    border: "border-success-border",
    text: "text-success-foreground",
    badgeBg: "bg-success-bg text-success-foreground border-success-border",
    ring: "ring-success-border/60",
  },
  info: {
    key: "info",
    label: "Xanh Trời",
    swatch: "bg-info-border",
    softBg: "bg-info-bg",
    border: "border-info-border",
    text: "text-info-foreground",
    badgeBg: "bg-info-bg text-info-foreground border-info-border",
    ring: "ring-info-border/60",
  },
};

export const CLOUDY_PALETTE_LIST: PastelPaletteStyle[] = Object.values(
  CLOUDY_PALETTES,
);

export function getPalette(token?: string | null): PastelPaletteStyle {
  if (token && token in CLOUDY_PALETTES) {
    return CLOUDY_PALETTES[token as CatalogColorToken];
  }
  return CLOUDY_PALETTES.primary;
}

export const TAXONOMY_KIND_META: Record<
  CatalogTaxonomyKind,
  {
    label: string;
    singular: string;
    description: string;
    defaultIcon: string;
    defaultColor: CatalogColorToken;
  }
> = {
  levels: {
    label: "Cấp học",
    singular: "Cấp học",
    description: "Phân tầng giáo dục phổ thông (Tiểu học, THCS, THPT)",
    defaultIcon: "School",
    defaultColor: "vanilla",
  },
  grades: {
    label: "Khối lớp",
    singular: "Khối lớp",
    description: "12 khối lớp học thuật liên kết trực tiếp với môn học",
    defaultIcon: "BookMarked",
    defaultColor: "primary",
  },
  subjects: {
    label: "Môn học",
    singular: "Môn học",
    description: "Hệ thống bộ môn chuẩn chương trình GDPT 2018",
    defaultIcon: "Calculator",
    defaultColor: "primary",
  },
  "learning-goals": {
    label: "Định hướng",
    singular: "Định hướng học tập",
    description: "Lộ trình mục tiêu từ nền tảng, lấy lại gốc đến nâng cao",
    defaultIcon: "Target",
    defaultColor: "lavender",
  },
  exams: {
    label: "Kỳ thi",
    singular: "Kỳ thi",
    description: "Các kỳ thi tuyển sinh, tốt nghiệp và đánh giá năng lực",
    defaultIcon: "Trophy",
    defaultColor: "secondary",
  },
};

export const EXAM_TYPE_LABELS: Record<
  string,
  { label: string; color: CatalogColorToken }
> = {
  entrance: { label: "Tuyển sinh", color: "primary" },
  graduation: { label: "Tốt nghiệp", color: "lavender" },
  aptitude: { label: "Đánh giá năng lực", color: "info" },
  thinking: { label: "Đánh giá tư duy", color: "vanilla" },
  competition: { label: "Học sinh giỏi", color: "secondary" },
};

export function toVietnameseSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
