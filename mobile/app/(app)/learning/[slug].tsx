// Learning Page - Main learning experience
// Tuân thủ AGILE SKILL RULES cho mobile development

import React from 'react'
import { View, ActivityIndicator, useColorScheme } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Text } from '@/components/ui'
import { learningService } from '@/components/features/learning/services/learning.service'
import { LearningFeature } from '@/components/features/learning/LearningFeature'

export default function LearningPage() {
  const { slug, lessonId } = useLocalSearchParams<{ slug: string; lessonId?: string }>()
  const isDark = useColorScheme() === 'dark'

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['learning', 'course', slug],
    queryFn: () => learningService.getCourseBySlug(slug!),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text className={`mt-3 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          Đang tải khóa học...
        </Text>
      </View>
    )
  }

  if (error || !course) {
    return (
      <View className={`flex-1 items-center justify-center px-6 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Không tìm thấy khóa học hoặc bạn chưa đăng ký
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1">
      <Stack.Screen options={{ title: course.title, headerShown: false }} />
      <LearningFeature
        courseId={course.id}
        courseTitle={course.title}
        initialCourseInfo={course}
        initialLessonId={lessonId}
      />
    </View>
  )
}
