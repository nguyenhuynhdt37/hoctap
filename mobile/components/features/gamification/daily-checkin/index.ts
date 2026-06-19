/**
 * Gamification – Daily Check-in module exports
 */

// Main widget (dùng trên Home)
export { DailyCheckinCard } from './DailyCheckinCard'

// Hook
export { useDailyCheckin, CHECKIN_QUERY_KEY } from './useDailyCheckin'

// Reusable components (dùng cho Mission, Achievement, v.v.)
export { CalendarDay, getCalendarDayStatus } from './components/CalendarDay'
export { RewardBadge, StreakBadge } from './components/RewardBadge'
export { PeakAnimation, PeakCounter } from './components/PeakAnimation'
export { CheckinBottomSheet } from './components/CheckinBottomSheet'
export { RewardPopup } from './components/RewardPopup'
export { DailyCheckinWidgetSkeleton, DailyCheckinSheetSkeleton } from './components/LoadingSkeleton'
export { EmptyState, ErrorState } from './components/EmptyErrorState'

// Types
export type {
  CheckinStatusResponse,
  CheckinClaimResponse,
  CalendarDayDTO,
  CalendarDayStatus,
  RewardDTO,
  ClaimState,
} from './types'
