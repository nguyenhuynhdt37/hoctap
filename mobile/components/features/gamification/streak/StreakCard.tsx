import React, { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useColorScheme } from 'nativewind'
import { Feather } from '@expo/vector-icons'
import { GamificationCard } from '../shared/GamificationCard'
import { StudyStreakBadge } from '../shared/StudyStreakBadge'
import { useStreakCalendar, useRestoreStreak } from './useStreakQuery'
import { RestoreStreakSheet } from './RestoreStreakSheet'
import { GamificationColors } from '../tokens'
import type { StreakStatus } from '../types'

interface StreakCardProps {
  streak: StreakStatus | null
  isDark?: boolean
}

export function StreakCard({ streak, isDark: propIsDark }: StreakCardProps) {
  const { colorScheme } = useColorScheme()
  const isDark = propIsDark !== undefined ? propIsDark : colorScheme === 'dark'

  const { data: calendarData } = useStreakCalendar(7)
  const restoreMutation = useRestoreStreak()

  const [sheetVisible, setSheetVisible] = useState(false)

  const currentStreak = streak?.current_streak ?? 0
  const bestStreak = streak?.best_streak ?? 0
  const freezes = streak?.streak_freezes ?? 0

  const canRestore = freezes > 0

  const last7Days: Date[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    last7Days.push(d)
  }

  const activeDatesSet = new Set(calendarData?.active_dates ?? [])

  const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const getDayLabel = (date: Date) => {
    const day = date.getDay()
    if (day === 0) return 'CN'
    return `T${day + 1}`
  }

  const handleRestore = async () => {
    try {
      await restoreMutation.mutateAsync()
      setSheetVisible(false)
    } catch (err) {
      console.warn('Failed to restore streak:', err)
    }
  }

  return (
    <>
      <GamificationCard isDark={isDark} shadowType="streak">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-orange-500/15 items-center justify-center mr-3 border border-orange-500/20">
              <Feather name="zap" size={20} color={GamificationColors.streak.DEFAULT} />
            </View>
            <View>
              <Text className={`font-black text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Study Streak
              </Text>
              <Text className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Kỷ lục: {bestStreak} ngày
              </Text>
            </View>
          </View>

          <StudyStreakBadge streak={currentStreak} size="md" />
        </View>

        {/* Weekly visual tracker */}
        <View className="flex-row justify-between items-center my-3.5 px-1">
          {last7Days.map((date, idx) => {
            const dateStr = formatDate(date)
            const isActive = activeDatesSet.has(dateStr)
            const isToday = date.toDateString() === today.toDateString()

            return (
              <View key={idx} className="items-center flex-1">
                <Text className={`text-[10px] font-black uppercase tracking-wider mb-2 ${
                  isToday 
                    ? 'text-orange-500 font-black' 
                    : isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`}>
                  {getDayLabel(date)}
                </Text>
                <View 
                  className={`w-9 h-12 rounded-2xl items-center justify-center border ${
                    isActive
                      ? 'bg-orange-500/20 border-orange-500/30'
                      : isToday
                        ? 'border-orange-500/40 bg-orange-500/5'
                        : isDark ? 'bg-zinc-800/50 border-white/5' : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  {isActive ? (
                    <Feather name="check" size={16} color={GamificationColors.streak.DEFAULT} strokeWidth={3} />
                  ) : (
                    <View className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                  )}
                </View>
              </View>
            )
          })}
        </View>

        {/* Footer actions / stats */}
        <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-zinc-100 dark:border-white/5">
          <View className="flex-row items-center">
            <Feather name="wind" size={14} color="#0EA5E9" style={{ marginRight: 6 }} />
            <Text className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {freezes} lượt Đóng băng còn lại
            </Text>
          </View>

          {canRestore && (
            <Pressable
              onPress={() => setSheetVisible(true)}
              className="px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 active:opacity-80"
            >
              <Text className="text-sky-500 font-black text-xs">
                Khôi phục
              </Text>
            </Pressable>
          )}
        </View>
      </GamificationCard>

      <RestoreStreakSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        streakFreezes={freezes}
        onRestore={handleRestore}
        isSubmitting={restoreMutation.isPending}
        isDark={isDark}
      />
    </>
  )
}
