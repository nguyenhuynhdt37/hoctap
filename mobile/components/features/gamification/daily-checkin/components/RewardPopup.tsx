/**
 * RewardPopup – Modal xuất hiện khi check-in thành công.
 *
 * Gồm:
 *  • Confetti (react-native-confetti-cannon)
 *  • Check circle animation
 *  • Reward badge lớn
 *  • Streak info
 *  • Nút đóng
 */

import React, { useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text as RNText,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import ConfettiCannon from 'react-native-confetti-cannon'
import { Feather } from '@expo/vector-icons'
import { RewardBadge } from './RewardBadge'
import type { CheckinClaimResponse } from '../types'
import { GamificationColors, GamificationRadius, GamificationMotion } from '../../tokens'

const { width: SW, height: SH } = Dimensions.get('window')

// ─────────────────────────────────────────────────────────────
// Animated check circle
// ─────────────────────────────────────────────────────────────

function CheckCircle() {
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)
  const ringScale = useSharedValue(0.5)
  const ringOpacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 280 }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    )
    opacity.value = withTiming(1, { duration: 200 })
    // Ring expand
    ringScale.value = withDelay(100, withSpring(2.0, { damping: 12, stiffness: 120 }))
    ringOpacity.value = withSequence(
      withDelay(100, withTiming(0.6, { duration: 200 })),
      withDelay(200, withTiming(0, { duration: 400 })),
    )
  }, [opacity, ringOpacity, ringScale, scale])

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }))

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 88 }}>
      {/* Ring pulse */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 72,
            height: 72,
            borderRadius: 36,
            borderWidth: 3,
            borderColor: GamificationColors.emerald[400],
          },
          ringStyle,
        ]}
      />
      {/* Check circle */}
      <Animated.View
        style={[
          {
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: GamificationColors.emerald[500],
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: GamificationColors.checked.glow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.50,
            shadowRadius: 20,
            elevation: 12,
          },
          circleStyle,
        ]}
      >
        <Feather name="check" size={36} color="#fff" strokeWidth={3} />
      </Animated.View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// RewardPopup
// ─────────────────────────────────────────────────────────────

interface RewardPopupProps {
  visible: boolean
  result: CheckinClaimResponse | null
  isDark: boolean
  onClose: () => void
}

