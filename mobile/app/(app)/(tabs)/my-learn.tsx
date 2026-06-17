import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  ScrollView,
  Animated,
  TextInput,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
  RefreshControl,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import { Screen } from '@/components/layout/Screen'
import { cn } from '@/src/lib/utils'
import { purchaseService, type GetMyCoursesParams } from '@/src/services/course.service'
import type { MyCourseItem } from '@/src/types/course'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_GAP = 12
const SIDE_PADDING = 20
const CARD_WIDTH = SCREEN_W - SIDE_PADDING * 2
const CARD_INTERVAL = CARD_WIDTH + CARD_GAP

const SORT_OPTIONS: { label: string; value: GetMyCoursesParams['sort_by'] }[] = [
  { label: 'Đăng ký', value: 'enrolled_at' },
  { label: 'Mới', value: 'created_at' },
  { label: 'Đánh giá', value: 'rating_avg' },
  { label: 'Tiến độ', value: 'progress' },
]

// ── My Course Card (matches CourseCard style from home) ─────────────────────────
function MyCourseCard({ course }: { course: MyCourseItem }) {
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
    // Khóa học đã đăng ký → chuyển thẳng sang trang học
    router.push(`/learning/${course.slug}` as any)
  }

  const badgeLabel = isCompleted ? 'Hoàn thành' : isStarted ? 'Đang học' : 'Bắt đầu'
  const badgeBg = isCompleted ? '#10B981' : isStarted ? '#F59E0B' : '#3B82F6'

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        className="rounded-[28px] overflow-hidden shadow-xl shadow-black/10"
      >
        {/* Thumbnail */}
        <View className="relative" style={{ height: 220 }}>
          {course.thumbnail_url ? (
            <Animated.Image
              source={{ uri: course.thumbnail_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-emerald-500/20">
              <Feather name="play-circle" size={64} color="#10b981" />
            </View>
          )}

          {/* Overlay */}
          <View className="absolute inset-0 bg-black/40" />
          <View className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Badge */}
          <View className="absolute top-3.5 left-4 z-10">
            <View
              className="px-3 py-1.5 rounded-full"
              style={{ backgroundColor: badgeBg }}
            >
              <Text className="text-xs font-bold text-white uppercase tracking-widest">
                {badgeLabel}
              </Text>
            </View>
          </View>

          {/* Progress */}
          <View className="absolute top-3.5 right-4 z-10">
            <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30">
              <Feather name="clock" size={10} color="#FBBF24" />
              <Text className="text-xs font-bold text-white/90">
                {Math.round(progress)}%
              </Text>
            </View>
          </View>

          {/* Bottom */}
          <View className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
            <Text
              className="text-xl font-extrabold text-white leading-tight mb-3"
              numberOfLines={2}
              style={{ textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 }}
            >
              {course.title}
            </Text>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1">
                {course.category_name && (
                  <View className="px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-sm">
                    <Text className="text-[9px] font-bold text-white/90 uppercase tracking-wide">
                      {course.category_name}
                    </Text>
                  </View>
                )}
                {course.level && (
                  <View className="px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-sm">
                    <Text className="text-[9px] font-bold text-white/90 uppercase tracking-wide">
                      {course.level}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center gap-2">
                {course.avg_rating > 0 && (
                  <View className="flex-row items-center gap-1">
                    <Feather name="star" size={12} color="#FBBF24" />
                    <Text className="text-xs font-bold text-white/90">
                      {course.avg_rating.toFixed(1)}
                    </Text>
                  </View>
                )}
                <View className="w-9 h-9 rounded-full bg-emerald-500 items-center justify-center shadow-sm shadow-emerald-500/40">
                  <Feather
                    name={isCompleted ? 'check' : isStarted ? 'arrow-right' : 'play'}
                    size={18}
                    color="white"
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ── Loading Skeleton ────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  const shimmerAnim = useRef(new Animated.Value(0)).current

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
    <View className="px-5">
      <Animated.View style={[styles.cardWrapper, { opacity }]}>
        <View className="rounded-[28px] overflow-hidden" style={{ height: 320 }}>
          <View className="w-full h-full bg-zinc-200 dark:bg-zinc-800 rounded-[28px]" />
        </View>
      </Animated.View>
    </View>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState({ onExplore }: { onExplore: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-32 h-32 rounded-full bg-emerald-50 dark:bg-emerald-900/20 items-center justify-center mb-6">
        <Feather name="book-open" size={56} color="#10B981" />
      </View>
      <Text className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 text-center mb-2">
        Chưa có khóa học nào
      </Text>
      <Text className="text-sm text-emerald-600 dark:text-emerald-400 text-center mb-8">
        Hãy đăng ký khóa học để bắt đầu hành trình!
      </Text>
      <Pressable
        onPress={onExplore}
        className="px-6 py-3 rounded-full bg-emerald-500 flex-row items-center shadow-lg shadow-emerald-500/30"
      >
        <Feather name="compass" size={18} color="#FFFFFF" />
        <Text className="text-white text-sm font-bold ml-2">Khám phá ngay</Text>
      </Pressable>
    </View>
  )
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string
  subtitle?: string
  count?: number
}) {
  return (
    <View className="px-5 mb-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-2xl font-extrabold tracking-tighter text-zinc-900 dark:text-zinc-50 mb-1">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {subtitle}
            </Text>
          )}
        </View>
        {count !== undefined && count > 0 && (
          <View className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 mr-2">
            <Text className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              {count}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ── Search Bar ─────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View className="px-5 mb-4">
      <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800">
        <Feather name="search" size={20} color="#9CA3AF" />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Tìm kiếm khóa học..."
          placeholderTextColor="#9CA3AF"
          className="flex-1 ml-3 text-base text-gray-900 dark:text-white"
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChange('')} hitSlop={8}>
            <Feather name="x-circle" size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>
    </View>
  )
}

// ── Sort Chips ─────────────────────────────────────────────────────────────────
function SortChips({
  sortBy,
  order,
  onSortChange,
  onOrderToggle,
}: {
  sortBy: GetMyCoursesParams['sort_by']
  order: GetMyCoursesParams['order']
  onSortChange: (v: GetMyCoursesParams['sort_by']) => void
  onOrderToggle: () => void
}) {
  return (
    <View className="flex-row items-center gap-2 px-5 mb-6 overflow-x-auto pb-2">
      {SORT_OPTIONS.map(option => (
        <Pressable
          key={option.value}
          onPress={() => onSortChange(option.value)}
          className={cn(
            'px-4 py-2 rounded-full flex-shrink-0',
            sortBy === option.value
              ? 'bg-emerald-500'
              : 'bg-gray-100 dark:bg-zinc-800'
          )}
        >
          <Text
            className={cn(
              'text-sm font-medium',
              sortBy === option.value
                ? 'text-white'
                : 'text-gray-600 dark:text-zinc-400'
            )}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
      <Pressable
        onPress={onOrderToggle}
        className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center flex-shrink-0"
      >
        <Feather
          name={order === 'desc' ? 'arrow-down' : 'arrow-up'}
          size={16}
          color="#6B7280"
        />
      </Pressable>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MyLearnScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isDark = useColorScheme() === 'dark'
  const scrollRef = useRef<ScrollView>(null)
  const scrollX = useRef(new Animated.Value(0)).current
  const [activeIndex, setActiveIndex] = useState(0)

  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<GetMyCoursesParams['sort_by']>('enrolled_at')
  const [order, setOrder] = useState<GetMyCoursesParams['order']>('desc')
  const [refreshing, setRefreshing] = useState(false)

  const queryParams: GetMyCoursesParams = {
    page: 1,
    size: 50,
    keyword: keyword || undefined,
    sort_by: sortBy,
    order,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-courses', queryParams],
    queryFn: () => purchaseService.getMyCourses(queryParams).then(r => r.data),
  })

  const courses = data?.courses ?? []
  const inProgressCourses = courses.filter(c => {
    const p = c.progress_percent ?? 0
    return p > 0 && p < 100
  })
  const completedCourses = courses.filter(c => (c.progress_percent ?? 0) >= 100)

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x
      const idx = Math.round(offsetX / CARD_INTERVAL)
      const clampedIdx = Math.max(0, Math.min(idx, Math.max(0, courses.length - 1)))
      setActiveIndex(clampedIdx)
    },
    [courses.length]
  )

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    refetch()
    setTimeout(() => setRefreshing(false), 500)
  }, [refetch])

  // Render carousel items with scale/opacity animation
  const renderCarouselItems = () => (
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
      {courses.map((course, i) => {
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
            <MyCourseCard course={course} />
          </Animated.View>
        )
      })}
    </Animated.ScrollView>
  )

  return (
    <Screen safeArea withTabBar>
      <ScrollView
        ref={scrollRef as any}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#10B981' : '#10B981'}
            colors={['#10B981']}
          />
        }
      >
        {/* Header */}
        <View className="px-5 pt-3 pb-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-0.5">
                Học tập
              </Text>
              <Text className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                Khóa học của tôi
              </Text>
            </View>
            <View className="w-14 h-14 rounded-2xl bg-emerald-500 items-center justify-center shadow-lg shadow-emerald-500/30">
              <Feather name="book-open" size={28} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Search */}
        <SearchBar value={keyword} onChange={setKeyword} />

        {/* Sort */}
        <SortChips
          sortBy={sortBy}
          order={order}
          onSortChange={setSortBy}
          onOrderToggle={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')}
        />

        {/* Loading */}
        {isLoading && (
          <View className="pb-8">
            <SectionHeader title="Đang tải..." />
            <LoadingSkeleton />
          </View>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <View className="flex-1 items-center justify-center py-16 px-8">
            <View className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/30 items-center justify-center mb-4">
              <Feather name="wifi-off" size={36} color="#EF4444" />
            </View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Kết nối thất bại
            </Text>
            <Pressable
              onPress={() => refetch()}
              className="px-6 py-3 rounded-full bg-emerald-500 mt-2"
            >
              <Text className="text-white text-sm font-bold">Thử lại</Text>
            </Pressable>
          </View>
        )}

        {/* Empty */}
        {!isLoading && !isError && courses.length === 0 && (
          <EmptyState onExplore={() => router.push('/(app)/explore' as any)} />
        )}

        {/* Courses Carousel */}
        {!isLoading && !isError && courses.length > 0 && (
          <View className="pb-8">
            {/* Stats summary */}
            <View className="px-5 mb-6">
              <View className="flex-row items-center gap-3">
                <StatBadge icon="book" value={courses.length} label="Tổng" color="#10B981" />
                <StatBadge icon="play-circle" value={inProgressCourses.length} label="Đang học" color="#F59E0B" />
                <StatBadge icon="check-circle" value={completedCourses.length} label="Hoàn thành" color="#22C55E" />
              </View>
            </View>

            {/* Carousel */}
            <View className="pb-4">
              <SectionHeader
                title="Tiếp tục học"
                subtitle="Kéo để xem tất cả khóa học"
                count={courses.length}
              />

              {renderCarouselItems()}

              {/* Dot indicators */}
              {courses.length > 1 && (
                <View className="flex-row items-center justify-center gap-1.5 mt-5">
                  {courses.map((_, i) => {
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
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

// ── Stat Badge ─────────────────────────────────────────────────────────────────
function StatBadge({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Feather.glyphMap
  value: number
  label: string
  color: string
}) {
  return (
    <View className="flex-1 py-3 px-3 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-gray-100 dark:border-zinc-800 items-center">
      <Feather name={icon} size={18} color={color} />
      <Text className="text-lg font-black text-gray-900 dark:text-white mt-1">{value}</Text>
      <Text className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  cardWrapper: { width: '100%' },
})
