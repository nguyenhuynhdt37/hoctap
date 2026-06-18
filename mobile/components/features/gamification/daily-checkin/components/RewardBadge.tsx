/**
 * RewardBadge – Hiển thị phần thưởng (Peak, Mystery Box, Badge…)
 * Dùng ở: Bottom Sheet, Calendar tooltip, Reward Popup
 */

import React from 'react'
import { View, Text as RNText, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import type { RewardDTO } from '../types'
import { GamificationColors, GamificationRadius, GamificationShadow } from '../../tokens'

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

interface RewardBadgeProps {
  reward: RewardDTO
  isDark: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Animate in on mount */
  animated?: boolean
}

export function RewardBadge({ reward, isDark, size = 'md', animated = false }: RewardBadgeProps) {
  const isMystery = reward.reward_type === 'mystery_box'
  const isPeak = reward.reward_type === 'peak_wallet' || reward.reward_type === 'peak'

  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 }],
    opacity: 1,
  }))

  const sz = SIZE_MAP[size]

  return (
    <Animated.View style={animStyle}>
      <View
        style={[
          styles.container,
          {
            paddingHorizontal: sz.px,
            paddingVertical: sz.py,
            borderRadius: GamificationRadius.xl,
            backgroundColor: isMystery
              ? GamificationColors.mystery.bg
              : isPeak
                ? isDark ? 'rgba(245,158,11,0.15)' : 'rgba(254,243,199,0.90)'
                : isDark ? 'rgba(16,185,129,0.12)' : 'rgba(236,253,245,0.90)',
            borderWidth: 1.5,
            borderColor: isMystery
              ? GamificationColors.mystery.border
              : isPeak
                ? 'rgba(245,158,11,0.35)'
                : 'rgba(16,185,129,0.25)',
          },
          isPeak && !isMystery && GamificationShadow.peak,
        ]}
      >
        {/* Icon */}
        {isMystery ? (
          <View
            style={{
              width: sz.iconSize + 6,
              height: sz.iconSize + 6,
              borderRadius: (sz.iconSize + 6) / 2,
              backgroundColor: 'rgba(139,92,246,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="gift" size={sz.iconSize - 2} color="#7c3aed" />
          </View>
        ) : isPeak ? (
          <View
            style={{
              width: sz.iconSize + 6,
              height: sz.iconSize + 6,
              borderRadius: (sz.iconSize + 6) / 2,
              backgroundColor: 'rgba(245,158,11,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="star" size={sz.iconSize - 2} color={GamificationColors.peak.DEFAULT} />
          </View>
        ) : (
          <Feather name="award" size={sz.iconSize} color={GamificationColors.emerald[500]} />
        )}

        {/* Label */}
        {isPeak && reward.reward_amount != null ? (
          <View style={{ marginLeft: 8 }}>
            <RNText
              style={{
                fontSize: sz.amountSize,
                fontWeight: '900',
                color: isMystery
                  ? GamificationColors.mystery.icon
                  : GamificationColors.peak.DEFAULT,
                letterSpacing: -0.5,
              }}
            >
              +{reward.reward_amount}
            </RNText>
            <RNText
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: isDark ? '#a1a1aa' : '#71717a',
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              PEAK
            </RNText>
          </View>
        ) : isMystery ? (
          <RNText
            style={{
              marginLeft: 8,
              fontSize: sz.labelSize,
              fontWeight: '700',
              color: GamificationColors.mystery.icon,
            }}
          >
            Mystery Box
          </RNText>
        ) : null}
      </View>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────
// Streak badge (fire + number)
// ─────────────────────────────────────────────────────────────

interface StreakBadgeProps {
  streak: number
  label: string
  isDark: boolean
}

export function StreakBadge({ streak, label, isDark }: StreakBadgeProps) {
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 }] }))

  return (
    <Animated.View
      style={[
        animStyle,
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 16,
          paddingHorizontal: 12,
          borderRadius: GamificationRadius.xl,
          backgroundColor: isDark
            ? 'rgba(249,115,22,0.12)'
            : 'rgba(255,237,213,0.80)',
          borderWidth: 1.5,
          borderColor: isDark ? 'rgba(249,115,22,0.30)' : 'rgba(249,115,22,0.25)',
        },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: 'rgba(249,115,22,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Feather name="zap" size={18} color={GamificationColors.streak.DEFAULT} />
      </View>
      <RNText
        style={{
          fontSize: 28,
          fontWeight: '900',
          color: GamificationColors.streak.DEFAULT,
          letterSpacing: -1,
          marginTop: 2,
        }}
      >
        {streak}
      </RNText>
      <RNText
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: isDark ? '#a1a1aa' : '#71717a',
          marginTop: 2,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </RNText>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────
// SIZE MAP
// ─────────────────────────────────────────────────────────────

const SIZE_MAP = {
  sm: { px: 10, py: 6, iconSize: 14, amountSize: 16, labelSize: 12 },
  md: { px: 16, py: 10, iconSize: 18, amountSize: 22, labelSize: 14 },
  lg: { px: 22, py: 14, iconSize: 24, amountSize: 28, labelSize: 16 },
} as const

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
