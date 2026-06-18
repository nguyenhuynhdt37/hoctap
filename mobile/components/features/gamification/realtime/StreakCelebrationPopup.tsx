/**
 * StreakCelebrationPopup – Duolingo-style popup khi streak tăng
 *
 * Xuất hiện khi:
 *  • Hoàn thành bài học (lesson.completed → streak.updated)
 *  • Mua khoá học (course.purchased → streak.updated)
 *  • Điểm danh liên tiếp (daily_checkin.completed → streak.updated)
 *
 * Animation:
 *  • Lửa 🔥 zoom scale bounce vào (spring)
 *  • Số streak scale + glow fade-in
 *  • Card slide-up từ dưới
 *  • Haptic rung mạnh
 */

import React, { useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text as RNText,
  Pressable,
  Dimensions,
  StyleSheet,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useColorScheme } from 'nativewind'
import { useStreakToastStore } from './useStreakToastStore'
import { GamificationColors, GamificationRadius, GamificationShadow, GamificationMotion } from '../tokens'

const { width: SW, height: SH } = Dimensions.get('window')

// ─────────────────────────────────────────────────────────────
// Animated Flame Icon
// ─────────────────────────────────────────────────────────────

function AnimatedFlame({ isDark }: { isDark: boolean }) {
  const scale = useSharedValue(0)
  const rotate = useSharedValue(0)
  const glow = useSharedValue(0)

  useEffect(() => {
    // Entry bounce
    scale.value = withSequence(
      withSpring(1.35, { damping: 6, stiffness: 300, mass: 0.6 }),
      withSpring(1.0, { damping: 14, stiffness: 220 }),
    )
    // Subtle sway
    rotate.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(8, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    )
    // Glow pulse
    glow.value = withDelay(200, withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 }),
      ),
      -1,
      true,
    ))

    return () => {
      cancelAnimation(scale)
      cancelAnimation(rotate)
      cancelAnimation(glow)
    }
  }, [glow, rotate, scale])

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }))

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 120 }}>
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          { backgroundColor: isDark ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.10)' },
          glowStyle,
        ]}
      />
      {/* Flame */}
      <Animated.View style={[styles.flameCircle, flameStyle]}>
        <RNText style={styles.flameEmoji}>🔥</RNText>
      </Animated.View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Streak Number (big animated counter)
// ─────────────────────────────────────────────────────────────

function StreakNumber({ count, isDark }: { count: number; isDark: boolean }) {
  const scale = useSharedValue(0.4)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 240 }))
    opacity.value = withDelay(200, withTiming(1, { duration: 250 }))
  }, [count, opacity, scale])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={style}>
      <RNText style={[styles.streakNumber, { color: GamificationColors.streak.DEFAULT }]}>
        {count}
      </RNText>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Popup
// ─────────────────────────────────────────────────────────────

