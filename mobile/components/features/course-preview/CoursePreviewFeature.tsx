import React, { useState } from 'react'
import { View, useColorScheme } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { courseService } from '@/src/services/course.service'
import type { PreviewLesson } from './types'
import { VideoPlayer } from './components/VideoPlayer'
import { YouTubePlayer } from './components/YouTubePlayer'
import { LessonInfoBar } from './components/LessonInfoBar'
import { CoursePreviewList } from './components/CoursePreviewList'
import { CoursePreviewHeader } from './components/CoursePreviewHeader'

// ── Props ───────────────────────────────────────────────────────────────────
export interface CoursePreviewFeatureProps {
  courseId: string
}

// ── Loading / Not found states ───────────────────────────────────────────────
function LoadingState({ isDark }: { isDark: boolean }) {
  return (
    <View className={`flex-1 items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      <View className="items-center">
        <Ionicons name="play-circle-outline" size={56} color="#10B981" />
        <Text className={`mt-3 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          Đang tải bài học xem trước...
        </Text>
      </View>
    </View>
  )
}

function NotFoundState({ isDark }: { isDark: boolean }) {
  return (
    <View className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      <CoursePreviewHeader isDark={isDark} />
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="videocam-off-outline" size={56} color={isDark ? '#52525B' : '#9CA3AF'} />
        <Text className={`mt-4 text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Không có bài học xem trước nào
        </Text>
        <Text className={`mt-1 text-sm text-center ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          Giảng viên chưa cung cấp video xem trước cho khóa học này
        </Text>
      </View>
    </View>
  )
}

// ── Feature ─────────────────────────────────────────────────────────────────
export function CoursePreviewFeature({ courseId }: CoursePreviewFeatureProps) {
  const isDark = useColorScheme() === 'dark'
  const [activeIndex, setActiveIndex] = useState(0)

  const { data: lessons, isLoading, isError } = useQuery<PreviewLesson[]>({
    queryKey: ['course-preview', courseId],
    queryFn: async () => {
      const { data } = await courseService.getPreview(courseId)
      return data ?? []
    },
    enabled: !!courseId,
  })

  const activeLesson = lessons?.[activeIndex]
  const isYouTube = activeLesson?.video_url
    ? /youtube\.com|youtu\.be/.test(activeLesson.video_url)
    : false

  if (isLoading) return <LoadingState isDark={isDark} />
  if (isError || !lessons || lessons.length === 0) return <NotFoundState isDark={isDark} />

  return (
    <View className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      <CoursePreviewHeader isDark={isDark} />

      {/* Video Player */}
      {activeLesson && (
        isYouTube && activeLesson.video_url ? (
          <YouTubePlayer url={activeLesson.video_url} isDark={isDark} />
        ) : (
          <VideoPlayer lesson={activeLesson} />
        )
      )}

      {/* Lesson Info */}
      {activeLesson && (
        <LessonInfoBar
          lesson={activeLesson}
          activeIndex={activeIndex}
          total={lessons.length}
          isDark={isDark}
        />
      )}

      {/* Lesson List */}
      <CoursePreviewList
        lessons={lessons}
        activeIndex={activeIndex}
        isDark={isDark}
        onSelectLesson={setActiveIndex}
      />
    </View>
  )
}
