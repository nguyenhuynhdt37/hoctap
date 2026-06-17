import React from 'react'
import { View, ScrollView, useColorScheme } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer'
import type { Lesson } from '../types'

interface ContentTabProps {
  lesson: Lesson
  showNoteInput?: boolean
  noteText?: string
  onShowNoteInput?: (show: boolean) => void
  onNoteTextChange?: (text: string) => void
}

export function ContentTab({
  lesson,
}: ContentTabProps) {
  const isDark = useColorScheme() === 'dark'

  return (
    <View className="flex-1">
      <View className="p-5">
        {/* Title */}
        <Text className={`text-xl font-bold leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {lesson.title}
        </Text>

        {/* Type Badge */}
        <View className="mt-4 flex-row items-center">
          <View className={`px-3 py-1.5 rounded-full flex-row items-center ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
            <Ionicons
              name={lesson.lesson_type === 'video' ? 'play-circle' : 'document-text'}
              size={14}
              color={isDark ? '#A1A1AA' : '#71717A'}
            />
            <Text className={`text-xs ml-1.5 capitalize ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {lesson.lesson_type === 'code' ? 'Code' : lesson.lesson_type === 'quiz' ? 'Quiz' : lesson.lesson_type === 'text' ? 'Bài viết' : 'Video'}
            </Text>
          </View>
        </View>
      </View>

      {/* Description / Content */}
      <View className="flex-1">
        {lesson.description ? (
          <MarkdownRenderer 
            content={lesson.description} 
            className="flex-1"
          />
        ) : (
          <View className="p-5">
            <Text className="text-sm text-zinc-500 italic">
              Nội dung bài học đang được cập nhật...
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}
