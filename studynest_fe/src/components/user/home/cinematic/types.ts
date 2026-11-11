export type SceneAlignment = "left" | "center" | "bottom-left";

export interface GradePreviewPill {
  id: "primary" | "secondary" | "highschool";
  label: string;
  grades: string;
  summary: string;
  accentClass: string;
  badgeVariant: "vanilla" | "secondary" | "default";
}

export interface CinematicScene {
  id: string;
  stepNumber: string;
  shortTitle: string;
  eyebrow: string;
  headline: string;
  highlightText?: string;
  description: string;
  /** Normalized scroll range [0..1] */
  startProgress: number;
  endProgress: number;
  /** Corresponding video timestamp range in seconds (out of 14.93s) */
  videoStartSec: number;
  videoEndSec: number;
  /** Representative still frame extracted from the real video */
  stillImage: string;
  stillAlt: string;
  alignment: SceneAlignment;
  pills?: string[];
  gradeCards?: GradePreviewPill[];
  showPrimaryCta?: boolean;
}

export interface ScrollCinematicHeroProps {
  onExploreCourses: () => void;
  onSelectGradeLevel?: (levelId: "primary" | "secondary" | "highschool") => void;
}
