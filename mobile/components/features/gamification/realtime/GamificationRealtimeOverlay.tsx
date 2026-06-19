import React, { useEffect, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { Feather } from '@expo/vector-icons'
import { AnimatePresence, MotiView } from 'moti'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useColorScheme } from 'nativewind'
import { GamificationColors, GamificationRadius, GamificationShadow } from '../tokens'
import {
  GamificationRealtimeEvent,
  useGamificationEventQueueStore,
} from './useGamificationEventQueueStore'

const DEFAULT_DURATION_MS = 2000

function getEventDuration(event: GamificationRealtimeEvent) {
  if (event.event === 'achievement.unlocked') return 2200
  if (event.event === 'xp.earned' || event.event === 'peak.earned') return 1700
  return DEFAULT_DURATION_MS
}

function getEventAccent(event: GamificationRealtimeEvent) {
  switch (event.event) {
    case 'xp.earned':
    case 'level.up':
      return GamificationColors.exp.DEFAULT
    case 'peak.earned':
      return GamificationColors.peak.DEFAULT
    case 'achievement.unlocked':
      return GamificationColors.achievement.DEFAULT
    case 'mission.completed':
      return GamificationColors.emerald[500]
    default:
      return GamificationColors.streak.DEFAULT
  }
}

function getEventCopy(event: GamificationRealtimeEvent) {
  switch (event.event) {
    case 'streak.updated':
      return {
        icon: 'zap',
        title: `Streak ${event.current_streak} ngày`,
        subtitle: event.best_streak ? `Kỷ lục tốt nhất: ${event.best_streak} ngày` : 'Hôm nay đã hoàn thành',
      }
    case 'streak.restored':
      return {
        icon: 'refresh-cw',
        title: `Đã khôi phục Streak ${event.current_streak} ngày`,
        subtitle: `Còn ${event.streak_freezes_left ?? 0} lượt đóng băng`,
      }
    case 'streak.milestone':
      return {
        icon: 'award',
        title: `Cột mốc ${event.milestone} ngày`,
        subtitle: 'Chuỗi học tập của bạn vừa đạt mốc mới',
      }
    case 'xp.earned':
      return {
        icon: 'trending-up',
        title: `+${event.xp} XP`,
        subtitle:
          event.current_xp != null && event.next_level_xp != null
            ? `${event.current_xp}/${event.next_level_xp} XP`
            : 'Điểm kinh nghiệm đã được cập nhật',
      }
    case 'level.up':
      return {
        icon: 'chevrons-up',
        title: `Level ${event.current_level}`,
        subtitle: `Tăng từ Level ${event.previous_level}${event.reward_peak ? `, thưởng ${event.reward_peak} Peak` : ''}`,
      }
    case 'peak.earned':
      return {
        icon: 'star',
        title: `+${event.amount} Peak`,
        subtitle: `Số dư hiện tại: ${event.balance}`,
      }
    case 'mission.completed':
      return {
        icon: 'check-circle',
        title: event.mission_name,
        subtitle: `Mission completed${event.reward_xp ? ` • +${event.reward_xp} XP` : ''}${
          event.reward_peak ? ` • +${event.reward_peak} Peak` : ''
        }`,
      }
    case 'daily_checkin.completed':
      return {
        icon: 'calendar',
        title: 'Đã điểm danh hôm nay',
        subtitle: event.consecutive_day ? `Chuỗi điểm danh: ${event.consecutive_day} ngày` : 'Widget đã được cập nhật',
      }
    case 'achievement.unlocked':
      return {
        icon: 'award',
        title: 'Achievement Unlocked',
        subtitle: event.achievement_name ?? event.title ?? 'Bạn vừa mở khóa thành tựu mới',
      }
  }
}

function XpProgress({ event }: { event: Extract<GamificationRealtimeEvent, { event: 'xp.earned' }> }) {
  const progressValue = useSharedValue(0)
  const progress = useMemo(() => {
    if (!event.current_xp || !event.next_level_xp) return 0
    return Math.max(0, Math.min(1, event.current_xp / event.next_level_xp))
  }, [event.current_xp, event.next_level_xp])

  useEffect(() => {
    progressValue.value = withTiming(progress, { duration: 900 })
  }, [progress, progressValue])

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }))

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, progressStyle]} />
    </View>
  )
}

