"use client";

import { Badge, Button } from "@/components/ui";
import React from "react";
import {
  HiAcademicCap,
  HiArrowDown,
  HiArrowRight,
  HiCheckCircle,
  HiPlay,
} from "react-icons/hi";
import { CINEMATIC_SCENES } from "./scenes-data";

interface CinematicOverlayProps {
  activeSceneIndex: number;
  uiProgress: number;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
  onSelectScene: (index: number) => void;
  onExploreCourses: () => void;
  onSelectGradeLevel?: (levelId: "primary" | "secondary" | "highschool") => void;
}

const CinematicOverlay: React.FC<CinematicOverlayProps> = ({
  activeSceneIndex,
  uiProgress,
  progressBarRef,
  onSelectScene,
  onExploreCourses,
  onSelectGradeLevel,
}) => {
  const activeScene =
    CINEMATIC_SCENES[activeSceneIndex] || CINEMATIC_SCENES[0];

  const isScene3 = activeSceneIndex === 2;
  const isScene4 = activeSceneIndex === 3;

  return (
    <div className="relative z-10 w-full h-full flex flex-col justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7 pointer-events-none">
      {/* Editorial Narrative Glass Card */}
      <div
        className={`flex w-full ${
          activeScene.alignment === "bottom-left" || isScene3 || isScene4
            ? "mt-auto mb-4 justify-start items-end"
            : "my-auto justify-start items-center"
        }`}
      >
        <div
          className={`w-full pointer-events-auto ${
            isScene3
              ? "max-w-xl"
              : isScene4
              ? "max-w-md lg:max-w-[460px]"
              : "max-w-md lg:max-w-[480px]"
          }`}
        >
          <div
            key={activeScene.id}
            data-tour="story"
            className="rounded-[28px] bg-surface/80 backdrop-blur-2xl border border-white/85 shadow-[0_24px_56px_-12px_rgba(53,111,167,0.16)] p-6 sm:p-7 transition-all duration-500 animate-in fade-in slide-in-from-bottom-2"
          >
            {/* Subtle Editorial Eyebrow */}
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                {activeScene.eyebrow}
              </span>
            </div>

            {/* Editorial Headline */}
            {activeSceneIndex === 0 ? (
              <h1 className="font-display text-2xl sm:text-3xl lg:text-[36px] font-semibold text-foreground tracking-tight leading-[1.16] mb-3">
                {activeScene.headline}{" "}
                {activeScene.highlightText && (
                  <span className="text-primary italic font-medium">
                    {activeScene.highlightText}
                  </span>
                )}
              </h1>
            ) : (
              <h2 className="font-display text-2xl sm:text-3xl lg:text-[34px] font-semibold text-foreground tracking-tight leading-[1.18] mb-3">
                {activeScene.headline}{" "}
                {activeScene.highlightText && (
                  <span className="text-primary italic font-medium">
                    {activeScene.highlightText}
                  </span>
                )}
              </h2>
            )}

            {/* Concise Editorial Copy */}
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-5">
              {activeScene.description}
            </p>

            {/* Minimal Feature Tags */}
            {activeScene.pills && activeScene.pills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {activeScene.pills.map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/85 border border-primary-pastel/70 text-xs font-medium text-foreground"
                  >
                    <HiCheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                    {pill}
                  </span>
                ))}
              </div>
            )}

            {/* Three School Levels Selector */}
            {activeScene.gradeCards && activeScene.gradeCards.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
                {activeScene.gradeCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      if (onSelectGradeLevel) {
                        onSelectGradeLevel(card.id);
                      } else {
                        onExploreCourses();
                      }
                    }}
                    className={`group text-left p-3.5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer ${card.accentClass}`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {card.label}
                      </span>
                      <Badge variant={card.badgeVariant} size="sm">
                        {card.grades}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {card.summary}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                data-tour="explore"
                variant="primary"
                size="md"
                onClick={onExploreCourses}
                className="rounded-full px-5 shadow-xs hover:-translate-y-0.5"
              >
                <HiPlay className="w-4 h-4" />
                <span>Khám phá khóa học</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  if (onSelectGradeLevel) {
                    onSelectGradeLevel("highschool");
                  } else {
                    onExploreCourses();
                  }
                }}
                className="rounded-full px-4 bg-surface/90 border-primary-pastel text-primary hover:bg-primary-light"
              >
                <HiAcademicCap className="w-4 h-4" />
                <span>Chọn cấp học</span>
                <HiArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Minimalist Floating Dock (Sleek Progress & Subtle Dots — Zero Clutter) */}
      <div className="flex items-center justify-center pointer-events-auto">
        <div className="inline-flex items-center gap-3.5 px-4 py-2 rounded-full bg-surface/82 backdrop-blur-xl border border-white/85 shadow-sm">
          {/* Minimal Dot Indicators */}
          <div
            className="flex items-center gap-1.5"
            role="tablist"
            aria-label="Điểm dừng hành trình"
          >
            {CINEMATIC_SCENES.map((scene, idx) => {
              const isActive = idx === activeSceneIndex;
              return (
                <button
                  key={scene.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={scene.shortTitle}
                  onClick={() => onSelectScene(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-primary-pastel hover:bg-primary/60"
                  }`}
                />
              );
            })}
          </div>

          {/* Sleek Micro Progress Line */}
          <div className="hidden sm:block w-20 h-1 bg-primary-light rounded-full overflow-hidden">
            <div
              ref={progressBarRef}
              className="h-full w-full bg-primary origin-left transition-transform duration-75"
              style={{ transform: `scaleX(${uiProgress})` }}
            />
          </div>

          {/* Quick Scroll Down Trigger */}
          <button
            type="button"
            onClick={onExploreCourses}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer pl-1"
          >
            <span>Khám phá ngay</span>
            <HiArrowDown className="w-3.5 h-3.5 text-primary animate-bounce" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CinematicOverlay;
