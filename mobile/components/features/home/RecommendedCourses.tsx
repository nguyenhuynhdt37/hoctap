import React, { useRef, useState } from 'react'
import {
  View,
  Pressable,
  Animated,
  Image,
  Dimensions,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useQuery } from '@tanstack/react-query'
import { Text } from '@/components/ui'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/src/lib/utils'
import { useAuthStore } from '@/src/stores/auth.store'
import { getFullImageUrl } from '@/src/utils/image'
import { courseService } from '@/src/services/course.service'
import type { RecommendedCourse } from '@/src/types/course'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W * 0.82
const CARD_H = 200
const CARD_GAP = 12

// ── Similarity Badge ─────────────────────────────────────────────────────────────
function SimilarityBadge({ similarity }: { similarity: number }) {
  const { t } = useTranslation()
  const pct = Math.round(similarity * 100)
  return (
    <View className="px-3 py-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30">
      <Text className="text-xs font-black text-white tracking-wide">
        {t('home_screen.recommended.match', { pct })}
      </Text>
    </View>
  )
}

// ── Dot Indicator ────────────────────────────────────────────────────────────────
function DotIndicator({ total, active }: { total: number; active: number }) {
  return (
    <View className="flex-row items-center justify-center gap-1.5 mt-5 mb-2">
      {Array.from({ length: Math.min(total, 8) }).map((_, i) => {
        const idx = total > 8 ? Math.round((i / 7) * (total - 1)) : i
        return (
          <View
            key={i}
            className={cn(
              'h-1.5 rounded-full',
              idx === active
                ? 'w-5 bg-emerald-500'
                : 'w-1.5 bg-zinc-300 dark:bg-zinc-600'
            )}
          />
        )
      })}
    </View>
  )
}

