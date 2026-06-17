import React, { memo, useRef } from 'react'
import { View, Pressable, StyleSheet, Image, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import { cn } from '@/src/lib/utils'
import { getFullImageUrl } from '@/src/utils/image'
import type { MyCourseCardProps } from '../types'

const THUMBNAIL_H = 160

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m} phút`
  return `${seconds}s`
}

export const MyCourseCard = memo(function MyCourseCard({ course, onPress }: MyCourseCardProps) {
  const router = useRouter()
  const scaleAnim = useRef(new Animated.Value(1)).current

  const progress = course.progress_percent ?? 0
  const isCompleted = progress >= 100
  const isStarted = progress > 0 && progress < 100

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start()
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (onPress) {
      onPress(course)
    } else {
      // Khóa học đã đăng ký → chuyển thẳng sang trang học
      router.push(`/learning/${course.slug}` as any)
    }
  }

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        className="mx-4 mb-4 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-lg shadow-black/5"
      >
        {/* Thumbnail */}
        <View className="relative" style={{ height: THUMBNAIL_H }}>
          {course.thumbnail_url ? (
            <Image
              source={{ uri: getFullImageUrl(course.thumbnail_url) as string }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-emerald-500/20">
              <Feather name="play-circle" size={48} color="#10b981" />
            </View>
          )}

          {/* Overlay */}
          <View className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status badge */}
          <View className="absolute top-3 left-3">
            {isCompleted && (
              <View className="flex-row items-center px-2.5 py-1 rounded-full bg-emerald-500">
                <Feather name="check-circle" size={12} color="#FFFFFF" />
                <Text className="text-xs font-semibold text-white ml-1.5">Hoàn thành</Text>
              </View>
            )}
            {isStarted && (
              <View className="flex-row items-center px-2.5 py-1 rounded-full bg-amber-500">
                <Feather name="clock" size={12} color="#FFFFFF" />
                <Text className="text-xs font-semibold text-white ml-1.5">Đang học</Text>
              </View>
            )}
            {!isStarted && !isCompleted && (
              <View className="px-2.5 py-1 rounded-full bg-blue-500">
                <Text className="text-xs font-semibold text-white">Chưa bắt đầu</Text>
              </View>
            )}
          </View>

          {/* Duration */}
          <View className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/50">
            <Text className="text-xs font-medium text-white">
              {formatDuration(course.total_length_seconds)}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View className="p-4">
          <Text
            className="text-base font-bold text-gray-900 dark:text-white mb-2 leading-snug"
            numberOfLines={2}
          >
            {course.title}
          </Text>

          {/* Category & Level */}
          <View className="flex-row items-center gap-2 mb-3">
            {course.category_name && (
              <View className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800">
                <Text className="text-xs text-gray-600 dark:text-zinc-400">{course.category_name}</Text>
              </View>
            )}
            {course.level && (
              <View className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800">
                <Text className="text-xs text-gray-600 dark:text-zinc-400 capitalize">{course.level}</Text>
              </View>
            )}
          </View>

          {/* Progress */}
          <View className="mb-3">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-xs text-gray-500 dark:text-zinc-400">Tiến độ học tập</Text>
              <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {Math.round(progress)}%
              </Text>
            </View>
            <View className="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-700 overflow-hidden">
              <View
                className={cn(
                  'h-full rounded-full',
                  isCompleted ? 'bg-emerald-500' : isStarted ? 'bg-amber-500' : 'bg-blue-500'
                )}
                style={{ width: `${progress}%` }}
              />
            </View>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-between pt-1 border-t border-gray-100 dark:border-zinc-800">
            <View className="flex-row items-center gap-3">
              {course.avg_rating > 0 && (
                <View className="flex-row items-center gap-1">
                  <Feather name="star" size={13} color="#F59E0B" />
                  <Text className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                    {course.avg_rating.toFixed(1)}
                  </Text>
                </View>
              )}
              <Text className="text-xs text-gray-400 dark:text-zinc-500">
                {new Date(course.enrolled_at).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: 'short',
                })}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Học tiếp
              </Text>
              <Feather name="arrow-right" size={14} color="#10b981" className="ml-1" />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
})

// ── Skeleton ─────────────────────────────────────────────────────────────────
export function MyCourseCardSkeleton() {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [shimmerAnim])

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] })

  return (
    <Animated.View style={[styles.cardWrapper, { opacity }]} className="mx-4 mb-4 rounded-2xl overflow-hidden">
      <View className="h-44 bg-gray-200 dark:bg-zinc-800" />
      <View className="p-4">
        <View className="h-5 w-3/4 bg-gray-200 dark:bg-zinc-700 rounded-lg mb-3" />
        <View className="h-4 w-1/3 bg-gray-100 dark:bg-zinc-800 rounded" />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  cardWrapper: { width: '100%' },
})
