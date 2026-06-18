import React, { useState } from 'react'
import { View, ScrollView, Pressable, useColorScheme } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import type { Lesson, CourseSection } from '../types'

interface SidebarProps {
  sections: CourseSection[]
  currentLessonId: string
  onSelectLesson: (lesson: Lesson) => void
  onClose: () => void
}

const LessonTypeIcon = ({ lesson_type, size = 18 }: { lesson_type: string; size?: number }) => {
  const isDark = useColorScheme() === 'dark'
  const color = isDark ? '#A1A1AA' : '#71717A'
  switch (lesson_type) {
    case 'video':
      return <Ionicons name="play-circle" size={size} color={color} />
    case 'quiz':
      return <Ionicons name="help-circle" size={size} color={color} />
    case 'code':
      return <Ionicons name="code-slash" size={size} color={color} />
    case 'text':
      return <Ionicons name="document-text" size={size} color={color} />
    default:
      return <Ionicons name="play-circle" size={size} color={color} />
  }
}

import { BackButton } from '@/components/ui/BackButton'

export function Sidebar({
  sections,
  currentLessonId,
  onSelectLesson,
  onClose,
}: SidebarProps) {
  const isDark = useColorScheme() === 'dark'
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  )

  const toggleSection = (sectionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0)

  const getSectionDuration = (lessons: Lesson[]) => {
    const total = lessons.reduce((sum, l) => sum + (l.duration || 0), 0)
    return fmtTime(total)
  }

  return (
    <View className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      {/* Header */}
      <View className={`px-5 py-4 flex-row items-center border-b ${
        isDark ? 'border-zinc-800' : 'border-zinc-100'
      }`}>
        <View className="flex-1">
          <Text className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Nội dung khóa học
          </Text>
          <Text className="text-xs text-zinc-500 mt-0.5">{totalLessons} bài học</Text>
        </View>
        <BackButton icon="close" onPress={onClose} />
      </View>

      {/* Sections */}
      <ScrollView 
        className="flex-1 px-2" 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {sections.map((section, sIdx) => {
          const isExpanded = expandedSections.has(section.id)
          const completedInSection = section.lessons.filter((l: Lesson) => l.is_completed).length
          const sectionDuration = getSectionDuration(section.lessons)

          return (
            <View key={section.id}>
              {/* Section Header */}
              <Pressable
                onPress={() => toggleSection(section.id)}
                className={`px-4 py-3.5 flex-row items-center border-b ${
                  isDark ? 'border-zinc-800' : 'border-zinc-100'
                }`}
              >
                <View className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
                  isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
                }`}>
                  <Ionicons name="book-outline" size={16} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {section.title}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <Text className="text-xs text-zinc-500">{sectionDuration}</Text>
                    <View className="w-1 h-1 rounded-full bg-zinc-300 mx-2" />
                    <Text className="text-xs text-zinc-500">
                      {completedInSection}/{section.lessons.length} bài
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={isDark ? '#52525B' : '#71717A'}
                />
              </Pressable>

              {/* Lessons */}
              {isExpanded && (
                <View className={isDark ? 'bg-zinc-900/30' : 'bg-zinc-50/50'}>
                  {section.lessons.map((lesson: Lesson, lIdx: number) => {
                    const isActive = lesson.id === currentLessonId

                    return (
                      <Pressable
                        key={lesson.id}
                        onPress={() => onSelectLesson(lesson)}
                        disabled={lesson.is_locked}
                        className={`mx-3 my-1 px-3 py-3 rounded-xl flex-row items-center ${
                          isActive ? 'bg-emerald-500' : isDark ? 'bg-zinc-900' : 'bg-white'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center mr-3">
                              <Ionicons name="play" size={14} color="#FFFFFF" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-white" numberOfLines={2}>
                                {lesson.title}
                              </Text>
                            </View>
                            {lesson.duration && (
                              <Text className="text-xs text-white/70 ml-2">
                                {fmtTime(lesson.duration)}
                              </Text>
                            )}
                          </>
                        ) : (
                          <>
                            {lesson.is_completed ? (
                              <View className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center mr-3">
                                <Feather name="check" size={14} color="#FFFFFF" />
                              </View>
                            ) : lesson.is_locked ? (
                              <View className="w-8 h-8 rounded-full bg-zinc-100 items-center justify-center mr-3">
                                <Feather name="lock" size={14} color="#71717A" />
                              </View>
                            ) : (
                              <View className={`w-8 h-8 rounded-full border items-center justify-center mr-3 ${
                                isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
                              }`}>
                                <LessonTypeIcon lesson_type={lesson.lesson_type} size={16} />
                              </View>
                            )}
                            <View className="flex-1">
                              <Text
                                className={`text-sm ${
                                  lesson.is_locked ? 'text-zinc-500' : isDark ? 'text-zinc-300' : 'text-zinc-700'
                                }`}
                                numberOfLines={2}
                              >
                                {lesson.title}
                              </Text>
                            </View>
                            {lesson.duration && !lesson.is_locked && (
                              <Text className="text-xs text-zinc-500 ml-2">
                                {fmtTime(lesson.duration)}
                              </Text>
                            )}
                          </>
                        )}
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}
        <View className="h-24" />
      </ScrollView>
    </View>
  )
}
