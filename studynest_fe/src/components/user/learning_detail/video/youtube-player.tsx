"use client";

import { ActiveLessonResponse } from "@/types/user/activeLesson";
import { useEffect, useRef } from "react";

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

  // Giữ callback mới nhất qua ref để KHÔNG BAO GIỜ destroy/recreate iframe khi parent re-render
  const onReadyRef = useRef(onPlayerReady);
  const onStateChangeRef = useRef(onPlayerStateChange);
  const onVideoLoadedRef = useRef(onVideoLoaded);

  useEffect(() => {
    onReadyRef.current = onPlayerReady;
  }, [onPlayerReady]);

  useEffect(() => {
    onStateChangeRef.current = onPlayerStateChange;
  }, [onPlayerStateChange]);

  useEffect(() => {
    onVideoLoadedRef.current = onVideoLoaded;
  }, [onVideoLoaded]);

  useEffect(() => {
    if (!lesson.file_id) return;
    let cancelled = false;
    let pollTimer: number | null = null;

    const mountPlayer = () => {
      if (cancelled || !window.YT?.Player) return;
      const container = document.getElementById(iframeId);
      if (!container) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore destroy error
        }
        playerRef.current = null;
      }

      try {
        playerRef.current = new window.YT.Player(iframeId, {
          videoId: lesson.file_id,
          playerVars: {
            enablejsapi: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event: any) => {
              if (!cancelled) onReadyRef.current(event);
            },
            onStateChange: (event: any) => {
              if (!cancelled) onStateChangeRef.current(event);
            },
          },
        });
      } catch (error) {
        console.error("Error initializing YouTube player:", error);
        window.setTimeout(() => {
          if (!cancelled) onVideoLoadedRef.current();
        }, 3000);
      }
    };

    if (window.YT?.Player) {
      mountPlayer();
    } else {
      if (!document.getElementById("youtube-iframe-api")) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.id = "youtube-iframe-api";
        document.body.appendChild(script);
      }

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === "function") prevReady();
        mountPlayer();
      };

      // Dự phòng nếu script tải xong trước khi gán callback
      pollTimer = window.setInterval(() => {
        if (window.YT?.Player) {
          if (pollTimer) window.clearInterval(pollTimer);
          pollTimer = null;
          mountPlayer();
        }
      }, 200);
    }

    return () => {
      cancelled = true;
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore destroy error
        }
        playerRef.current = null;
      }
    };
  }, [lesson.id, lesson.file_id, iframeId]);

  return <div id={iframeId} className="h-[70vh] w-full" />;
}
