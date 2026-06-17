/**
 * Video Lesson Component
 * Video player với thumbnail + play overlay
 * Khi tap play sẽ mở YouTube app/browser
 */

import React, { useCallback, useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { View, Pressable, Dimensions, Image, Linking } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  runOnJS,
} from 'react-native-reanimated'
import { Text } from '@/components/ui'
import YoutubePlayer from 'react-native-youtube-iframe'
import type { Lesson, Quiz } from '../../types'
import { QuizOverlay } from './QuizOverlay'
import { Celebration } from '../Celebration'

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const { width: SCREEN_W } = Dimensions.get('window')
const VIDEO_HEIGHT = SCREEN_W * (9 / 16)

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface VideoLessonProps {
  lesson: Lesson
  isDark: boolean
  onMarkCompleted: (lessonId: string) => void
  onNext: () => void
  onPrev: () => void
  onOpenQuiz: () => void
  hasNext: boolean
  hasPrev: boolean
  isCompleted: boolean
  showQuizOverlay: boolean
  onTimeUpdate?: (time: number) => void
}

export interface VideoLessonRef {
  seekTo: (seconds: number) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const VideoLesson = forwardRef<VideoLessonRef, VideoLessonProps>(({
  lesson,
  isDark,
  onMarkCompleted,
  isCompleted,
  onOpenQuiz,
  onTimeUpdate,
}, ref) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [watchTime, setWatchTime] = useState(0)
  const [isFastForwarding, setIsFastForwarding] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isReady, setIsReady] = useState(false)

  const playerRef = useRef<any>(null)

  // Expose seekTo
  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (playerRef.current) {
        playerRef.current.seekTo(seconds, true)
        setIsPlaying(true)
      }
    }
  }))
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousTimeRef = useRef(0)
  const lastCheckTimeRef = useRef(Date.now())
  const isFastForwardingRef = useRef(false)

  const duration = lesson.duration ?? 0
  const requiredWatchTime = Math.floor(duration * 0.1)
  const hasQuizzes = (lesson.quizzes ?? []).length > 0

  // ─────────────────────────────────────────────────────────────────────────────
  // FAST FORWARD DETECTION
  // ─────────────────────────────────────────────────────────────────────────────

  const handleFastForwardDetection = useCallback((currTime: number) => {
    const prevTime = previousTimeRef.current
    const now = Date.now()
    const timePassed = (now - lastCheckTimeRef.current) / 1000
    const timeDifference = currTime - prevTime

    // Nếu tua nhanh (> 5s trong < 2s thực tế)
    if (timeDifference > 5 && prevTime > 0 && timePassed < 2) {
      setIsFastForwarding(true)
      isFastForwardingRef.current = true

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setIsFastForwarding(false)
        isFastForwardingRef.current = false
      }, 5000)

      previousTimeRef.current = currTime
      lastCheckTimeRef.current = now
    } else {
      previousTimeRef.current = currTime
      lastCheckTimeRef.current = now
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // TRACKING LOOP
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isPlaying && isReady) {
      intervalRef.current = setInterval(async () => {
        if (playerRef.current) {
          try {
            const currTime = await playerRef.current.getCurrentTime()
            setCurrentTime(currTime)
            onTimeUpdate?.(currTime)
            
            if (!isFastForwardingRef.current) {
              setWatchTime(prev => prev + 1)
            }
            handleFastForwardDetection(currTime)
          } catch (e) {
            // Ignored
          }
        }
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, isReady, handleFastForwardDetection, onTimeUpdate])

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPLETION LOGIC
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (watchTime >= requiredWatchTime && !isCompleted && duration > 0 && !hasQuizzes) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onMarkCompleted(lesson.id)
      setWatchTime(-1) 
    }
  }, [watchTime, requiredWatchTime, isCompleted, lesson.id, onMarkCompleted, duration, hasQuizzes])

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const onStateChange = useCallback((state: string) => {
    if (state === 'playing') setIsPlaying(true)
    else if (state === 'paused' || state === 'ended') setIsPlaying(false)
  }, [])

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <View className="relative">
      <View
        className="relative overflow-hidden bg-black"
        style={{ height: VIDEO_HEIGHT }}
      >
        <YoutubePlayer
          ref={playerRef}
          height={VIDEO_HEIGHT}
          play={isPlaying}
          videoId={lesson.file_id || ''}
          onChangeState={onStateChange}
          onReady={() => setIsReady(true)}
          initialPlayerParams={{
            controls: true,
            modestbranding: true,
            rel: false,
          }}
        />

        {/* Status Overlays */}
        {!isCompleted && isPlaying && !hasQuizzes && (
          <View className="absolute top-4 left-4 z-10 pointer-events-none">
            <View 
              className={`flex-row items-center px-3 py-2 rounded-xl border ${
                isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/90 border-gray-100'
              }`}
            >
              <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
              <Text className={`text-[10px] font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                ĐÃ XEM: {fmtTime(watchTime >= 0 ? watchTime : requiredWatchTime)} / {fmtTime(requiredWatchTime)}
              </Text>
            </View>
          </View>
        )}

        {/* Quiz Button */}
        {hasQuizzes && (
          <View className="absolute top-4 right-4 z-10">
            <Pressable
              onPress={() => {
                setIsPlaying(false)
                onOpenQuiz()
              }}
              className="bg-emerald-500 px-4 py-2 rounded-xl flex-row items-center"
            >
              <Ionicons name="help-circle" size={16} color="white" />
              <Text className="text-white text-[10px] font-bold ml-2">
                {isCompleted ? 'Luyện tập Quiz' : 'Làm Quiz'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Fast Forward Warning */}
        {isFastForwarding && (
          <View className="absolute bottom-16 left-4 z-20 pointer-events-none">
            <View 
              className="bg-amber-500 px-3 py-2 rounded-xl flex-row items-center"
            >
              <Ionicons name="warning" size={14} color="white" />
              <Text className="text-white text-[10px] font-bold ml-2">
                Cảnh báo tua video: Không tính thời gian xem
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      {!isCompleted && duration > 0 && !hasQuizzes && (
        <View className={`h-1 w-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <View 
            className="h-full bg-emerald-500" 
            style={{ width: `${Math.min(100, (watchTime / requiredWatchTime) * 100)}%` }}
          />
        </View>
      )}

    </View>
  )
})
