"use client";

import React from "react";
import CinematicFallback from "./CinematicFallback";
import CinematicOverlay from "./CinematicOverlay";
import CinematicVideoCanvas from "./CinematicVideoCanvas";
import { CINEMATIC_SCENES } from "./scenes-data";
import { ScrollCinematicHeroProps } from "./types";
import { useScrollVideoScrubber } from "./useScrollVideoScrubber";

const ScrollCinematicHero: React.FC<ScrollCinematicHeroProps> = ({
  onExploreCourses,
  onSelectGradeLevel,
}) => {
  const {
    containerRef,
    videoRef,
    progressBarRef,
    activeSceneIndex,
    uiProgress,
    isVideoReady,
    hasVideoError,
    prefersReducedMotion,
    isMobileViewport,
    handleVideoLoadedMetadata,
    handleVideoError,
    scrollToScene,
  } = useScrollVideoScrubber();

  if (prefersReducedMotion || hasVideoError) {
    return (
      <CinematicFallback
        onExploreCourses={onExploreCourses}
        onSelectGradeLevel={onSelectGradeLevel}
      />
    );
  }

  return (
    <section
      ref={containerRef}
      aria-label="Hành trình khám phá Học viện trên mây Mây Mây"
      className="relative w-full h-[640vh] md:h-[900vh] bg-background border-b border-border"
    >
      {/* Screen-reader accessible summary of all four storytelling scenes */}
      <div className="sr-only">
        {CINEMATIC_SCENES.map((scene) => (
          <div key={scene.id}>
            <h2>
              {scene.headline} {scene.highlightText}
            </h2>
            <p>{scene.description}</p>
          </div>
        ))}
      </div>

      {/* Full-Viewport Sticky Stage (No top header offset on "/") */}
      <div className="sticky top-0 h-screen min-h-[560px] w-full overflow-hidden">
        <CinematicVideoCanvas
          videoRef={videoRef}
          activeSceneIndex={activeSceneIndex}
          isVideoReady={isVideoReady}
          isMobileViewport={isMobileViewport}
          onLoadedMetadata={handleVideoLoadedMetadata}
          onError={handleVideoError}
        />

        <CinematicOverlay
          activeSceneIndex={activeSceneIndex}
          uiProgress={uiProgress}
          progressBarRef={progressBarRef}
          onSelectScene={scrollToScene}
          onExploreCourses={onExploreCourses}
          onSelectGradeLevel={onSelectGradeLevel}
        />
      </div>
    </section>
  );
};

export default ScrollCinematicHero;