export function StreakCelebrationPopup() {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  const { celebrationVisible, currentStreak, bestStreak, hideCelebration } = useStreakToastStore()

  // Card animation
  const translateY = useSharedValue(120)
  const opacity = useSharedValue(0)
  const backdropOpacity = useSharedValue(0)

  // Button press
  const btnScale = useSharedValue(1)
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }))

  useEffect(() => {
    if (celebrationVisible) {
      backdropOpacity.value = withTiming(1, { duration: 250 })
      translateY.value = withDelay(60, withSpring(0, { damping: 22, stiffness: 200 }))
      opacity.value = withDelay(60, withTiming(1, { duration: 250 }))
      // Haptic
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }, 150)
    } else {
      translateY.value = withTiming(120, { duration: 220, easing: Easing.in(Easing.ease) })
      opacity.value = withTiming(0, { duration: 200 })
      backdropOpacity.value = withTiming(0, { duration: 200 })
    }
  }, [celebrationVisible, backdropOpacity, opacity, translateY])

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))

  const isNewBest = currentStreak > 0 && currentStreak === bestStreak && currentStreak > 1
  const isMilestone = [3, 7, 14, 21, 30, 60, 100, 365].includes(currentStreak)

  const title = isMilestone
    ? `Cột mốc ${currentStreak} ngày! 🏆`
    : isNewBest
    ? 'Kỷ lục mới! 🎉'
    : `Streak ${currentStreak} ngày! 🔥`

  const subtitle = isMilestone
    ? 'Bạn thật sự kiên trì tuyệt vời!'
    : isNewBest
    ? `Kỷ lục chuỗi ngày học của bạn!`
    : 'Tiếp tục học để duy trì chuỗi nhé!'

  if (!celebrationVisible) return null

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={celebrationVisible}
      animationType="none"
      onRequestClose={hideCelebration}
    >
      <Pressable style={{ flex: 1 }} onPress={hideCelebration}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          {/* Card */}
          <Pressable onPress={() => {}} style={styles.cardWrapper}>
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#18181b' : '#ffffff',
                  ...GamificationShadow.streak,
                  shadowRadius: 40,
                  shadowOpacity: 0.3,
                  elevation: 24,
                },
                cardStyle,
              ]}
            >
              {/* Flame */}
              <AnimatedFlame isDark={isDark} />

              {/* Streak count */}
              <View style={styles.streakRow}>
                <StreakNumber count={currentStreak} isDark={isDark} />
                <RNText style={[styles.dayLabel, { color: isDark ? '#a1a1aa' : '#71717a' }]}>
                  {' ngày liên tiếp'}
                </RNText>
              </View>

              {/* Title + Subtitle */}
              <View style={styles.textBlock}>
                <RNText style={[styles.title, { color: isDark ? '#f4f4f5' : '#18181b' }]}>
                  {title}
                </RNText>
                <RNText style={[styles.subtitle, { color: isDark ? '#71717a' : '#a1a1aa' }]}>
                  {subtitle}
                </RNText>
              </View>

              {/* Best streak badge (nếu là kỷ lục mới) */}
              {isNewBest && bestStreak > 1 && (
                <View
                  style={[
                    styles.bestBadge,
                    {
                      backgroundColor: isDark
                        ? 'rgba(249,115,22,0.12)'
                        : 'rgba(249,115,22,0.08)',
                      borderColor: 'rgba(249,115,22,0.25)',
                    },
                  ]}
                >
                  <RNText style={{ fontSize: 16 }}>🏆</RNText>
                  <RNText style={[styles.bestText, { color: GamificationColors.streak.DEFAULT }]}>
                    Kỷ lục cá nhân: {bestStreak} ngày
                  </RNText>
                </View>
              )}

              {/* CTA Button */}
              <Animated.View style={[{ width: '100%' }, btnStyle]}>
                <Pressable
                  onPressIn={() => {
                    btnScale.value = withSpring(0.96, GamificationMotion.press)
                    Haptics.selectionAsync()
                  }}
                  onPressOut={() => {
                    btnScale.value = withSpring(1, GamificationMotion.press)
                  }}
                  onPress={hideCelebration}
                  style={[
                    styles.btn,
                    {
                      backgroundColor: GamificationColors.streak.DEFAULT,
                      shadowColor: GamificationColors.streak.glow,
                    },
                  ]}
                >
                  <RNText style={styles.btnText}>
                    {isMilestone ? 'Tuyệt vời! 🏆' : 'Tiếp tục học! 💪'}
                  </RNText>
                </Pressable>
              </Animated.View>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    width: '100%',
    borderRadius: GamificationRadius['3xl'],
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  flameCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(249,115,22,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(249,115,22,0.20)',
  },
  flameEmoji: {
    fontSize: 52,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: -8,
  },
  streakNumber: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -3,
    lineHeight: 80,
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingBottom: 8,
  },
  textBlock: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: GamificationRadius.xl,
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  bestText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  btn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: GamificationRadius.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  btnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.1,
  },
})
