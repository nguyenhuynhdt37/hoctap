import React from 'react'
import { View, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import type { PreviewLesson } from '../types'

function formatDuration(s: number | null) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60).toString()
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

interface LessonListItemProps {
  lesson: PreviewLesson
  isActive: boolean
  isDark: boolean
  onPress: () => void
}

export function LessonListItem({ lesson, isActive, isDark, onPress }: LessonListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center border-b ${isDark ? 'border-zinc-800' : 'border-gray-200'
        } ${isActive ? (isDark ? 'bg-emerald-900/30' : 'bg-emerald-50') : ''}`}
      style={{ paddingVertical: 14, paddingHorizontal: 20 }}
    >
      {/* Icon */}
      <View
        className={`w-11 h-11 rounded-2xl items-center justify-center mr-4 ${isActive ? 'bg-emerald-500' : isDark ? 'bg-zinc-800' : 'bg-gray-100'
          }`}
      >
        {isActive ? (
          <Feather name="pause" size={18} color="white" />
        ) : (
          <Feather name="play" size={18} color={isDark ? '#71717A' : '#6B7280'} />
        )}
      </View>

      {/* Info */}
      <View className="flex-1 mr-3">
        <Text
          className={`text-base font-semibold leading-snug ${isActive ? 'text-emerald-500' : isDark ? 'text-white' : 'text-gray-900'
            }`}
          numberOfLines={2}
        >
          {lesson.title}
        </Text>
        <View className="flex-row items-center gap-2 mt-1.5">
          <View className="flex-row items-center gap-1">
            <Feather name="video" size={11} color={isDark ? '#52525B' : '#9CA3AF'} />
            <Text className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
              Video
            </Text>
          </View>
          <Text className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>•</Text>
          <Text className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            {formatDuration(lesson.duration)}
          </Text>
        </View>
      </View>

      {/* Active indicator */}
      {isActive && <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
    </Pressable>
  )
}
