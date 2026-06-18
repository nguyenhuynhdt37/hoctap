import React, { useState, useCallback } from 'react'
import { ScrollView, RefreshControl, useColorScheme } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { Screen } from '@/components/layout/Screen'
import { HomeHeader } from './HomeHeader'
import { RecommendedCourses } from './RecommendedCourses'
import { HomeCoursesSection } from './HomeCoursesSection'
import { DailyCheckinCard } from '@/components/features/gamification/daily-checkin'
import { CHECKIN_QUERY_KEY } from '@/components/features/gamification/daily-checkin'

export function HomeFeature() {
  const isDark = useColorScheme() === 'dark'
  const [refreshing, setRefreshing] = useState(false)
  const queryClient = useQueryClient()

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    queryClient.invalidateQueries({ queryKey: ['courses'] })
    queryClient.invalidateQueries({ queryKey: ['recommended-courses'] })
    queryClient.invalidateQueries({ queryKey: CHECKIN_QUERY_KEY })
    setTimeout(() => setRefreshing(false), 500)
  }, [queryClient])

  return (
    <Screen safeArea withTabBar>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#10B981' : '#10B981'}
            colors={['#10B981']}
          />
        }
      >
        <HomeHeader />
        {/* ── Gamification: Daily Check-in Widget ─────────────── */}
        <DailyCheckinCard />
        <RecommendedCourses />
        <HomeCoursesSection />
      </ScrollView>
    </Screen>
  )
}
