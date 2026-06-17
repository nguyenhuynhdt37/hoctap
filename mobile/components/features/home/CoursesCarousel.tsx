import React, { useRef, useCallback, useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import { cn } from '@/src/lib/utils'
import { CourseCard } from './CourseCard'
import type { NewestCourse } from '@/src/types/course'
import type { CourseSectionType } from './CourseCard'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_GAP = 12
const SIDE_PADDING = 20
// 1 card full-width mỗi màn hình (trừ padding)
const CARD_WIDTH = SCREEN_W - SIDE_PADDING * 2
const CARD_INTERVAL = CARD_WIDTH + CARD_GAP

interface CoursesCarouselProps {
  title: string
  subtitle?: string
  items: NewestCourse[]
  section: CourseSectionType
  hasMore: boolean
  isLoading: boolean
  isFetchingMore?: boolean
  onLoadMore: () => void
}

export function CoursesCarousel({
  title,
  subtitle,
  items,
  section,
  hasMore,
  isLoading,
  isFetchingMore = false,
  onLoadMore,
}: CoursesCarouselProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<ScrollView>(null)
  const scrollX = useRef(new Animated.Value(0)).current
  const [activeIndex, setActiveIndex] = useState(0)
  const loadMoreFiredRef = useRef(false)

  const SECTION_BG: Record<CourseSectionType, string> = {
    top: 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50',
    trending: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50',
    newest: 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50',
    featured: 'bg-gradient-to-br from-green-50 to-emerald-50',
    recommended: 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50',
  }

  const SECTION_SUBTITLE: Record<CourseSectionType, string> = {
    top: t('home_screen.carousel.subtitles.top'),
    trending: t('home_screen.carousel.subtitles.trending'),
    newest: t('home_screen.carousel.subtitles.newest'),
    featured: t('home_screen.carousel.subtitles.featured'),
    recommended: t('home_screen.carousel.subtitles.recommended'),
  }

  const bgClass = SECTION_BG[section]
  const autoSubtitle = subtitle || SECTION_SUBTITLE[section]
  const totalPages = Math.max(1, items.length)

  // Vuốt xong → snap → detect page → load more nếu ở cuối
  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x
      const idx = Math.round(offsetX / CARD_INTERVAL)
      const clampedIdx = Math.max(0, Math.min(idx, totalPages - 1))
      setActiveIndex(clampedIdx)

      if (
        hasMore &&
        !isFetchingMore &&
        !loadMoreFiredRef.current &&
        clampedIdx >= totalPages - 1
      ) {
        loadMoreFiredRef.current = true
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        onLoadMore()
      }
    },
    [hasMore, isFetchingMore, totalPages, onLoadMore]
  )

  // Sync scrollX → setActiveIndex để highlight dot đúng
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  )

  // Reset flag khi items thay đổi (data mới đã load)
  useEffect(() => {
    loadMoreFiredRef.current = false
  }, [items.length])

  if (!isLoading && items.length === 0) return null

  return (
    <View className={cn('py-8', bgClass)}>
      {/* Decorative blur orbs */}
      <View className="absolute top-8 right-6 w-28 h-28 bg-emerald-200/20 rounded-full blur-3xl" />
      <View className="absolute bottom-8 left-6 w-32 h-32 bg-green-200/20 rounded-full blur-3xl" />

      {/* Header */}
      <View className="flex-row items-center justify-between mb-6 px-5 z-10">
        <View className="flex-1">
          <Text className="text-2xl font-extrabold tracking-tighter text-zinc-900 dark:text-zinc-50 mb-1 pt-1 leading-tight">
            {title}
          </Text>
          <Text className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {autoSubtitle}
          </Text>
        </View>

        {/* Counter badge */}
        {items.length > 0 && (
          <View className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 mr-2">
            <Text className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              {activeIndex + 1}/{totalPages}
            </Text>
          </View>
        )}

        {/* Fetching indicator */}
        {isFetchingMore && (
          <View className="flex-row items-center gap-1.5">
            <View className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t('home_screen.carousel.loading_more')}
            </Text>
          </View>
        )}
      </View>

      {/* Carousel */}
      {isLoading ? (
        <View className="px-5">
          <View style={{ width: CARD_WIDTH }}>
            <View className="rounded-[28px] overflow-hidden" style={{ height: 320 }}>
              <View className="w-full h-full bg-zinc-200 dark:bg-zinc-800 rounded-[28px]" />
            </View>
          </View>
        </View>
      ) : (
        <>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={CARD_INTERVAL}
            snapToAlignment="start"
            onMomentumScrollEnd={handleMomentumScrollEnd}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
          >
            {items.map((course, i) => {
              const scale = scrollX.interpolate({
                inputRange: [
                  (i - 1) * CARD_INTERVAL,
                  i * CARD_INTERVAL,
                  (i + 1) * CARD_INTERVAL,
                ],
                outputRange: [0.96, 1, 0.96],
                extrapolate: 'clamp',
              })

              const opacity = scrollX.interpolate({
                inputRange: [
                  (i - 1) * CARD_INTERVAL,
                  i * CARD_INTERVAL,
                  (i + 1) * CARD_INTERVAL,
                ],
                outputRange: [0.7, 1, 0.7],
                extrapolate: 'clamp',
              })

              return (
                <Animated.View
                  key={course.id}
                  style={[
                    { width: CARD_WIDTH, marginRight: CARD_GAP },
                    { transform: [{ scale }], opacity },
                  ]}
                >
                  <CourseCard course={course} section={section} />
                </Animated.View>
              )
            })}
          </Animated.ScrollView>

          {/* Dot indicators */}
          {items.length > 1 && (
            <View className="flex-row items-center justify-center gap-1.5 mt-5 px-5">
              {items.map((_, i) => {
                const isActive = i === activeIndex
                return (
                  <View
                    key={`dot-${i}`}
                    className={cn(
                      'rounded-full transition-all duration-200',
                      isActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                    )}
                    style={{ width: isActive ? 20 : 6, height: 6 }}
                  />
                )
              })}
            </View>
          )}

          {/* Load more hint */}
          {hasMore && activeIndex >= totalPages - 1 && !isFetchingMore && (
            <Text className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-3">
              {t('home_screen.carousel.pull_to_load')}
            </Text>
          )}
        </>
      )}
    </View>
  )
}
