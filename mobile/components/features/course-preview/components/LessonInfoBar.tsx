import React from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import type { PreviewLesson } from '../types'

function formatDuration(s: number | null) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60).toString()
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

interface LessonInfoBarProps {
  lesson: PreviewLesson
  activeIndex: number
  total: number
  isDark: boolean
}

export function LessonInfoBar({ lesson, activeIndex, total, isDark }: LessonInfoBarProps) {
  return (
    <View className={`px-5 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
      <Text
        className={`text-xl font-bold leading-snug ${isDark ? 'text-white' : 'text-gray-900'
          }`}
        numberOfLines={2}
      >
        {lesson.title}
      </Text>

      <View className="flex-row items-center gap-3 mt-2">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="film-outline" size={13} color={isDark ? '#52525B' : '#9CA3AF'} />
          <Text className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            Video
          </Text>
        </View>
        <Text className={`text-sm ${isDark ? 'text-zinc-600' : 'text-gray-300'}`}>•</Text>
        <Text className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          {formatDuration(lesson.duration ?? 0)}
        </Text>
        <Text className={`text-sm ${isDark ? 'text-zinc-600' : 'text-gray-300'}`}>•</Text>
        <Text className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          Bài {activeIndex + 1} / {total}
        </Text>
      </View>
    </View>
  )
}
