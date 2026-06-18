/**
 * DailyCheckinCard – Widget compact trên màn hình Home.
 *
 * Layout:
 *  ┌────────────────────────────────────────────────┐
 *  │  🔥  Hôm nay · Ngày 4/7        [+75 PEAK]     │
 *  │  ─────────────────────────────────────────────  │
 *  │  [■][■][■][■][ ][ ][ ]         [Nhận thưởng]  │
 *  └────────────────────────────────────────────────┘
 *
 *  Nếu đã điểm danh:
 *  ┌────────────────────────────────────────────────┐
 *  │  ✅ Đã điểm danh hôm nay                       │
 *  │  Ngày mai: +100 Peak                           │
 *  └────────────────────────────────────────────────┘
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text as RNText,
  Pressable,
  useColorScheme,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Feather } from '@expo/vector-icons'

import { useDailyCheckin } from './useDailyCheckin'
import { CheckinBottomSheet } from './components/CheckinBottomSheet'
import { RewardPopup } from './components/RewardPopup'
import { DailyCheckinWidgetSkeleton } from './components/LoadingSkeleton'
import { ErrorState } from './components/EmptyErrorState'

import {
  GamificationColors,
  GamificationRadius,
  GamificationMotion,
  GamificationShadow,
} from '../tokens'

// ─────────────────────────────────────────────────────────────
// Mini Calendar strip (7 dots)
// ─────────────────────────────────────────────────────────────

function MiniCalendar({
  calendar,
  currentDay,
  isDark,
}: {
  calendar: { day_number: number; is_checked: boolean }[]
  currentDay: number
  isDark: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      {calendar.map((day) => {
        const isToday = day.day_number === currentDay && !day.is_checked
        const isChecked = day.is_checked
        const isMystery = day.day_number === 7 && !isChecked

        return (
          <View
            key={day.day_number}
            style={{
              width: 28,
              height: 28,
              borderRadius: GamificationRadius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isChecked
                ? GamificationColors.emerald[500]
                : isToday
                  ? isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.10)'
                  : isMystery
                    ? isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)'
                    : isDark ? 'rgba(39,39,42,0.5)' : 'rgba(244,244,245,0.8)',
              borderWidth: (isToday || isMystery) ? 1.5 : 0,
              borderColor: isToday
                ? GamificationColors.emerald[500]
                : isMystery ? 'rgba(139,92,246,0.40)' : 'transparent',
            }}
          >
            {isChecked ? (
              <Feather name="check" size={12} color="#fff" />
            ) : isMystery ? (
              <Feather name="gift" size={12} color="#7c3aed" />
            ) : isToday ? (
              <Feather name="star" size={12} color={GamificationColors.emerald[500]} />
            ) : (
              <RNText
                style={{
                  fontSize: 9,
                  fontWeight: '700',
                  color: isDark ? '#52525b' : '#a1a1aa',
                }}
              >
                {day.day_number}
              </RNText>
            )}
          </View>
        )
      })}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// DailyCheckinCard (main widget)
// ─────────────────────────────────────────────────────────────

export function DailyCheckinCard() {
  const isDark = useColorScheme() === 'dark'
  const {
    status,
    claimState,
    isLoading,
    isError,
    claimResult,
    claim,
    refresh,
  } = useDailyCheckin()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [popupVisible, setPopupVisible] = useState(false)

  // Trigger popup on success
  useEffect(() => {
    if (claimState === 'success' && claimResult) {
      setSheetOpen(false)
      setTimeout(() => setPopupVisible(true), 300)
    }
  }, [claimState, claimResult])

  // Fetch on mount
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Card press scale
  const cardScale = useSharedValue(1)
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }))

  // Entry animation
  const entryOpacity = useSharedValue(0)
  const entryY = useSharedValue(12)
  useEffect(() => {
    if (!isLoading && status) {
      entryOpacity.value = withTiming(1, { duration: 400 })
      entryY.value = withSpring(0, { damping: 22, stiffness: 200 })
    }
  }, [isLoading, status, entryOpacity, entryY])
  const entryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryY.value }],
  }))

  // Btn scale
  const btnScale = useSharedValue(1)
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }))

  const handleOpenSheet = useCallback(() => {
    Haptics.selectionAsync()
    setSheetOpen(true)
  }, [])

  const handleClaim = useCallback(async () => {
    await claim()
  }, [claim])

  // ── Loading ───────────────────────────────────────────────
  if (isLoading && !status) {
    return <DailyCheckinWidgetSkeleton />
  }

  // ── Error ─────────────────────────────────────────────────
  if (isError && !status) {
    return <ErrorState isDark={isDark} onRetry={refresh} />
  }

  if (!status) return null

  const isAlreadyClaimed = status.checked_today || claimState === 'already_claimed'
  const isClaimLoading = claimState === 'loading'

  return (
    <>
      <Animated.View
        style={[
          entryStyle,
          {
            marginHorizontal: 20,
            marginBottom: 16,
          },
        ]}
      >
        <Animated.View style={cardStyle}>
          <Pressable
            onPressIn={() => {
              cardScale.value = withSpring(0.98, GamificationMotion.press)
            }}
            onPressOut={() => {
              cardScale.value = withSpring(1, GamificationMotion.press)
            }}
            onPress={handleOpenSheet}
            style={{
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
              ...GamificationShadow.md,
            }}
          >
            {/* Row 1: Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* Zap icon (streak indicator) */}
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: GamificationRadius.md,
                    backgroundColor: isDark ? 'rgba(249,115,22,0.15)' : 'rgba(255,237,213,0.80)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(249,115,22,0.25)',
                  }}
                >
                  <Feather name="zap" size={20} color="#f97316" />
                </View>

                <View>
                  <RNText
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: GamificationColors.emerald[500],
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                    }}
                  >
                    Hôm nay
                  </RNText>
                  {isAlreadyClaimed ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="check-circle" size={14} color={GamificationColors.emerald[500]} />
                      <RNText
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: isDark ? '#f4f4f5' : '#18181b',
                          letterSpacing: -0.2,
                        }}
                      >
                        Đã điểm danh
                      </RNText>
                    </View>
                  ) : (
                    <RNText
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: isDark ? '#f4f4f5' : '#18181b',
                        letterSpacing: -0.2,
                      }}
                    >
                      Ngày {status.current_day_in_cycle} / {status.cycle_days}
                    </RNText>
                  )}
                </View>
              </View>

              {/* Reward badge (compact) */}
              {!isAlreadyClaimed && status.today_reward?.reward_amount != null ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: GamificationRadius.lg,
                    backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(254,243,199,0.9)',
                    borderWidth: 1,
                    borderColor: 'rgba(245,158,11,0.30)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Feather name="star" size={12} color={GamificationColors.peak.DEFAULT} />
                  <RNText
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: GamificationColors.peak.DEFAULT,
                      letterSpacing: -0.3,
                    }}
                  >
                    +{status.today_reward.reward_amount}
                  </RNText>
                </View>
              ) : isAlreadyClaimed && status.next_reward?.reward_amount != null ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <RNText style={{ fontSize: 10, color: isDark ? '#71717a' : '#a1a1aa', fontWeight: '600' }}>
                    Ngày mai
                  </RNText>
                  <RNText style={{ fontSize: 13, fontWeight: '800', color: GamificationColors.peak.DEFAULT }}>
                    +{status.next_reward.reward_amount} Peak
                  </RNText>
                </View>
              ) : null}
            </View>

            {/* Row 2: Mini Calendar + CTA */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <MiniCalendar
                calendar={status.calendar}
                currentDay={status.current_day_in_cycle}
                isDark={isDark}
              />

              {/* CTA Button */}
              {!isAlreadyClaimed && (
                <Animated.View style={btnStyle}>
                  <Pressable
                    onPressIn={() => {
                      btnScale.value = withSpring(0.92, GamificationMotion.press)
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    }}
                    onPressOut={() => {
                      btnScale.value = withSpring(1, GamificationMotion.press)
                    }}
                    onPress={handleOpenSheet}
                    disabled={isClaimLoading}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: GamificationRadius.xl,
                      backgroundColor: GamificationColors.emerald[500],
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      ...GamificationShadow.md,
                    }}
                  >
                    <Feather name="star" size={13} color="#fff" />
                    <RNText
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: '#fff',
                        letterSpacing: 0.1,
                      }}
                    >
                      Nhận thưởng
                    </RNText>
                  </Pressable>
                </Animated.View>
              )}
            </View>

            {/* Streak strip */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingTop: 4,
                borderTopWidth: 1,
                borderTopColor: isDark ? 'rgba(63,63,70,0.40)' : 'rgba(228,228,231,0.60)',
              }}
            >
              <Feather name="zap" size={13} color="#f97316" />
              <RNText
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isDark ? '#a1a1aa' : '#71717a',
                  flex: 1,
                }}
              >
                Streak:{' '}
                <RNText style={{ color: GamificationColors.streak, fontWeight: '800' }}>
                  {status.current_streak} ngày
                </RNText>
                {'  ·  '}Kỷ lục:{' '}
                <RNText style={{ fontWeight: '800', color: isDark ? '#f4f4f5' : '#18181b' }}>
                  {status.best_streak} ngày
                </RNText>
              </RNText>
              <Feather name="chevron-right" size={14} color={isDark ? '#52525b' : '#a1a1aa'} />
            </View>
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* Bottom Sheet (portal to root, always rendered while open) */}
      {sheetOpen && (
        <CheckinBottomSheet
          visible={sheetOpen}
          status={status}
          claimState={claimState}
          isDark={isDark}
          onClose={() => setSheetOpen(false)}
          onClaim={handleClaim}
        />
      )}

      {/* Success popup */}
      <RewardPopup
        visible={popupVisible}
        result={claimResult}
        isDark={isDark}
        onClose={() => setPopupVisible(false)}
      />
    </>
  )
}
