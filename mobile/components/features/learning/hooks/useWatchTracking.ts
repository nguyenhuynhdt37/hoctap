/**
 * useWatchTracking Hook
 * Theo dõi thời gian xem video, phát hiện tua nhanh
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface UseWatchTrackingOptions {
  duration: number
  requiredPercent?: number
  enabled?: boolean
  onComplete?: () => void
}

interface WatchTrackingResult {
  watchTime: number
  requiredWatchTime: number
  isFastForwarding: boolean
  isCompleted: boolean
  currentTime: number
  handleTimeUpdate: (time: number) => void
  handleStateChange: (state: string) => void
  checkCompletion: () => boolean
}

export function useWatchTracking({
  duration,
  requiredPercent = 0.75,
  enabled = true,
  onComplete,
}: UseWatchTrackingOptions): WatchTrackingResult {
  const [watchTime, setWatchTime] = useState(0)
  const [isFastForwarding, setIsFastForwarding] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const previousTimeRef = useRef(0)
  const lastCheckTimeRef = useRef(Date.now())
  const isPlayingRef = useRef(false)
  const fastForwardTimeoutRef = useRef<any>(null)
  const intervalRef = useRef<any>(null)
  const hasCalledCompleteRef = useRef(false)

  const requiredWatchTime = useMemo(() => Math.floor(duration * requiredPercent), [duration, requiredPercent])

  const handleTimeUpdate = useCallback((time: number) => {
    if (!enabled) return

    const now = Date.now()
    const timePassed = (now - lastCheckTimeRef.current) / 1000
    const timeDifference = time - previousTimeRef.current

    setCurrentTime(time)

    // Detect fast forwarding
    // If jumped more than 9 seconds in less than 3 seconds of real time
    if (timeDifference > 9 && previousTimeRef.current > 0 && timePassed < 3) {
      setIsFastForwarding(true)

      if (fastForwardTimeoutRef.current) {
        clearTimeout(fastForwardTimeoutRef.current)
      }

      fastForwardTimeoutRef.current = setTimeout(() => {
        setIsFastForwarding(false)
      }, 5000)
    } else if (timeDifference <= 20 && timeDifference >= -1) {
      // Normal playback
      previousTimeRef.current = time
      lastCheckTimeRef.current = now
    }

    previousTimeRef.current = time
    lastCheckTimeRef.current = now
  }, [enabled])

  const handleStateChange = useCallback((state: string) => {
    if (!enabled) return

    const isPlaying = state === 'playing'

    if (isPlaying && !isPlayingRef.current) {
      // Started playing
      isPlayingRef.current = true
      lastCheckTimeRef.current = Date.now()

      // Start counting watch time
      intervalRef.current = setInterval(() => {
        if (!isFastForwarding) {
          setWatchTime(prev => prev + 1)
        }
      }, 1000)
    }

    if (!isPlaying && isPlayingRef.current) {
      // Stopped playing
      isPlayingRef.current = false

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, isFastForwarding])

  const checkCompletion = useCallback(() => {
    if (hasCalledCompleteRef.current) return false

    if (watchTime >= requiredWatchTime && !isCompleted) {
      hasCalledCompleteRef.current = true
      setIsCompleted(true)
      onComplete?.()
      return true
    }
    return false
  }, [watchTime, requiredWatchTime, isCompleted, onComplete])

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (fastForwardTimeoutRef.current) {
        clearTimeout(fastForwardTimeoutRef.current)
      }
    }
  }, [])

  // Reset when lesson changes
  useEffect(() => {
    setWatchTime(0)
    setIsFastForwarding(false)
    setIsCompleted(false)
    previousTimeRef.current = 0
    lastCheckTimeRef.current = Date.now()
    isPlayingRef.current = false
    hasCalledCompleteRef.current = false

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [duration])

  return {
    watchTime,
    requiredWatchTime,
    isFastForwarding,
    isCompleted,
    currentTime,
    handleTimeUpdate,
    handleStateChange,
    checkCompletion,
  }
}
