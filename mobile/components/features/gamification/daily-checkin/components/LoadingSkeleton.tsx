/**
 * LoadingSkeleton – Shimmer skeleton cho Daily Check-in widget và Bottom Sheet.
 */

import React, { useEffect } from 'react'
import { View, useColorScheme } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { GamificationColors, GamificationRadius } from '../../tokens'

// ─────────────────────────────────────────────────────────────
// Single shimmer bone
// ─────────────────────────────────────────────────────────────

function SkeletonBone({
  width,
  height,
  borderRadius = GamificationRadius.md,
  isDark,
}: {
  width: number | `${number}%`
  height: number
  borderRadius?: number
  isDark: boolean
}) {
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.ease }),
        withTiming(0.4, { duration: 750, easing: Easing.ease }),
      ),
      -1,
      false,
    )
  }, [opacity])

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark
            ? 'rgba(63,63,70,0.60)'
            : 'rgba(228,228,231,0.80)',
        },
        animStyle,
      ]}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Widget Skeleton (compact card on Home)
// ─────────────────────────────────────────────────────────────

export function DailyCheckinWidgetSkeleton() {
  const isDark = useColorScheme() === 'dark'

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: GamificationRadius['2xl'],
        padding: 18,
        backgroundColor: isDark
          ? GamificationColors.dark.card
          : GamificationColors.light.card,
        borderWidth: 1,
        borderColor: isDark
          ? GamificationColors.dark.cardBorder
          : GamificationColors.light.cardBorder,
        gap: 14,
      }}
    >
      {/* Row 1: icon + title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SkeletonBone width={36} height={36} borderRadius={18} isDark={isDark} />
        <View style={{ gap: 6 }}>
          <SkeletonBone width={80} height={11} isDark={isDark} />
          <SkeletonBone width={140} height={16} isDark={isDark} />
        </View>
      </View>

      {/* Row 2: day dots */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[...Array(7)].map((_, i) => (
          <SkeletonBone
            key={i}
            width={32}
            height={32}
            borderRadius={GamificationRadius.sm}
            isDark={isDark}
          />
        ))}
      </View>

      {/* Row 3: button */}
      <SkeletonBone width='100%' height={44} borderRadius={GamificationRadius.xl} isDark={isDark} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Bottom Sheet Skeleton (full detail)
// ─────────────────────────────────────────────────────────────

export function DailyCheckinSheetSkeleton() {
  const isDark = useColorScheme() === 'dark'

  return (
    <View style={{ gap: 20, padding: 4 }}>
      {/* Streak row */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <SkeletonBone width='48%' height={72} borderRadius={GamificationRadius.xl} isDark={isDark} />
        <SkeletonBone width='48%' height={72} borderRadius={GamificationRadius.xl} isDark={isDark} />
      </View>

      {/* Calendar grid */}
      <View>
        <SkeletonBone width={100} height={14} isDark={isDark} />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
          }}
        >
          {[...Array(7)].map((_, i) => (
            <SkeletonBone
              key={i}
              width={44}
              height={64}
              borderRadius={GamificationRadius.md}
              isDark={isDark}
            />
          ))}
        </View>
      </View>

      {/* Reward row */}
      <SkeletonBone width='100%' height={56} borderRadius={GamificationRadius.xl} isDark={isDark} />

      {/* CTA button */}
      <SkeletonBone width='100%' height={52} borderRadius={GamificationRadius.xl} isDark={isDark} />
    </View>
  )
}
