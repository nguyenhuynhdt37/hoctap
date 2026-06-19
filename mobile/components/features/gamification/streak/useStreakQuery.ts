import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { streakService } from '@/src/services/streak.service'
import { useGamificationStore } from '@/src/stores/gamification.store'

export const STREAK_KEYS = {
  status: ['gamification', 'streak', 'status'] as const,
  calendar: (days: number) => ['gamification', 'streak', 'calendar', days] as const,
  history: (limit: number) => ['gamification', 'streak', 'history', limit] as const,
}

export function useStreak() {
  const updateStreakStore = useGamificationStore((s) => s.updateStreak)

  return useQuery({
    queryKey: STREAK_KEYS.status,
    queryFn: async () => {
      const status = await streakService.getStreakStatus()
      updateStreakStore(status)
      return status
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useStreakCalendar(days = 30) {
  return useQuery({
    queryKey: STREAK_KEYS.calendar(days),
    queryFn: () => streakService.getStreakCalendar(days),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useStreakHistory(limit = 20) {
  return useQuery({
    queryKey: STREAK_KEYS.history(limit),
    queryFn: () => streakService.getStreakHistory(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useRestoreStreak() {
  const queryClient = useQueryClient()
  const updateStreakStore = useGamificationStore((s) => s.updateStreak)

  return useMutation({
    mutationFn: streakService.restoreStreak,
    onSuccess: (data) => {
      // Update Zustand store
      updateStreakStore({
        current_streak: data.current_streak,
        streak_freezes: data.streak_freezes_left,
      })
      // Invalidate related React Query caches
      queryClient.invalidateQueries({ queryKey: STREAK_KEYS.status })
      queryClient.invalidateQueries({ queryKey: ['gamification'] })
    },
  })
}
