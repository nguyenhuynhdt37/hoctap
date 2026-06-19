import { create } from 'zustand'

interface StreakToastState {
  // Toast top (cho cột mốc quan trọng)
  visible: boolean
  milestone: number | null
  showToast: (milestone: number) => void
  hideToast: () => void

  // Popup chính giữa màn hình (Duolingo style - cho mỗi lần tăng streak)
  celebrationVisible: boolean
  currentStreak: number
  bestStreak: number
  showCelebration: (currentStreak: number, bestStreak: number) => void
  hideCelebration: () => void
}

export const useStreakToastStore = create<StreakToastState>((set) => ({
  visible: false,
  milestone: null,
  showToast: (milestone) => set({ visible: true, milestone }),
  hideToast: () => set({ visible: false, milestone: null }),

  celebrationVisible: false,
  currentStreak: 0,
  bestStreak: 0,
  showCelebration: (currentStreak, bestStreak) =>
    set({ celebrationVisible: true, currentStreak, bestStreak }),
  hideCelebration: () => set({ celebrationVisible: false }),
}))
