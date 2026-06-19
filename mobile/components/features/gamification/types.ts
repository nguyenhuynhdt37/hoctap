export interface StreakStatus {
  current_streak: number
  best_streak: number
  streak_freezes: number
  last_active_date: string | null
}

export interface StreakRestoreResponse {
  success: boolean
  message: string
  current_streak: number
  streak_freezes_left: number
}

export interface ActivityLogDTO {
  id: string
  action_type: string
  source_event_id?: string | null
  created_at?: string | null
  metadata?: Record<string, any>
}

export interface StreakHistoryResponse {
  activities: ActivityLogDTO[]
}

export interface StreakCalendarResponse {
  active_dates: string[]
}

export interface GamificationProfile {
  level: number
  current_xp: number
  total_xp: number
  required_xp: number
  current_peak_balance: number
  streak: StreakStatus
}
