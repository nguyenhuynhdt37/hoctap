import { create } from 'zustand'
import { gamificationService } from '../services/gamification.service'
import type { StreakStatus } from '../../components/features/gamification/types'

interface GamificationState {
  streak: StreakStatus | null
  peakBalance: number
  level: number
  currentXp: number
  requiredXp: number
  totalXp: number
  isLoading: boolean
  error: string | null

  // Actions
  fetchGamificationData: () => Promise<void>
  updateStreak: (streak: Partial<StreakStatus>) => void
  updatePeak: (balance: number) => void
  updateXp: (currentXp: number, requiredXp: number) => void
  updateLevel: (level: number, currentXp?: number, requiredXp?: number) => void
  clearError: () => void
}

export const useGamificationStore = create<GamificationState>((set) => ({
  streak: null,
  peakBalance: 0,
  level: 0,
  currentXp: 0,
  requiredXp: 0,
  totalXp: 0,
  isLoading: true,
  error: null,

  fetchGamificationData: async () => {
    try {
      set({ isLoading: true, error: null })
      const profile = await gamificationService.getProfile()

      set({
        streak: profile.streak,
        peakBalance: profile.current_peak_balance,
        level: profile.level,
        currentXp: profile.current_xp,
        requiredXp: profile.required_xp,
        totalXp: profile.total_xp,
      })
    } catch (error) {
      console.warn('[GamificationStore] Error fetching gamification data:', error)
      set({ error: 'GAMIFICATION_PROFILE_FETCH_FAILED' })
    } finally {
      set({ isLoading: false })
    }
  },

  updateStreak: (newStreak: Partial<StreakStatus>) => {
    set((state) => ({
      streak: state.streak ? { ...state.streak, ...newStreak } : (newStreak as StreakStatus),
    }))
  },

  updatePeak: (balance: number) => {
    set({ peakBalance: balance })
  },

  updateXp: (currentXp: number, requiredXp: number) => {
    set({ currentXp, requiredXp })
  },

  updateLevel: (level: number, currentXp?: number, requiredXp?: number) => {
    set((state) => ({
      level,
      currentXp: currentXp ?? state.currentXp,
      requiredXp: requiredXp ?? state.requiredXp,
    }))
  },

  clearError: () => set({ error: null }),
}))
