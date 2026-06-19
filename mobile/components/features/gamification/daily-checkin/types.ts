/**
 * TypeScript types for the Gamification module.
 * Maps 1:1 with the backend DTOs defined in:
 *   app/schemas/gamification/daily_checkin.py
 */

// ─────────────────────────────────────────────────────────────
// REWARD
// ─────────────────────────────────────────────────────────────

export interface RewardDTO {
  day_number: number
  reward_type: string
  reward_amount: number | null
  reward_metadata: Record<string, unknown> | null
}

// ─────────────────────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────────────────────

export type CalendarDayStatus = 'checked' | 'today' | 'locked' | 'mystery'

export interface CalendarDayDTO {
  day_number: number
  checkin_date: string | null   // ISO date string "YYYY-MM-DD"
  is_checked: boolean
  reward: RewardDTO | null
}

// ─────────────────────────────────────────────────────────────
// CHECK-IN STATUS  (GET /checkin)
// ─────────────────────────────────────────────────────────────

export interface CheckinStatusResponse {
  checked_today: boolean
  current_streak: number
  best_streak: number
  current_day_in_cycle: number
  cycle_days: number
  today_reward: RewardDTO | null
  next_reward: RewardDTO | null
  calendar: CalendarDayDTO[]
  current_peak_balance: number
}

// ─────────────────────────────────────────────────────────────
// CLAIM CHECK-IN  (POST /checkin)
// ─────────────────────────────────────────────────────────────

export interface CheckinClaimResponse {
  success: boolean
  message: string
  current_day: number
  reward: RewardDTO | null
  current_peak_balance: number
  current_streak: number
  best_streak: number
  calendar: CalendarDayDTO[]
}

// ─────────────────────────────────────────────────────────────
// CLAIM ANIMATION STATE
// ─────────────────────────────────────────────────────────────

export type ClaimState = 'idle' | 'loading' | 'success' | 'already_claimed' | 'error'
