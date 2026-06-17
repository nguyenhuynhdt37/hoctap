import React from 'react'
import { View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Text } from '@/components/ui'
import { Feather } from '@expo/vector-icons'
import { cn } from '@/src/lib/utils'
import { courseService } from '@/src/services/course.service'
import type { TopViewCourse } from '@/src/types/course'

export function HomeProgress() {
  const { data, isLoading } = useQuery({
    queryKey: ['courses', 'top-views'],
    queryFn: () => courseService.getTopViews({ limit: 1 }),
    staleTime: 1000 * 60 * 10,
  })

  const topCourse = data?.data?.items?.[0] as TopViewCourse | undefined

  return (
    <View className="px-5 mb-8">
      <View
        className={cn(
          "p-7 rounded-[40px] border shadow-2xl shadow-emerald-500/10",
          "bg-white/40 dark:bg-zinc-900/60 backdrop-blur-2xl",
          "border-white/40 dark:border-zinc-800"
        )}
      >
        {isLoading ? (
          <ProgressSkeleton />
        ) : topCourse ? (
          <ProgressContent course={topCourse} />
        ) : (
          <ProgressFallback />
        )}
      </View>
    </View>
  )
}

function ProgressContent({ course }: { course: TopViewCourse }) {
  const viewsDisplay =
    course.views >= 1_000_000
      ? `${(course.views / 1_000_000).toFixed(1)}M`
      : course.views >= 1_000
        ? `${(course.views / 1_000).toFixed(1)}K`
        : course.views.toString()

  return (
    <>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center">
            <Feather name="trending-up" size={20} className="text-emerald-500" />
          </View>
          <View>
            <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Thịnh hành
            </Text>
            <Text
              className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight"
              numberOfLines={1}
            >
              {course.title}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Feather name="eye" size={14} className="text-zinc-400 mb-0.5" />
          <Text className="text-2xl font-black text-emerald-500">{viewsDisplay}</Text>
        </View>
      </View>

      <View className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <View
          className="h-full bg-emerald-500 rounded-full"
          style={{ width: `${Math.min((course.enrolls / 1000) * 100, 100)}%` }}
        />
      </View>

      <View className="flex-row justify-between mt-3">
        <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400" numberOfLines={1}>
          {course.instructor?.name ?? 'Đang cập nhật'}
        </Text>
        <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {course.enrolls.toLocaleString('vi-VN')} học viên
        </Text>
      </View>
    </>
  )
}

function ProgressFallback() {
  return (
    <>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center">
            <Feather name="book-open" size={20} className="text-emerald-500" />
          </View>
          <View>
            <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Đang tiếp tục
            </Text>
            <Text className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Clean Architecture
            </Text>
          </View>
        </View>
        <Text className="text-2xl font-black text-emerald-500">65%</Text>
      </View>
      <View className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <View className="h-full bg-emerald-500 rounded-full" style={{ width: '65%' }} />
      </View>
      <View className="flex-row justify-between mt-3">
        <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Bài 4: Domain Layer
        </Text>
        <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">12/18 bài học</Text>
      </View>
    </>
  )
}

function ProgressSkeleton() {
  return (
    <>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <View className="gap-1.5">
            <View className="h-3 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <View className="h-5 w-40 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </View>
        </View>
        <View className="h-8 w-14 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </View>
      <View className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      <View className="flex-row justify-between mt-3">
        <View className="h-3 w-28 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <View className="h-3 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </View>
    </>
  )
}