// ── Recommended Course Card (with oval scale) ────────────────────────────────────
function RecommendedCard({
  course,
  index,
  total,
  scrollX,
}: {
  course: RecommendedCourse
  index: number
  total: number
  scrollX: Animated.Value
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(false)

  // Scale & opacity interpolated from scroll position
  const scale = scrollX.interpolate({
    inputRange: [
      (index - 1) * (CARD_W + CARD_GAP),
      index * (CARD_W + CARD_GAP),
      (index + 1) * (CARD_W + CARD_GAP),
    ],
    outputRange: [0.88, 1, 0.88],
    extrapolate: 'clamp',
  })

  const opacity = scrollX.interpolate({
    inputRange: [
      (index - 1) * (CARD_W + CARD_GAP),
      index * (CARD_W + CARD_GAP),
      (index + 1) * (CARD_W + CARD_GAP),
    ],
    outputRange: [0.6, 1, 0.6],
    extrapolate: 'clamp',
  })

  const translateY = scrollX.interpolate({
    inputRange: [
      (index - 1) * (CARD_W + CARD_GAP),
      index * (CARD_W + CARD_GAP),
      (index + 1) * (CARD_W + CARD_GAP),
    ],
    outputRange: [12, 0, 12],
    extrapolate: 'clamp',
  })

  const handlePress = async () => {
    if (isChecking) return
    setIsChecking(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const { data } = await courseService.checkEnrollment(course.id)
      if (data.is_enroll) {
        router.push(`/learning/${course.slug}` as any)
      } else {
        router.push(`/course/${course.slug}` as any)
      }
    } catch {
      router.push(`/course/${course.slug}` as any)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Animated.View
      style={[
        {
          width: CARD_W,
          transform: [{ scale }, { translateY }],
          opacity,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        className={cn(
          'rounded-[28px] overflow-hidden border',
          'bg-white dark:bg-zinc-900/80',
          'border-zinc-100 dark:border-zinc-800',
          'shadow-xl shadow-black/10'
        )}
      >
        {/* Full-width thumbnail */}
        <View className="relative" style={{ height: CARD_H }}>
          {course.thumbnail ? (
            <Image
              source={{ uri: getFullImageUrl(course.thumbnail) as string }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-emerald-500/10">
              <Feather name="play-circle" size={56} color="#10b981" />
            </View>
          )}
          {/* Fallback solid bg so gradient + text are always legible */}
          <View className="absolute inset-0 bg-black/50" />
          {/* Gradient overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.1)']}
            className="absolute inset-0"
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Top: badge + counter */}
          <View className="absolute top-3.5 left-0 right-0 px-4 flex-row items-center justify-between">
            <SimilarityBadge similarity={course.similarity} />
            <View className="px-2.5 py-1 rounded-full bg-black/30">
              <Text className="text-xs font-bold text-white/80">
                {index + 1}/{total}
              </Text>
            </View>
          </View>

          {/* Bottom: title + instructor */}
          <View className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <Text
              className="text-xl font-extrabold text-white tracking-tight leading-tight mb-3 pt-1"
              numberOfLines={2}
              style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 }}
            >
              {course.title}
            </Text>

            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-full bg-white/20 overflow-hidden items-center justify-center border border-white/30">
                {course.instructor?.avatar ? (
                  <Image
                    source={{ uri: getFullImageUrl(course.instructor.avatar) as string }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Feather name="user" size={16} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-xs text-white/60 font-medium uppercase tracking-wide mb-0.5">
                  {t('home_screen.recommended.instructor')}
                </Text>
                <Text className="text-sm font-bold text-white" numberOfLines={1}>
                  {course.instructor?.name || t('home_screen.recommended.no_data')}
                </Text>
              </View>
              <View className="w-10 h-10 rounded-full bg-emerald-500 items-center justify-center shadow-sm shadow-emerald-500/40">
                <Feather name="chevron-right" size={22} color="white" />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ── Skeleton ────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  const shimmerAnim = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] })

  return (
    <Animated.View
      style={[styles.skeletonCard, { opacity }]}
    >
      <View className="relative" style={{ height: CARD_H }}>
        <View className="absolute inset-0 bg-zinc-200 dark:bg-zinc-700 rounded-[28px]" />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  skeletonCard: {
    width: CARD_W,
    borderRadius: 28,
    overflow: 'hidden',
  },
})

// ── Empty / Error state ─────────────────────────────────────────────────────────
function EmptyState() {
  const { t } = useTranslation()
  return (
    <View className="mx-5 rounded-[28px] p-8 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 items-center">
      <Feather name="compass" size={48} className="text-zinc-300 dark:text-zinc-600 mb-4" />
      <Text className="text-base font-semibold text-zinc-600 dark:text-zinc-400 text-center">
        {t('home_screen.recommended.empty.title')}
      </Text>
      <Text className="text-sm text-zinc-400 dark:text-zinc-500 text-center mt-1.5">
        {t('home_screen.recommended.empty.description')}
      </Text>
    </View>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────────
export function RecommendedCourses() {
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { data, isLoading, isError } = useRecommendedCourses()
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const scrollX = useRef(new Animated.Value(0)).current

  const courses = data?.items ?? []
  const total = courses.length

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (e: any) => {
        const offset = e.nativeEvent.contentOffset.x
        const idx = Math.round(offset / (CARD_W + CARD_GAP))
        setActiveIndex(Math.min(idx, total - 1))
      },
    }
  )

  if (!isAuthenticated) return null

  return (
    <View className="mt-4">
      {/* Header */}
      <View className="px-5 flex-row items-end justify-between mb-4">
        <View>
          <Text className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">
            {t('home_screen.recommended.badge')}
          </Text>
          <Text className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 pt-1 leading-tight">
            {t('home_screen.recommended.title')}
          </Text>
        </View>
        <Pressable>
          <Text className="text-sm font-bold text-emerald-500">{t('home_screen.recommended.view_all')}</Text>
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="items-center">
          <SkeletonCard />
          <View className="mt-5">
            <SkeletonCard />
          </View>
        </View>
      ) : isError || !total ? (
        <EmptyState />
      ) : (
        <View className="items-center">
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={CARD_W + CARD_GAP}
            snapToAlignment="center"
            contentContainerStyle={{
              paddingHorizontal: (SCREEN_W - CARD_W) / 2 - CARD_GAP / 2,
            }}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {courses.map((course, i) => (
              <RecommendedCard
                key={course.id}
                course={course}
                index={i}
                total={total}
                scrollX={scrollX}
              />
            ))}
          </Animated.ScrollView>

          {/* Dot indicator */}
          {total > 1 && <DotIndicator total={total} active={activeIndex} />}
        </View>
      )}
    </View>
  )
}

// ── Hook ────────────────────────────────────────────────────────────────────────
function useRecommendedCourses() {
  return useQuery({
    queryKey: ['recommended-courses'],
    queryFn: async () => {
      const { data } = await courseService.getRecommended()
      return data as { items: RecommendedCourse[] }
    },
    enabled: useAuthStore.getState().isAuthenticated,
    staleTime: 1000 * 60 * 10,
  })
}
