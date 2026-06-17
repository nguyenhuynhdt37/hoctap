import React, { useRef } from 'react'
import { View, Pressable, Animated, Image } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Text } from '@/components/ui'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { cn } from '@/src/lib/utils'
import { courseService } from '@/src/services/course.service'
import type { NewestCourse } from '@/src/types/course'
import { getFullImageUrl } from '@/src/utils/image'

export function HomeCourseList() {
  const { data, isLoading } = useQuery({
    queryKey: ['courses', 'newest'],
    queryFn: () => courseService.getNewest({ limit: 4 }),
    staleTime: 1000 * 60 * 5,
  })

  const courses = data?.data?.items ?? []

  return (
    <View className="px-5">
      <View className="flex-row justify-between items-end mb-5 px-1">
        <Text className="text-2xl font-extrabold tracking-tighter text-zinc-900 dark:text-zinc-50">
          Khóa học mới
        </Text>
        <Pressable>
          <Text className="text-emerald-500 font-bold text-sm">Xem tất cả</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="gap-4">
          {[1, 2, 3].map(i => <CourseCardSkeleton key={i} />)}
        </View>
      ) : courses.length === 0 ? (
        <EmptyCourses />
      ) : (
        <View className="gap-4">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </View>
      )}
    </View>
  )
}

function CourseCard({ course }: { course: NewestCourse }) {
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start()
  }
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()
  }
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        className={cn(
          "p-6 rounded-[40px] flex-row items-center gap-5 border",
          "bg-white dark:bg-zinc-900/60 shadow-lg shadow-black/5",
          "border-zinc-100 dark:border-zinc-800"
        )}
      >
        {/* Thumbnail */}
        <View className="w-16 h-16 rounded-[24px] overflow-hidden bg-emerald-500/10 items-center justify-center">
          {course.thumbnail ? (
            <Image
              source={{ uri: getFullImageUrl(course.thumbnail) as string }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Feather name="play-circle" size={32} color="#10b981" />
          )}
        </View>

        {/* Info */}
        <View className="flex-1 pr-2">
          {course.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mb-1.5">
              {course.tags.slice(0, 2).map(tag => (
                <View
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                >
                  <Text className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <Text
            className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tighter leading-tight mb-1"
            numberOfLines={1}
          >
            {course.title}
          </Text>
          <View className="flex-row items-center gap-2">
            <Feather name="star" size={12} color="#f59e0b" />
            <Text className="text-xs font-bold text-amber-500">{course.rating.toFixed(1)}</Text>
            <Text className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
              • {course.enrolls.toLocaleString('vi-VN')} học viên
            </Text>
          </View>
        </View>

        <Feather name="chevron-right" size={20} className="text-zinc-300 dark:text-zinc-700" />
      </Pressable>
    </Animated.View>
  )
}

function CourseCardSkeleton() {
  return (
    <View
      className={cn(
        "p-6 rounded-[40px] flex-row items-center gap-5 border",
        "bg-white dark:bg-zinc-900/60",
        "border-zinc-100 dark:border-zinc-800"
      )}
    >
      <View className="w-16 h-16 rounded-[24px] bg-zinc-200 dark:bg-zinc-700" />
      <View className="flex-1 gap-2">
        <View className="h-4 w-3/4 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <View className="h-3 w-1/2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </View>
    </View>
  )
}

function EmptyCourses() {
  return (
    <View className="p-8 rounded-[40px] border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 items-center">
      <Feather name="book-open" size={40} className="text-zinc-300 dark:text-zinc-600 mb-3" />
      <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 text-center">
        Chưa có khóa học nào
      </Text>
    </View>
  )
}
