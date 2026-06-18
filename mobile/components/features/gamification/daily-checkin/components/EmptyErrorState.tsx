/**
 * EmptyState – Không có sự kiện Check-in đang hoạt động
 * ErrorState – Lỗi mạng hoặc lỗi server
 */

import React from 'react'
import { View, Text as RNText, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { GamificationColors, GamificationRadius } from '../../tokens'

// ─────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  isDark: boolean
}

export function EmptyState({ isDark }: EmptyStateProps) {
  const float = useSharedValue(0)

  React.useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1400 }),
        withTiming(0, { duration: 1400 }),
      ),
      -1,
      false,
    )
  }, [float])

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }))

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: GamificationRadius['2xl'],
        padding: 24,
        alignItems: 'center',
        backgroundColor: isDark
          ? GamificationColors.dark.card
          : GamificationColors.light.card,
        borderWidth: 1,
        borderColor: isDark
          ? GamificationColors.dark.cardBorder
          : GamificationColors.light.cardBorder,
        gap: 12,
      }}
    >
      <Animated.View style={floatStyle}>
        <RNText style={{ fontSize: 42 }}>📅</RNText>
      </Animated.View>

      <RNText
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: isDark ? '#f4f4f5' : '#18181b',
          textAlign: 'center',
          letterSpacing: -0.3,
        }}
      >
        Chưa có sự kiện
      </RNText>
      <RNText
        style={{
          fontSize: 13,
          color: isDark ? '#71717a' : '#a1a1aa',
          textAlign: 'center',
          lineHeight: 19,
        }}
      >
        Hiện không có sự kiện Check-in nào đang diễn ra.{'\n'}
        Quay lại sau nhé! 🙌
      </RNText>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Error State
// ─────────────────────────────────────────────────────────────

interface ErrorStateProps {
  isDark: boolean
  onRetry?: () => void
}

export function ErrorState({ isDark, onRetry }: ErrorStateProps) {
  const pressScale = useSharedValue(1)
  const shakeX = useSharedValue(0)

  React.useEffect(() => {
    shakeX.value = withSequence(
      withTiming(-6, { duration: 80 }),
      withTiming(6, { duration: 80 }),
      withTiming(-4, { duration: 80 }),
      withTiming(4, { duration: 80 }),
      withTiming(0, { duration: 80 }),
    )
  }, [shakeX])

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }))

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: GamificationRadius['2xl'],
        padding: 24,
        alignItems: 'center',
        backgroundColor: isDark
          ? GamificationColors.dark.card
          : GamificationColors.light.card,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(239,68,68,0.20)' : 'rgba(239,68,68,0.15)',
        gap: 12,
      }}
    >
      <Animated.View style={shakeStyle}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: 'rgba(239,68,68,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="wifi-off" size={24} color="#ef4444" />
        </View>
      </Animated.View>

      <RNText
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: isDark ? '#f4f4f5' : '#18181b',
          letterSpacing: -0.2,
        }}
      >
        Không tải được dữ liệu
      </RNText>
      <RNText
        style={{
          fontSize: 13,
          color: isDark ? '#71717a' : '#a1a1aa',
          textAlign: 'center',
          lineHeight: 19,
        }}
      >
        Kiểm tra kết nối và thử lại.
      </RNText>

      {onRetry && (
        <Animated.View style={pressStyle}>
          <Pressable
            onPressIn={() => {
              pressScale.value = withSpring(0.93, { damping: 15, stiffness: 300 })
            }}
            onPressOut={() => {
              pressScale.value = withSpring(1, { damping: 15, stiffness: 300 })
            }}
            onPress={onRetry}
            style={{
              marginTop: 4,
              paddingHorizontal: 28,
              paddingVertical: 11,
              borderRadius: GamificationRadius.xl,
              backgroundColor: GamificationColors.emerald[500],
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Feather name="refresh-cw" size={14} color="#fff" />
            <RNText
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: '#fff',
                letterSpacing: 0.1,
              }}
            >
              Thử lại
            </RNText>
          </Pressable>
        </Animated.View>
      )}
    </View>
  )
}
