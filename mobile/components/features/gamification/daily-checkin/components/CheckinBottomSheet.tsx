/**
 * CheckinBottomSheet – Bottom Sheet chi tiết Daily Check-in.
 * Dùng Modal để render vượt ra ngoài ScrollView.
 */

import React, { useEffect, useCallback } from 'react'
import {
  View,
  Text as RNText,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Feather } from '@expo/vector-icons'

import { CalendarDay, getCalendarDayStatus } from './CalendarDay'
import { RewardBadge, StreakBadge } from './RewardBadge'
import { PeakCounter } from './PeakAnimation'
import { DailyCheckinSheetSkeleton } from './LoadingSkeleton'

import type { CheckinStatusResponse, ClaimState } from '../types'
import { GamificationColors, GamificationRadius, GamificationMotion } from '../../tokens'

const { height: SH } = Dimensions.get('window')
const SHEET_HEIGHT = Math.min(SH * 0.82, 680)

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface CheckinBottomSheetProps {
  visible: boolean
  status: CheckinStatusResponse | null
  claimState: ClaimState
  isDark: boolean
  onClose: () => void
  onClaim: () => Promise<void>
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function CheckinBottomSheet({
  visible,
  status,
  claimState,
  isDark,
  onClose,
  onClaim,
}: CheckinBottomSheetProps) {
  const translateY = useSharedValue(SHEET_HEIGHT)
  const backdropOpacity = useSharedValue(0)
  const btnScale = useSharedValue(1)

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 250 })
      translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) })
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) })
      translateY.value = withTiming(SHEET_HEIGHT, {
        duration: 250,
        easing: Easing.in(Easing.ease),
      })
    }
  }, [visible, backdropOpacity, translateY])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))
  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 }],
  }))

  const handleClaim = useCallback(async () => {
    if (claimState === 'loading' || status?.checked_today) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await onClaim()
  }, [claimState, onClaim, status?.checked_today])

  const isAlreadyClaimed = status?.checked_today || claimState === 'already_claimed'
  const isLoading = claimState === 'loading'

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Root wrapper to position sheet at bottom */}
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
        >
          <Animated.View
            style={[
              {
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.52)',
              },
              backdropStyle,
            ]}
          />
        </Pressable>

        {/* Sheet – absolute bottom */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: SHEET_HEIGHT,
              borderTopLeftRadius: GamificationRadius['3xl'],
              borderTopRightRadius: GamificationRadius['3xl'],
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.20,
              shadowRadius: 24,
              elevation: 24,
            },
            sheetStyle,
          ]}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? '#3f3f46' : '#e4e4e7',
              }}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: Platform.OS === 'ios' ? 40 : 28,
              gap: 20,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
              <View>
                <RNText
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: GamificationColors.emerald[500],
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                  }}
                >
                  Điểm Danh Hàng Ngày
                </RNText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: 'rgba(249,115,22,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name="zap" size={15} color="#f97316" />
                  </View>
                  <RNText
                    style={{
                      fontSize: 22,
                      fontWeight: '800',
                      color: isDark ? '#f4f4f5' : '#18181b',
                      letterSpacing: -0.5,
                    }}
                  >
                    Check-in
                  </RNText>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? '#27272a' : '#f4f4f5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="x" size={18} color={isDark ? '#a1a1aa' : '#71717a'} />
              </Pressable>
            </View>

            {/* Content */}
            {!status ? (
              <DailyCheckinSheetSkeleton />
            ) : (
              <>
                {/* Streak row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <StreakBadge
                    streak={status.current_streak}
                    label="Streak hiện tại"
                    isDark={isDark}
                  />
                  <StreakBadge
                    streak={status.best_streak}
                    label="Kỷ lục"
                    isDark={isDark}
                  />
                </View>

                {/* Peak balance */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    borderRadius: GamificationRadius.xl,
                    backgroundColor: isDark
                      ? 'rgba(245,158,11,0.10)'
                      : 'rgba(254,243,199,0.80)',
                    borderWidth: 1,
                    borderColor: 'rgba(245,158,11,0.25)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: 'rgba(245,158,11,0.15)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="star" size={15} color={GamificationColors.peak.DEFAULT} />
                    </View>
                    <RNText
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: isDark ? '#d4d4d8' : '#52525b',
                      }}
                    >
                      Số dư Peak Wallet
                    </RNText>
                  </View>
                  <PeakCounter value={status.current_peak_balance} isDark={isDark} size="sm" />
                </View>

                {/* Calendar */}
                <View style={{ gap: 10 }}>
                  <RNText
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isDark ? '#a1a1aa' : '#71717a',
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                    }}
                  >
                    Chu kỳ {status.cycle_days} ngày
                  </RNText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {status.calendar.map((day, idx) => (
                      <CalendarDay
                        key={day.day_number}
                        day={day}
                        status={getCalendarDayStatus(day, status.current_day_in_cycle)}
                        isDark={isDark}
                        index={idx}
                      />
                    ))}
                  </View>
                </View>

                {/* Today reward */}
                {!isAlreadyClaimed && status.today_reward && (
                  <View style={{ gap: 8 }}>
                    <RNText
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isDark ? '#a1a1aa' : '#71717a',
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                      }}
                    >
                      Phần thưởng hôm nay
                    </RNText>
                    <RewardBadge reward={status.today_reward} isDark={isDark} size="md" animated={false} />
                  </View>
                )}

                {/* Next reward */}
                {status.next_reward && (
                  <View style={{ gap: 8 }}>
                    <RNText
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isDark ? '#a1a1aa' : '#71717a',
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                      }}
                    >
                      {isAlreadyClaimed ? 'Ngày mai' : 'Tiếp theo'}
                    </RNText>
                    <RewardBadge reward={status.next_reward} isDark={isDark} size="md" animated={false} />
                  </View>
                )}

                {/* CTA Button */}
                <Animated.View style={btnAnimStyle}>
                  <Pressable
                    onPressIn={() => {
                      if (!isAlreadyClaimed && !isLoading) {
                        btnScale.value = withSpring(0.96, GamificationMotion.press)
                      }
                    }}
                    onPressOut={() => { btnScale.value = withSpring(1, GamificationMotion.press) }}
                    onPress={handleClaim}
                    disabled={isAlreadyClaimed || isLoading}
                    style={{
                      paddingVertical: 16,
                      borderRadius: GamificationRadius.xl,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                      backgroundColor: isAlreadyClaimed
                        ? isDark ? '#27272a' : '#f4f4f5'
                        : GamificationColors.emerald[500],
                      shadowColor: isAlreadyClaimed ? 'transparent' : GamificationColors.checked.glow,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: isAlreadyClaimed ? 0 : 0.40,
                      shadowRadius: 12,
                      elevation: isAlreadyClaimed ? 0 : 8,
                    }}
                  >
                    {isAlreadyClaimed ? (
                      <>
                        <Feather name="check-circle" size={18} color={GamificationColors.emerald[500]} />
                        <RNText style={{ fontSize: 16, fontWeight: '700', color: GamificationColors.emerald[500] }}>
                          Đã điểm danh hôm nay
                        </RNText>
                      </>
                    ) : isLoading ? (
                      <RNText style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                        Đang xử lý…
                      </RNText>
                    ) : (
                      <>
                        <Feather name="star" size={18} color="#fff" />
                        <RNText style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                          Nhận thưởng hôm nay
                        </RNText>
                      </>
                    )}
                  </Pressable>
                </Animated.View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}
