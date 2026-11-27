"use client";

import { ActiveLessonResponse } from "@/types/user/activeLesson";
import { useEffect, useMemo, useRef } from "react";

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

function extractYouTubeId(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function YouTubePlayer({
  lesson,
  onPlayerReady,
  onPlayerStateChange,
  onVideoLoaded,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeId = `youtube-player-${lesson.id}`;

  const directVideoUrl = lesson.file_id?.startsWith("r2:")
    ? `/api/storage/files/${lesson.file_id.slice(3)}`
    : lesson.file_id?.startsWith("http") && !extractYouTubeId(lesson.file_id)
      ? lesson.file_id
      : lesson.file_id?.startsWith("/")
        ? lesson.file_id
        : null;

  const youtubeVideoId = useMemo(
    () => (directVideoUrl ? null : extractYouTubeId(lesson.file_id)),
    [directVideoUrl, lesson.file_id]
  );

  const youtubeEmbedSrc = useMemo(() => {
    if (!youtubeVideoId) return null;
    const params = new URLSearchParams({
      enablejsapi: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
    });
    if (typeof window !== "undefined" && window.location?.origin) {
      params.set("origin", window.location.origin);
    }
    return `https://www.youtube.com/embed/${youtubeVideoId}?${params.toString()}`;
  }, [youtubeVideoId]);

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

  // Luồng 1: Video MP4 trực tiếp (R2 Presigned URL)
  useEffect(() => {
    if (!directVideoUrl) return;
    const videoEl = videoElRef.current;
    if (!videoEl) return;

    const adapter = {
      getCurrentTime: () => videoEl.currentTime || 0,
      getDuration: () =>
        Number.isFinite(videoEl.duration) ? videoEl.duration : 0,
      seekTo: (seconds: number) => {
        if (Number.isFinite(seconds)) {
          videoEl.currentTime = Math.max(0, seconds);
        }
      },
      playVideo: () => {
        void videoEl.play().catch(() => {});
      },
      pauseVideo: () => {
        videoEl.pause();
      },
      getPlayerState: () => {
        if (videoEl.ended) return 0;
        if (!videoEl.paused) return 1;
        return 2;
      },
      getPlaybackRate: () => videoEl.playbackRate || 1,
      setPlaybackRate: (rate: number) => {
        videoEl.playbackRate = rate;
      },
      destroy: () => {
        videoEl.pause();
      },
    };

    const handleLoadedMetadata = () => {
      onReadyRef.current({ target: adapter });
      onVideoLoadedRef.current();
    };
    const handlePlay = () =>
      onStateChangeRef.current({ target: adapter, data: 1 });
    const handlePause = () =>
      onStateChangeRef.current({ target: adapter, data: 2 });
    const handleEnded = () =>
      onStateChangeRef.current({ target: adapter, data: 0 });

    videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoEl.addEventListener("play", handlePlay);
    videoEl.addEventListener("pause", handlePause);
    videoEl.addEventListener("ended", handleEnded);

    if (videoEl.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoEl.removeEventListener("play", handlePlay);
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("ended", handleEnded);
    };
  }, [lesson.id, directVideoUrl]);

  // Luồng 2: Gắn YT.Player vào thẻ <iframe> đã mount sẵn có referrerPolicy chuẩn
  // Lưu ý: KHÔNG gọi player.destroy() trong cleanup vì YouTube API sẽ thay <iframe> bằng <div> rỗng
  // gây lỗi "This video is unavailable" khi React StrictMode remount!
  useEffect(() => {
    if (!youtubeEmbedSrc) return;
    let cancelled = false;
    let pollTimer: number | null = null;

    const attachPlayer = () => {
      if (cancelled || !window.YT?.Player) return;
      const iframeEl = iframeRef.current;
      if (!iframeEl || iframeEl.tagName !== "IFRAME") return;
      if (playerRef.current) return;

      try {
        playerRef.current = new window.YT.Player(iframeEl, {
          events: {
            onReady: (event: any) => {
              if (!cancelled) {
                onReadyRef.current(event);
                onVideoLoadedRef.current();
              }
            },
            onStateChange: (event: any) => {
              if (!cancelled) onStateChangeRef.current(event);
            },
          },
        });
      } catch (error) {
        console.error("Error attaching YouTube player:", error);
      }
    };

    if (window.YT?.Player) {
      attachPlayer();
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
        attachPlayer();
      };

      pollTimer = window.setInterval(() => {
        if (window.YT?.Player) {
          if (pollTimer) window.clearInterval(pollTimer);
          pollTimer = null;
          attachPlayer();
        }
      }, 200);
    }

    return () => {
      cancelled = true;
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      playerRef.current = null;
    };
  }, [lesson.id, youtubeEmbedSrc]);

  if (directVideoUrl) {
    return (
      <div className="flex aspect-video max-h-[70dvh] w-full items-center justify-center bg-black">
        <video
          ref={videoElRef}
          src={directVideoUrl}
          controls
          playsInline
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  if (youtubeEmbedSrc) {
    return (
      <iframe
        ref={iframeRef}
        key={youtubeEmbedSrc}
        id={iframeId}
        src={youtubeEmbedSrc}
        title={lesson.title || "Video bài giảng"}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        className="aspect-video max-h-[70dvh] w-full border-0 bg-black"
      />
    );
  }

  return (
    <div className="flex aspect-video max-h-[70dvh] w-full items-center justify-center bg-background text-sm text-muted-foreground">
      Không có video để phát...
    </div>
  );
}
