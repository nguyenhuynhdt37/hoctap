"use client";

import { ActiveLessonResponse } from "@/types/user/activeLesson";
import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  lesson: ActiveLessonResponse;
  onPlayerReady: (event: any) => void;
  onPlayerStateChange: (event: any) => void;
  onVideoLoaded: () => void;
}

export default function YouTubePlayer({
  lesson,
  onPlayerReady,
  onPlayerStateChange,
  onVideoLoaded,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const iframeId = `youtube-player-${lesson.id}`;
  const isInitializedRef = useRef(false);

  const initializePlayer = useCallback(() => {
    if (!lesson.file_id || !window.YT || !window.YT.Player) return;
    
    // Nếu player đã tồn tại và cùng videoId, không cần tạo lại
    if (playerRef.current && playerRef.current.getVideoData) {
      try {
        const currentVideoId = playerRef.current.getVideoData().video_id;
        if (currentVideoId === lesson.file_id && isInitializedRef.current) {
          return;
        }
      } catch (e) {
        // Nếu không lấy được videoId, tiếp tục tạo mới
      }
    }

    // Destroy player cũ nếu có
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.warn("Error destroying old player:", e);
      }
      playerRef.current = null;
    }

    try {
      const player = new window.YT.Player(iframeId, {
        videoId: lesson.file_id,
        playerVars: {
          enablejsapi: 1,
          playsinline: 1,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
      playerRef.current = player;
      isInitializedRef.current = true;
    } catch (error) {
      console.error("Error initializing YouTube player:", error);
      setTimeout(() => onVideoLoaded(), 3000);
    }
  }, [lesson.file_id, iframeId, onPlayerReady, onPlayerStateChange, onVideoLoaded]);

  useEffect(() => {
    const loadYouTubeAPI = () => {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.id = "youtube-iframe-api";
      document.body.appendChild(script);

      (window as any).onYouTubeIframeAPIReady = initializePlayer;
    };

    if (!window.YT) {
      if (!document.getElementById("youtube-iframe-api")) {
        loadYouTubeAPI();
      } else {
        (window as any).onYouTubeIframeAPIReady = initializePlayer;
      }
    } else {
      initializePlayer();
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
          isInitializedRef.current = false;
        } catch (e) {
          console.warn("Error destroying player:", e);
        }
      }
    };
  }, [lesson.id, lesson.file_id, initializePlayer]);

  return <div id={iframeId} className="w-full h-[70vh]" />;
}

