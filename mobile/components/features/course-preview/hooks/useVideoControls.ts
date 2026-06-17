import { useState, useRef, useCallback, useEffect } from 'react'
import type { AVPlaybackStatus } from 'expo-av'

export interface UseVideoControlsOptions {
  defaultDuration?: number
  autoHideDelay?: number
}

export interface UseVideoControlsReturn {
  status: AVPlaybackStatus | null
  showControls: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  progress: number
  onPlaybackStatusUpdate: (s: AVPlaybackStatus) => void
  onShowControls: () => void
  onSeekBackward: () => void
  onSeekForward: () => void
  onTogglePlay: () => void
  onPlay: () => void
  onPause: () => void
}

export function useVideoControls(
  api: {
    playAsync: () => void
    pauseAsync: () => void
    setPositionAsync: (ms: number) => void
  },
  options: UseVideoControlsOptions = {}
): UseVideoControlsReturn {
  const { defaultDuration = 0, autoHideDelay = 3000 } = options

  const [status, setStatus] = useState<AVPlaybackStatus | null>(null)
  const [showControls, setShowControls] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isPlaying = status?.isLoaded && status.isPlaying
  const currentTime = status?.isLoaded ? status.positionMillis / 1000 : 0
  const duration = status?.isLoaded
    ? status.durationMillis
      ? status.durationMillis / 1000
      : defaultDuration
    : defaultDuration
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0

  const showControlsTemporarily = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShowControls(true)
    if (isPlaying) {
      timerRef.current = setTimeout(() => setShowControls(false), autoHideDelay)
    }
  }, [isPlaying, autoHideDelay])

  useEffect(() => {
    showControlsTemporarily()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [showControlsTemporarily])

  const onPlaybackStatusUpdate = useCallback((s: AVPlaybackStatus) => {
    setStatus(s)
  }, [])

  const onShowControls = useCallback(() => {
    showControlsTemporarily()
  }, [showControlsTemporarily])

  const onSeekBackward = useCallback(() => {
    api.setPositionAsync(Math.max(0, currentTime - 10) * 1000)
  }, [api, currentTime])

  const onSeekForward = useCallback(() => {
    api.setPositionAsync(Math.min(duration, currentTime + 10) * 1000)
  }, [api, currentTime, duration])

  const onTogglePlay = useCallback(() => {
    if (isPlaying) api.pauseAsync()
    else api.playAsync()
  }, [api, isPlaying])

  const onPlay = useCallback(() => api.playAsync(), [api])
  const onPause = useCallback(() => api.pauseAsync(), [api])

  return {
    status,
    showControls,
    isPlaying,
    currentTime,
    duration,
    progress,
    onPlaybackStatusUpdate,
    onShowControls,
    onSeekBackward,
    onSeekForward,
    onTogglePlay,
    onPlay,
    onPause,
  }
}
