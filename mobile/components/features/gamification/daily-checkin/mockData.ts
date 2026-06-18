/**
 * Mock Data for Daily Check-in.
 * Thay bằng API call khi backend sẵn sàng.
 * Chỉ cần sửa useDailyCheckin.ts để kết nối real API.
 */

import type {
  CheckinStatusResponse,
  CheckinClaimResponse,
  CalendarDayDTO,
  RewardDTO,
} from './types'

// ─────────────────────────────────────────────────────────────
// HELPER – build mock calendar
// ─────────────────────────────────────────────────────────────

const REWARDS: RewardDTO[] = [
  { day_number: 1, reward_type: 'peak_wallet', reward_amount: 20, reward_metadata: null },
  { day_number: 2, reward_type: 'peak_wallet', reward_amount: 30, reward_metadata: null },
  { day_number: 3, reward_type: 'peak_wallet', reward_amount: 50, reward_metadata: null },
  { day_number: 4, reward_type: 'peak_wallet', reward_amount: 75, reward_metadata: null },
  { day_number: 5, reward_type: 'peak_wallet', reward_amount: 100, reward_metadata: null },
  { day_number: 6, reward_type: 'peak_wallet', reward_amount: 150, reward_metadata: null },
  { day_number: 7, reward_type: 'mystery_box', reward_amount: null, reward_metadata: { box_type: 'gold' } },
]

const today = new Date()
const fmt = (d: Date) => d.toISOString().split('T')[0]

function buildCalendar(checkedDays: number, cycleStart: Date): CalendarDayDTO[] {
  return REWARDS.map((reward, i) => {
    const dayDate = new Date(cycleStart)
    dayDate.setDate(cycleStart.getDate() + i)
    const isChecked = i < checkedDays
    return {
      day_number: i + 1,
      checkin_date: isChecked ? fmt(dayDate) : null,
      is_checked: isChecked,
      reward,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// MOCK – "Not yet checked in today" (day 4 in cycle)
// ─────────────────────────────────────────────────────────────

const cycleStart = new Date(today)
cycleStart.setDate(today.getDate() - 3)

export const MOCK_CHECKIN_STATUS_UNCHECKED: CheckinStatusResponse = {
  checked_today: false,
  current_streak: 3,
  best_streak: 7,
  current_day_in_cycle: 4,
  cycle_days: 7,
  today_reward: REWARDS[3],
  next_reward: REWARDS[4],
  calendar: buildCalendar(3, cycleStart),
  current_peak_balance: 1240,
}

// ─────────────────────────────────────────────────────────────
// MOCK – "Already checked in today" (day 4 complete)
// ─────────────────────────────────────────────────────────────

export const MOCK_CHECKIN_STATUS_CHECKED: CheckinStatusResponse = {
  checked_today: true,
  current_streak: 4,
  best_streak: 7,
  current_day_in_cycle: 4,
  cycle_days: 7,
  today_reward: null,
  next_reward: REWARDS[4],
  calendar: buildCalendar(4, cycleStart),
  current_peak_balance: 1315,
}

// ─────────────────────────────────────────────────────────────
// MOCK – Claim response (POST /checkin)
// ─────────────────────────────────────────────────────────────

export const MOCK_CLAIM_RESPONSE: CheckinClaimResponse = {
  success: true,
  message: 'Check-in thành công! 🎉',
  current_day: 4,
  reward: REWARDS[3],
  current_peak_balance: 1315,
  current_streak: 4,
  best_streak: 7,
  calendar: buildCalendar(4, cycleStart),
}

// ─────────────────────────────────────────────────────────────
// MOCK – Complete cycle (day 7 – mystery box)
// ─────────────────────────────────────────────────────────────

const cycleStartFull = new Date(today)
cycleStartFull.setDate(today.getDate() - 6)

export const MOCK_CHECKIN_STATUS_DAY7: CheckinStatusResponse = {
  checked_today: false,
  current_streak: 6,
  best_streak: 14,
  current_day_in_cycle: 7,
  cycle_days: 7,
  today_reward: REWARDS[6],
  next_reward: REWARDS[0],
  calendar: buildCalendar(6, cycleStartFull),
  current_peak_balance: 3500,
}
