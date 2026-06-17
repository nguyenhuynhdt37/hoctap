import React, { useRef, useCallback, useState } from 'react'
import {
  View,
  Pressable,
  Animated,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import { cn } from '@/src/lib/utils'
import { courseService } from '@/src/services/course.service'
import { getFullImageUrl } from '@/src/utils/image'
import type { NewestCourse } from '@/src/types/course'

export type CourseSectionType = 'top' | 'trending' | 'newest' | 'featured' | 'recommended'

const THUMBNAIL_H = 260

const SECTION_BADGE: Record<CourseSectionType, { label: string; bg: string }> = {
  top: { label: 'Top', bg: '#22c55e' },
  trending: { label: 'Thịnh hành', bg: '#10b981' },
  newest: { label: 'Mới', bg: '#16a34a' },
  featured: { label: 'Nổi bật', bg: '#22c55e' },
  recommended: { label: 'Gợi ý', bg: '#14b8a6' },
}

interface CourseCardProps {
  course: NewestCourse
  section?: CourseSectionType
  onPress?: (course: NewestCourse) => void
}

export function CourseCard({ course, section = 'newest', onPress }: CourseCardProps) {
  const router = useRouter()
  const scaleAnim = useRef(new Animated.Value(1)).current
  const [isChecking, setIsChecking] = useState(false)

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

  const checkEnrollmentAndNavigate = useCallback(async () => {
    if (isChecking) return
    setIsChecking(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const { data } = await courseService.checkEnrollment(course.id)
      if (data.is_enroll) {
        // Đã đăng ký → chuyển sang trang học
        router.push(`/learning/${course.slug}` as any)
      } else {
        // Chưa đăng ký → chuyển sang trang mua
        router.push(`/course/${course.slug}` as any)
      }
    } catch {
      // Lỗi network → thử chuyển sang learning trước
      // Backend sẽ trả 403 nếu chưa enroll
      try {
        router.push(`/learning/${course.slug}` as any)
      } catch {
        // Nếu vẫn lỗi → chuyển sang trang course
        router.push(`/course/${course.slug}` as any)
      }
    } finally {
      setIsChecking(false)
    }
  }, [course.id, course.slug, isChecking, router])

  const handlePress = () => {
    if (onPress) {
      onPress(course)
    } else {
      checkEnrollmentAndNavigate()
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return 'Miễn phí'
    return `${price.toLocaleString('en-US')}đ`
  }

  const badge = SECTION_BADGE[section]

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        className={cn('rounded-[28px] overflow-hidden shadow-xl shadow-black/10')}
      >
        {/* ── Full-height thumbnail with gradient overlay ── */}
        <View className="relative" style={{ height: THUMBNAIL_H }}>
          {course.thumbnail ? (
            <Image
              source={{ uri: getFullImageUrl(course.thumbnail) as string }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-emerald-500/20">
              <Feather name="play-circle" size={64} color="#10b981" />
            </View>
          )}

          {/* Dark overlay for text readability */}
          <View className="absolute inset-0 bg-black/40" />

          {/* Gradient: transparent at top, dark at bottom */}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
            className="absolute inset-0"
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Loading overlay */}
          {isChecking && (
            <View className="absolute inset-0 bg-black/50 items-center justify-center z-10">
              <ActivityIndicator color="#ffffff" size="small" />
            </View>
          )}

          {/* Top-left: section badge */}
          <View className="absolute top-3.5 left-4 z-10">
            <View
              className="px-3 py-1.5 rounded-full"
              style={{ backgroundColor: badge.bg }}
            >
              <Text className="text-xs font-bold text-white uppercase tracking-widest">
                {badge.label}
              </Text>
            </View>
          </View>

          {/* Top-right: stats pill */}
          <View className="absolute top-3.5 right-4 z-10">
            <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30">
              <Feather name="star" size={10} color="#fbbf24" />
              <Text className="text-xs font-bold text-white/90">
                {course.rating > 0 ? course.rating.toFixed(1) : 'Mới'}
              </Text>
              <Text className="text-xs text-white/60">•</Text>
              <Text className="text-xs text-white/70">
                {course.enrolls > 0 ? `${(course.enrolls / 1000).toFixed(1)}K HV` : '0 HV'}
              </Text>
            </View>
          </View>

          {/* Bottom: title + instructor + price */}
          <View className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
            {/* Tags */}
            {course.tags && course.tags.length > 0 && (
              <View className="flex-row gap-1.5 mb-3">
                {course.tags.slice(0, 2).map((tag, i) => (
                  <View key={i} className="px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-sm">
                    <Text className="text-[9px] font-bold text-white/90 uppercase tracking-wide">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Title */}
            <Text
              className="text-xl font-extrabold text-white leading-tight mb-3"
              numberOfLines={2}
              style={{ textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 }}
            >
              {course.title}
            </Text>

            {/* Instructor + price row */}
            <View className="flex-row items-center justify-between">
              {course.instructor && (
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="w-8 h-8 rounded-full bg-white/20 overflow-hidden items-center justify-center border border-white/25">
                    {course.instructor.avatar ? (
                      <Image
                        source={{ uri: getFullImageUrl(course.instructor.avatar) as string }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Feather name="user" size={14} color="white" />
                    )}
                  </View>
                  <Text className="text-xs font-semibold text-white/80" numberOfLines={1}>
                    {course.instructor.name}
                  </Text>
                </View>
              )}

              {/* Price + arrow */}
              <View className="flex-row items-center gap-2">
                <Text
                  className={cn(
                    'text-base font-bold',
                    course.base_price === 0 ? 'text-emerald-300' : 'text-white'
                  )}
                >
                  {formatPrice(course.base_price)}
                </Text>
                <View className="w-9 h-9 rounded-full bg-emerald-500 items-center justify-center shadow-sm shadow-emerald-500/40">
                  <Feather name="chevron-right" size={18} color="white" />
                </View>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ── Skeleton Card ──────────────────────────────────────────────────────────────
export function CourseCardSkeleton() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] })

  return (
    <Animated.View style={[styles.cardWrapper, { opacity }]}>
      <View className="rounded-[28px] overflow-hidden bg-zinc-200 dark:bg-zinc-800" style={{ height: THUMBNAIL_H }} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  cardWrapper: { width: '100%' },
})
