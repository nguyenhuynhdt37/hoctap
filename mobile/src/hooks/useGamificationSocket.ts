import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from './websocket/useWebSocket'
import { useAuthStore } from '../stores/auth.store'
import { useGamificationStore } from '../stores/gamification.store'
import { CHECKIN_QUERY_KEY } from '@/components/features/gamification/daily-checkin/useDailyCheckin'
import { STREAK_KEYS } from '@/components/features/gamification/streak/useStreakQuery'
import {
  useGamificationEventQueueStore,
} from '../../components/features/gamification/realtime/useGamificationEventQueueStore'
import type { GamificationRealtimeEvent } from '../../components/features/gamification/realtime/useGamificationEventQueueStore'

function normalizeGamificationMessage(data: any): GamificationRealtimeEvent | null {
  const eventName = data?.event
  if (!eventName) return null

  const payload = data?.payload && typeof data.payload === 'object'
    ? data.payload
    : Object.fromEntries(
        Object.entries(data).filter(([key]) => key !== 'event'),
      )

  return {
    event: eventName,
    ...payload,
  } as GamificationRealtimeEvent
}

export function useGamificationSocket() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const updateStreak = useGamificationStore((s) => s.updateStreak)
  const updatePeak = useGamificationStore((s) => s.updatePeak)
  const updateXp = useGamificationStore((s) => s.updateXp)
  const updateLevel = useGamificationStore((s) => s.updateLevel)
  const fetchGamificationData = useGamificationStore((s) => s.fetchGamificationData)
  const enqueueEvent = useGamificationEventQueueStore((s) => s.enqueue)

  // Fetch initial gamification data once user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchGamificationData()
    }
  }, [isAuthenticated, user, fetchGamificationData])

  const handleMessage = useCallback((data: any) => {
    console.log('📬 [WS][Gamification] Received message:', data)
    const realtimeEvent = normalizeGamificationMessage(data)

    if (!realtimeEvent) return

    if (realtimeEvent.event === 'streak.updated') {
      const newStreak: number = realtimeEvent.current_streak ?? 0
      const newBest: number = realtimeEvent.best_streak ?? 0

      updateStreak({
        current_streak: newStreak,
        best_streak: newBest,
      })
    }

    if (realtimeEvent.event === 'streak.restored') {
      const newStreak: number = realtimeEvent.current_streak ?? 0
      updateStreak({
        current_streak: newStreak,
        best_streak: realtimeEvent.best_streak,
        streak_freezes: realtimeEvent.streak_freezes_left,
      })
    }

    if (realtimeEvent.event === 'xp.earned') {
      const currentState = useGamificationStore.getState()
      updateXp(
        realtimeEvent.current_xp ?? currentState.currentXp,
        realtimeEvent.next_level_xp ?? currentState.requiredXp,
      )
    }

    if (realtimeEvent.event === 'level.up') {
      const currentState = useGamificationStore.getState()
      updateLevel(
        realtimeEvent.current_level,
        realtimeEvent.current_xp ?? currentState.currentXp,
        realtimeEvent.next_level_xp ?? currentState.requiredXp,
      )
    }

    if (realtimeEvent.event === 'peak.earned') {
      updatePeak(realtimeEvent.balance)
    }

    if (realtimeEvent.event === 'daily_checkin.completed') {
      queryClient.invalidateQueries({ queryKey: CHECKIN_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: STREAK_KEYS.status })
      queryClient.invalidateQueries({ queryKey: STREAK_KEYS.calendar(30) })
      fetchGamificationData()
      return
    }

    enqueueEvent(realtimeEvent)
  }, [enqueueEvent, fetchGamificationData, queryClient, updateLevel, updatePeak, updateStreak, updateXp])

  const roleName = user?.roles?.[0] || 'USER'

  // Connect using helper
  useWebSocket({
    endpoint: '/api/v1/gamification/ws/gamification',
    enabled: isAuthenticated && !!user,
    role_name: roleName,
    onMessage: handleMessage,
    onConnect: () => {
      console.log('✅ [WS][Gamification] Connected successfully.')
    },
    onDisconnect: (code) => {
      console.log('🔴 [WS][Gamification] Disconnected, code:', code)
    }
  })
}