function FloatingToast({
  event,
  isDark,
}: {
  event: GamificationRealtimeEvent
  isDark: boolean
}) {
  const accent = getEventAccent(event)
  const copy = getEventCopy(event)
  const isMission = event.event === 'mission.completed'
  const isAchievement = event.event === 'achievement.unlocked'

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlayRoot]}>
      {(isMission || isAchievement) && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'timing', duration: 180 }}
          style={StyleSheet.absoluteFill}
        >
          <BlurView intensity={18} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </MotiView>
      )}

      {isMission && (
        <MotiView
          from={{ opacity: 0, translateY: -36 }}
          animate={{ opacity: 1, translateY: 54 }}
          exit={{ opacity: 0, translateY: -24 }}
          transition={{ type: 'spring', damping: 22, stiffness: 220 }}
          style={[
            styles.topToast,
            styles.surface,
            isDark ? styles.darkSurface : styles.lightSurface,
            { borderColor: `${accent}55` },
          ]}
        >
          <View style={[styles.iconBubble, { backgroundColor: `${accent}18` }]}>
            <Feather name="check-circle" size={18} color={accent} />
          </View>
          <Text style={[styles.topToastText, { color: isDark ? '#fafafa' : '#18181b' }]} numberOfLines={1}>
            Mission Completed
          </Text>
        </MotiView>
      )}

      <View style={styles.centerStage}>
        <MotiView
          from={{
            opacity: 0,
            scale: isAchievement ? 0.96 : 0.92,
            translateY: isMission ? 18 : event.event === 'peak.earned' ? 28 : 8,
          }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          exit={{ opacity: 0, scale: isAchievement ? 0.98 : 0.94, translateY: -10 }}
          transition={{
            type: isAchievement ? 'timing' : 'spring',
            duration: isAchievement ? 240 : undefined,
            damping: 20,
            stiffness: 220,
          }}
          style={[
            styles.card,
            isDark ? styles.darkSurface : styles.lightSurface,
            { borderColor: `${accent}55`, shadowColor: accent },
            event.event === 'achievement.unlocked' ? styles.achievementCard : null,
          ]}
        >
          <View style={[styles.glow, { backgroundColor: `${accent}18` }]} />
          <View style={[styles.iconBubbleLarge, { backgroundColor: `${accent}1f`, borderColor: `${accent}44` }]}>
            <Feather name={copy.icon as any} size={28} color={accent} />
          </View>
          <Text style={[styles.title, { color: isDark ? '#fafafa' : '#18181b' }]} numberOfLines={2}>
            {copy.title}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#a1a1aa' : '#71717a' }]} numberOfLines={2}>
            {copy.subtitle}
          </Text>
          {event.event === 'xp.earned' && <XpProgress event={event} />}
        </MotiView>
      </View>
    </View>
  )
}

export function GamificationRealtimeOverlay() {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const activeEvent = useGamificationEventQueueStore((state) => state.activeEvent)
  const completeActive = useGamificationEventQueueStore((state) => state.completeActive)

  useEffect(() => {
    if (!activeEvent) return

    if (activeEvent.event === 'level.up' || activeEvent.event === 'achievement.unlocked') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }

    const timer = setTimeout(() => {
      completeActive()
    }, getEventDuration(activeEvent))

    return () => clearTimeout(timer)
  }, [activeEvent, completeActive])

  return (
    <AnimatePresence exitBeforeEnter>
      {activeEvent && (
        <FloatingToast key={activeEvent.id} event={activeEvent} isDark={isDark} />
      )}
    </AnimatePresence>
  )
}

const styles = StyleSheet.create({
  centerStage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  overlayRoot: {
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    minHeight: 176,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    borderRadius: GamificationRadius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
    ...GamificationShadow.glow,
  },
  achievementCard: {
    transform: [{ scale: 0.99 }],
  },
  surface: {
    borderWidth: 1,
  },
  lightSurface: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  darkSurface: {
    backgroundColor: 'rgba(24,24,27,0.94)',
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -72,
    right: -48,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleLarge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 29,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 20,
  },
  progressTrack: {
    width: '100%',
    height: 9,
    marginTop: 18,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(161,161,170,0.22)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: GamificationColors.exp.DEFAULT,
  },
  topToast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 2,
    minHeight: 56,
    borderRadius: GamificationRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    ...GamificationShadow.md,
  },
  topToastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
})
