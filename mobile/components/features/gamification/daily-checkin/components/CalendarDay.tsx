/**
 * CalendarDay – Ô ngày trong lịch Check-in.
 * Trạng thái: checked | today | mystery | locked
 * Dùng Feather icons hoàn toàn – không emoji.
 */

import React, { useEffect } from 'react'
import { View, Text as RNText, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Feather } from '@expo/vector-icons'
import type { CalendarDayDTO, CalendarDayStatus } from '../types'
import { GamificationColors, GamificationRadius, GamificationMotion } from '../../tokens'

// ─────────────────────────────────────────────────────────────
// Helper: derive display status from DTO
// ─────────────────────────────────────────────────────────────

export function getCalendarDayStatus(
  day: CalendarDayDTO,
  currentDayInCycle: number,
): CalendarDayStatus {
  if (day.is_checked) return 'checked'
  if (day.day_number === currentDayInCycle) return 'today'
  if (day.reward?.reward_type === 'mystery_box') return 'mystery'
  return 'locked'
}

// ─────────────────────────────────────────────────────────────
// Icon per status
// ─────────────────────────────────────────────────────────────

function DayIcon({ status, isDark }: { status: CalendarDayStatus; isDark: boolean }) {
  switch (status) {
    case 'checked':
      return <Feather name="check-circle" size={18} color="#fff" />
    case 'today':
      return (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: 'rgba(16,185,129,0.20)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="star" size={13} color={GamificationColors.emerald[500]} />
        </View>
      )
    case 'mystery':
      return (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            backgroundColor: 'rgba(139,92,246,0.20)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="gift" size={13} color="#7c3aed" />
        </View>
      )
    case 'locked':
    default:
      return (
        <Feather
          name="lock"
          size={13}
          color={isDark ? '#52525b' : '#a1a1aa'}
        />
      )
  }
}

// ─────────────────────────────────────────────────────────────
// CalendarDay component
// ─────────────────────────────────────────────────────────────

interface CalendarDayProps {
  day: CalendarDayDTO
  status: CalendarDayStatus
  isDark: boolean
  index?: number
}
export function CalendarDay({ day, status, isDark, index = 0 }: CalendarDayProps) {
  // Static values for scale, opacity, pulse, pressScale (no animation)
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)
  const pulse = useSharedValue(1)
  const pressScale = useSharedValue(1)

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 }],
    opacity: 1,
  }))

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 }],
  }))

  const onPressIn = () => {
    Haptics.selectionAsync()
  }
  const onPressOut = () => {}

  const styles = getStatusStyle(status, isDark)
  const isMystery = day.reward?.reward_type === 'mystery_box'
  const peakAmount = day.reward?.reward_amount

  return (
    <Animated.View style={containerStyle}>
      <Animated.View style={pressStyle}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={{
            width: 44,
            height: 68,
            borderRadius: GamificationRadius.md,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
            backgroundColor: styles.bg,
            borderWidth: 1.5,
            borderColor: styles.border,
            ...(styles.shadow || {}),
          }}
        >
          {/* Day label */}
          <RNText
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: styles.textColor,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            N{day.day_number}
          </RNText>

          {/* Center icon */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <DayIcon status={status} isDark={isDark} />
          </View>

          {/* Amount */}
          {!isMystery && peakAmount != null ? (
            <RNText
              style={{
                fontSize: 9,
                fontWeight: '800',
                color: styles.amountColor,
                letterSpacing: -0.2,
              }}
            >
              +{peakAmount}
            </RNText>
          ) : isMystery ? (
            <RNText
              style={{
                fontSize: 8,
                fontWeight: '700',
                color: '#7c3aed',
                letterSpacing: 0.1,
              }}
            >
              BOX
            </RNText>
          ) : (
            <View style={{ height: 11 }} />
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────
// Status styles
// ─────────────────────────────────────────────────────────────

function getStatusStyle(status: CalendarDayStatus, isDark: boolean) {
  switch (status) {
    case 'checked':
      return {
        bg: GamificationColors.emerald[500],
        border: GamificationColors.emerald[600],
        textColor: 'rgba(255,255,255,0.85)',
        amountColor: '#fff',
        shadow: {
          shadowColor: GamificationColors.checked.glow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.45,
          shadowRadius: 8,
          elevation: 6,
        },
      }
    case 'today':
      return {
        bg: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.10)',
        border: GamificationColors.emerald[500],
        textColor: GamificationColors.emerald[600],
        amountColor: GamificationColors.emerald[600],
        shadow: {
          shadowColor: GamificationColors.emerald[500],
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 5,
        },
      }
    case 'mystery':
      return {
        bg: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)',
        border: 'rgba(139,92,246,0.40)',
        textColor: '#7c3aed',
        amountColor: '#7c3aed',
        shadow: {
          shadowColor: 'rgba(139,92,246,0.40)',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 4,
        },
      }
    case 'locked':
    default:
      return {
        bg: isDark ? 'rgba(39,39,42,0.50)' : 'rgba(244,244,245,0.80)',
        border: isDark ? 'rgba(63,63,70,0.40)' : 'rgba(228,228,231,0.80)',
        textColor: isDark ? '#52525b' : '#a1a1aa',
        amountColor: isDark ? '#52525b' : '#a1a1aa',
        shadow: undefined,
      }
  }
}