export function RewardPopup({ visible, result, isDark, onClose }: RewardPopupProps) {
  const confettiRef = useRef<ConfettiCannon>(null)

  // Card slide-up + fade
  const translateY = useSharedValue(80)
  const opacity = useSharedValue(0)
  const backdropOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 250 })
      translateY.value = withDelay(
        80,
        withSpring(0, { damping: 22, stiffness: 200 }),
      )
      opacity.value = withDelay(80, withTiming(1, { duration: 250 }))

      // Haptic
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }, 200)

      // Confetti
      setTimeout(() => {
        confettiRef.current?.start()
      }, 350)
    } else {
      translateY.value = withTiming(80, { duration: 200, easing: Easing.in(Easing.ease) })
      opacity.value = withTiming(0, { duration: 200 })
      backdropOpacity.value = withTiming(0, { duration: 200 })
    }
  }, [visible, backdropOpacity, opacity, translateY])

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))

  // Press close scale
  const closeScale = useSharedValue(1)
  const closeStyle = useAnimatedStyle(() => ({ transform: [{ scale: closeScale.value }] }))

  if (!visible || !result) return null

  const isMystery = result.reward?.reward_type === 'mystery_box'

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <Animated.View
          style={[
            {
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 24,
            },
            backdropStyle,
          ]}
        >
          {/* Card */}
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
            <Animated.View
              style={[
                {
                  width: '100%',
                  borderRadius: GamificationRadius['3xl'],
                  padding: 28,
                  alignItems: 'center',
                  gap: 20,
                  backgroundColor: isDark ? '#18181b' : '#ffffff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.25,
                  shadowRadius: 40,
                  elevation: 24,
                },
                cardStyle,
              ]}
            >
              {/* Check */}
              <CheckCircle />

              {/* Title */}
              <View style={{ alignItems: 'center', gap: 6 }}>
                <RNText
                  style={{
                    fontSize: 24,
                    fontWeight: '800',
                    color: isDark ? '#f4f4f5' : '#18181b',
                    letterSpacing: -0.5,
                    textAlign: 'center',
                  }}
                >
                  Check-in thành công! 🎉
                </RNText>
                <RNText
                  style={{
                    fontSize: 14,
                    color: isDark ? '#71717a' : '#a1a1aa',
                    textAlign: 'center',
                    lineHeight: 20,
                  }}
                >
                  Ngày {result.current_day} / 7 trong chu kỳ
                </RNText>
              </View>

              {/* Reward */}
              {result.reward && (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <RNText
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: isDark ? '#71717a' : '#a1a1aa',
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    Phần thưởng hôm nay
                  </RNText>
                  <RewardBadge reward={result.reward} isDark={isDark} size="lg" animated />
                </View>
              )}

              {/* Streak */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  width: '100%',
                }}
              >
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderRadius: GamificationRadius.xl,
                    backgroundColor: isDark ? 'rgba(249,115,22,0.12)' : 'rgba(255,237,213,0.80)',
                    borderWidth: 1,
                    borderColor: 'rgba(249,115,22,0.25)',
                    gap: 2,
                  }}
                >
                  <RNText style={{ fontSize: 22 }}>🔥</RNText>
                  <RNText
                    style={{
                      fontSize: 22,
                      fontWeight: '900',
                      color: GamificationColors.streak.DEFAULT,
                      letterSpacing: -0.8,
                    }}
                  >
                    {result.current_streak}
                  </RNText>
                  <RNText
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: isDark ? '#71717a' : '#a1a1aa',
                    }}
                  >
                    Streak hiện tại
                  </RNText>
                </View>
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderRadius: GamificationRadius.xl,
                    backgroundColor: isDark
                      ? 'rgba(16,185,129,0.10)'
                      : 'rgba(236,253,245,0.80)',
                    borderWidth: 1,
                    borderColor: 'rgba(16,185,129,0.20)',
                    gap: 2,
                  }}
                >
                  <RNText style={{ fontSize: 22 }}>⭐</RNText>
                  <RNText
                    style={{
                      fontSize: 22,
                      fontWeight: '900',
                      color: GamificationColors.peak.DEFAULT,
                      letterSpacing: -0.8,
                    }}
                  >
                    {result.current_peak_balance.toLocaleString('vi-VN')}
                  </RNText>
                  <RNText
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color: isDark ? '#71717a' : '#a1a1aa',
                    }}
                  >
                    Số dư Peak
                  </RNText>
                </View>
              </View>

              {/* Close button */}
              <Animated.View style={[{ width: '100%' }, closeStyle]}>
                <Pressable
                  onPressIn={() => {
                    closeScale.value = withSpring(0.96, GamificationMotion.press)
                    Haptics.selectionAsync()
                  }}
                  onPressOut={() => {
                    closeScale.value = withSpring(1, GamificationMotion.press)
                  }}
                  onPress={onClose}
                  style={{
                    paddingVertical: 15,
                    borderRadius: GamificationRadius.xl,
                    backgroundColor: GamificationColors.emerald[500],
                    alignItems: 'center',
                    shadowColor: GamificationColors.checked.glow,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.40,
                    shadowRadius: 12,
                    elevation: 8,
                  }}
                >
                  <RNText
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: '#fff',
                      letterSpacing: 0.1,
                    }}
                  >
                    Tuyệt vời! 🙌
                  </RNText>
                </Pressable>
              </Animated.View>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Pressable>

      {/* Confetti – rendered on top of backdrop */}
      <ConfettiCannon
        ref={confettiRef}
        count={120}
        origin={{ x: SW / 2, y: -20 }}
        autoStart={false}
        fadeOut
        explosionSpeed={380}
        fallSpeed={2800}
        colors={[
          GamificationColors.emerald[400],
          GamificationColors.emerald[300],
          GamificationColors.peak.DEFAULT,
          '#f9a8d4',
          '#93c5fd',
          '#fde68a',
        ]}
      />
    </Modal>
  )
}
