/**
 * useVideoPlayer Hook
 * Quản lý state cho YouTube video player
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { VideoPlayerState } from '../types/video-lesson'

interface UseVideoPlayerOptions {
  lessonId: string
  youtubeId: string
  initialTime?: number
  onStateChange?: (state: VideoPlayerState) => void
  onTimeUpdate?: (time: number) => void
  onReady?: (duration: number) => void
  onError?: (error: Error) => void
}

export function useVideoPlayer({
  lessonId,
  onStateChange,
  onTimeUpdate,
  onReady,
  onError,
}: UseVideoPlayerOptions) {
  const [playerState, setPlayerState] = useState<VideoPlayerState>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const webViewRef = useRef<any>(null)

  const handleReady = useCallback((dur: number) => {
    setIsReady(true)
    setDuration(dur)
    setPlayerState('paused')
    onReady?.(dur)
  }, [onReady])

  const handleStateChange = useCallback((state: VideoPlayerState) => {
    setPlayerState(state)
    onStateChange?.(state)
  }, [onStateChange])

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
    onTimeUpdate?.(time)
  }, [onTimeUpdate])

  const handleError = useCallback((err: Error) => {
    setError(err)
    setPlayerState('error')
    onError?.(err)
  }, [onError])

  const play = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.playVideo();')
  }, [])

  const pause = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.pauseVideo();')
  }, [])

  const seekTo = useCallback((seconds: number) => {
    webViewRef.current?.injectJavaScript(`window.seekTo(${seconds});`)
  }, [])

  const setRef = useCallback((ref: any) => {
    webViewRef.current = ref
  }, [])

  // Reset when lesson changes
  useEffect(() => {
    setIsReady(false)
    setCurrentTime(0)
    setPlayerState('idle')
    setError(null)
  }, [lessonId])

  return {
    playerState,
    currentTime,
    duration,
    isReady,
    error,
    webViewRef,
    setRef,
    play,
    pause,
    seekTo,
    handleReady,
    handleStateChange,
    handleTimeUpdate,
    handleError,
    isPlaying: playerState === 'playing',
    isPaused: playerState === 'paused',
    isEnded: playerState === 'ended',
    hasError: playerState === 'error',
  }
}
