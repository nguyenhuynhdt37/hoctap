/**
 * Streak Service
 * Kết nối thật với Backend API cho Streak Engine
 */

import { api } from '@/src/services/api'
import type {
  StreakStatus,
  StreakCalendarResponse,
  StreakHistoryResponse,
  StreakRestoreResponse,
} from '../../components/features/gamification/types'

export const streakService = {
  /**
   * Lấy trạng thái Streak hiện tại
   */
  getStreakStatus: async (): Promise<StreakStatus> => {
    const { data } = await api.get<StreakStatus>('/gamification/streak')
    return data
  },

  /**
   * Lấy lịch sử ngày hoạt động tích cực
   * @param days số ngày gần nhất cần truy vấn (mặc định 30)
   */
  getStreakCalendar: async (days: number = 30): Promise<StreakCalendarResponse> => {
    const { data } = await api.get<StreakCalendarResponse>('/gamification/streak/calendar', {
      params: { days },
    })
    return data
  },

  /**
   * Lấy lịch sử chi tiết hoạt động đạt chuẩn
   * @param limit giới hạn số bản ghi
   */
  getStreakHistory: async (limit: number = 20): Promise<StreakHistoryResponse> => {
    const { data } = await api.get<StreakHistoryResponse>('/gamification/streak/history', {
      params: { limit },
    })
    return data
  },

  /**
   * Khôi phục Streak bằng Streak Freeze
   */
  restoreStreak: async (): Promise<StreakRestoreResponse> => {
    const { data } = await api.post<StreakRestoreResponse>('/gamification/streak/restore')
    return data
  },
}
