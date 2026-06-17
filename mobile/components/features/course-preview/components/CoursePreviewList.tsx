import React from 'react'
import { View, ScrollView } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { PreviewLesson } from '../types'
import { LessonListItem } from './LessonListItem'

interface CoursePreviewListProps {
  lessons: PreviewLesson[]
  activeIndex: number
  isDark: boolean
  onSelectLesson: (index: number) => void
}

export function CoursePreviewList({
  lessons,
  activeIndex,
  isDark,
  onSelectLesson,
}: CoursePreviewListProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Section header */}
      <View
        className={`px-5 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-gray-200'
          }`}
      >
        <Text
          className={`text-base font-bold ${isDark ? 'text-zinc-200' : 'text-gray-700'
            }`}
        >
          Danh sách bài xem trước ({lessons.length})
        </Text>
      </View>

      {/* Items */}
      {lessons.map((lesson, idx) => (
        <LessonListItem
          key={lesson.id}
          lesson={lesson}
          isActive={idx === activeIndex}
          isDark={isDark}
          onPress={() => onSelectLesson(idx)}
        />
      ))}
    </ScrollView>
  )
}
