import React, { useCallback } from 'react'
import { ScrollView, View, Text, Pressable, Image } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { Feather } from '@expo/vector-icons'
import { useAuthStore } from '@/src/stores/auth.store'
import { useGamificationStore } from '@/src/stores/gamification.store'
import { useStreak, useStreakCalendar, useStreakHistory } from '@/components/features/gamification/streak/useStreakQuery'
import { StreakCard } from '@/components/features/gamification/streak/StreakCard'
import { StreakCalendarView } from '@/components/features/gamification/streak/StreakCalendarView'
import { LevelProgressBar } from '@/components/features/gamification/shared/LevelProgressBar'
import { PeakBadge } from '@/components/features/gamification/shared/PeakBadge'
import { GamificationCard } from '@/components/features/gamification/shared/GamificationCard'
import { GamificationSkeleton } from '@/components/features/gamification/shared/GamificationSkeleton'
import { DailyCheckinCard } from '@/components/features/gamification/daily-checkin'
import { ErrorState } from '@/components/features/gamification/daily-checkin/components/EmptyErrorState'
import { Screen } from '@/components/layout/Screen'
import { GamificationColors } from '@/components/features/gamification/tokens'

export default function GamificationScreen() {
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  const user = useAuthStore((s) => s.user)
  const {
    streak,
    peakBalance,
    level,
    currentXp,
    requiredXp,
    isLoading: storeLoading,
    error: storeError,
    fetchGamificationData,
  } = useGamificationStore()

  // React Query hooks to fetch and sync fresh data
  const { isLoading: streakLoading, isError: streakError } = useStreak()
  const {
    data: calendarData,
    isLoading: calendarLoading,
    isError: calendarError,
    refetch: refetchCalendar,
  } = useStreakCalendar(30)
  const { data: historyData, isLoading: historyLoading } = useStreakHistory(5)

  useFocusEffect(
    useCallback(() => {
      fetchGamificationData()
      refetchCalendar()
    }, [fetchGamificationData, refetchCalendar]),
  )

  const isLoading = storeLoading || streakLoading
  const hasProfileError = !!storeError || streakError

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      if (diffMins < 1) return 'Vừa xong'
      if (diffMins < 60) return `${diffMins} phút trước`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours} giờ trước`
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays === 1) return 'Hôm qua'
      return `${d.getDate()}/${d.getMonth() + 1}`
    } catch {
      return ''
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lesson.completed':
        return 'book-open'
      case 'quiz.completed':
        return 'help-circle'
      case 'code.completed':
        return 'code'
      case 'daily_checkin.completed':
        return 'calendar'
      case 'course.purchased':
        return 'shopping-bag'
      default:
        return 'award'
    }
  }

  const getActivityTitle = (type: string) => {
    switch (type) {
      case 'lesson.completed':
        return 'Hoàn thành bài học'
      case 'quiz.completed':
        return 'Hoàn thành trắc nghiệm'
      case 'code.completed':
        return 'Hoàn thành bài thực hành'
      case 'daily_checkin.completed':
        return 'Điểm danh hàng ngày'
      case 'course.purchased':
        return 'Đăng ký khóa học mới'
      default:
        return 'Hoạt động đạt chuẩn'
    }
  }

  return (
    <Screen safeArea={true} withTabBar={false}>
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5 bg-transparent">
        <Pressable
          onPress={() => router.back()}
          className={`w-10 h-10 rounded-full items-center justify-center border ${
            isDark ? 'bg-zinc-900 border-white/5' : 'bg-zinc-100 border-zinc-200'
          } active:opacity-70`}
        >
          <Feather name="chevron-left" size={20} color={isDark ? 'white' : 'black'} />
        </Pressable>

        <Text className={`font-black text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Đấu trường học tập
        </Text>

        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 24, gap: 20 }}
        className="flex-1 mt-4"
      >
        {/* User profile header card */}
        <View className="flex-row items-center justify-between mt-2 mb-1">
          <View className="flex-row items-center flex-1">
            <Image
              source={
                user?.avatar
                  ? { uri: user.avatar }
                  : require('@/assets/images/react-logo.png') // Fallback logo
              }
              className="w-12 h-12 rounded-full border-2 border-indigo-500"
            />
            <View className="ml-3.5 flex-1">
              <Text className={`font-black text-base ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                {user?.fullname || 'Học viên'}
              </Text>
              {storeLoading ? (
                <GamificationSkeleton height={12} width="45%" />
              ) : storeError ? (
                <Text className={`text-xs font-bold mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Không tải được cấp độ
                </Text>
              ) : (
                <Text className="text-indigo-500 text-xs font-bold uppercase tracking-widest mt-0.5">
                  Cấp độ {level}
                </Text>
              )}
            </View>
          </View>

          {/* Peak Coin display */}
          {storeLoading ? (
            <GamificationSkeleton height={38} width={96} borderRadius={999} />
          ) : storeError ? (
            <View className="w-24" />
          ) : (
            <PeakBadge balance={peakBalance} size="md" />
          )}
        </View>

        {/* Level and EXP track card */}
        {storeLoading ? (
          <GamificationCard isDark={isDark} shadowType="exp">
            <View className="gap-3">
              <GamificationSkeleton height={28} width="70%" />
              <GamificationSkeleton height={12} width="100%" borderRadius={999} />
            </View>
          </GamificationCard>
        ) : storeError ? (
          <ErrorState isDark={isDark} onRetry={fetchGamificationData} />
        ) : (
          <GamificationCard isDark={isDark} shadowType="exp">
            <LevelProgressBar level={level} currentXp={currentXp} requiredXp={requiredXp} />
          </GamificationCard>
        )}

        {/* Main Streak Card */}
        {isLoading ? (
          <GamificationCard isDark={isDark}>
            <View className="gap-3">
              <GamificationSkeleton height={24} width="60%" />
              <GamificationSkeleton height={48} width="100%" borderRadius={16} />
              <GamificationSkeleton height={16} width="40%" />
            </View>
          </GamificationCard>
        ) : hasProfileError ? (
          <ErrorState isDark={isDark} onRetry={fetchGamificationData} />
        ) : (
          <StreakCard streak={streak} isDark={isDark} />
        )}

        {/* Daily Checkin Widget */}
        <DailyCheckinCard />

        {/* 30 Days Streak Calendar Grid */}
        {calendarLoading ? (
          <GamificationCard isDark={isDark}>
            <GamificationSkeleton height={160} width="100%" borderRadius={16} />
          </GamificationCard>
        ) : calendarError ? (
          <ErrorState isDark={isDark} onRetry={() => refetchCalendar()} />
        ) : (
          <StreakCalendarView activeDates={calendarData?.active_dates ?? []} isDark={isDark} />
        )}

        {/* Recent Activity history list */}
        <GamificationCard isDark={isDark}>
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 rounded-full bg-indigo-500/10 items-center justify-center mr-2.5 border border-indigo-500/10">
              <Feather name="activity" size={16} color={GamificationColors.exp.DEFAULT} />
            </View>
            <Text className={`font-black text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Nhật ký hoạt động gần đây
            </Text>
          </View>

          {historyLoading ? (
            <View className="gap-3">
              <GamificationSkeleton height={40} width="100%" />
              <GamificationSkeleton height={40} width="100%" />
              <GamificationSkeleton height={40} width="100%" />
            </View>
          ) : !historyData?.activities || historyData.activities.length === 0 ? (
            <View className="py-6 items-center">
              <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Chưa có hoạt động đạt chuẩn nào được ghi lại
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {historyData.activities.slice(0, 5).map((act: any, idx: number) => (
                <View 
                  key={act.id || idx}
                  className="flex-row items-center justify-between py-1"
                >
                  <View className="flex-row items-center flex-1">
                    <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 border ${
                      isDark ? 'bg-zinc-800/80 border-white/5' : 'bg-zinc-50 border-zinc-100'
                    }`}>
                      <Feather 
                        name={getActivityIcon(act.action_type) as any} 
                        size={15} 
                        color={isDark ? '#a1a1aa' : '#71717a'} 
                      />
                    </View>
                    <View className="flex-1 text-left">
                      <Text className={`font-bold text-xs text-left ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                        {getActivityTitle(act.action_type)}
                      </Text>
                      <Text className={`text-[10px] mt-0.5 text-left ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {formatRelativeTime(act.created_at)}
                      </Text>
                    </View>
                  </View>
                  {act.metadata?.xp_earned != null && (
                    <Text className="text-indigo-500 font-black text-xs">
                      +{act.metadata.xp_earned} XP
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </GamificationCard>
      </ScrollView>
    </Screen>
  )
}
