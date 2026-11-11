"use client";

import React from "react";
import { CINEMATIC_SCENES, VIDEO_ASSETS } from "./scenes-data";

interface CinematicVideoCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeSceneIndex: number;
  isVideoReady: boolean;
  isMobileViewport: boolean;
  onLoadedMetadata: () => void;
  onError: () => void;
}

const CinematicVideoCanvas: React.FC<CinematicVideoCanvasProps> = ({
  videoRef,
  activeSceneIndex,
  isVideoReady,
  isMobileViewport,
  onLoadedMetadata,
  onError,
}) => {
  const activeScene =
    CINEMATIC_SCENES[activeSceneIndex] || CINEMATIC_SCENES[0];
  const primaryVideoSrc = isMobileViewport
    ? VIDEO_ASSETS.mobileMp4
    : VIDEO_ASSETS.desktopMp4;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-primary-light select-none">
      {/* Static poster fallback layer while video metadata initializes */}
      <img
        src={activeScene.stillImage || VIDEO_ASSETS.poster}
        alt={activeScene.stillAlt}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
          isVideoReady ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Scroll-scrubbed HTML5 Video */}
      <video
        key={primaryVideoSrc}
        ref={videoRef}
        poster={VIDEO_ASSETS.poster}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-label="Hành trình học tập và trưởng thành cùng linh vật đám mây Mây Mây"
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={onLoadedMetadata}
        onError={onError}
        className="absolute inset-0 w-full h-full object-cover object-center"
      >
        <source src={primaryVideoSrc} type="video/mp4" />
        <source src={VIDEO_ASSETS.fallbackMp4} type="video/mp4" />
      </video>

      {/* Delicate edge scrims that keep the central 3D island and mascot crystal clear */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/70 via-background/15 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background/80 via-background/25 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background/45 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
};

export default CinematicVideoCanvas;
