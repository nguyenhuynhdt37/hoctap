import { create } from 'zustand'

export type GamificationRealtimeEvent =
  | {
      id?: string
      event: 'streak.updated'
      current_streak: number
      previous_streak?: number
      best_streak?: number
      today_completed?: boolean
      milestone?: number | null
    }
  | {
      id?: string
      event: 'streak.restored'
      current_streak: number
      previous_streak?: number
      best_streak?: number
      streak_freezes_left?: number
      today_completed?: boolean
    }
  | {
      id?: string
      event: 'streak.milestone'
      current_streak?: number
      milestone: number
    }
  | {
      id?: string
      event: 'xp.earned'
      xp: number
      current_xp?: number
      next_level_xp?: number
    }
  | {
      id?: string
      event: 'level.up'
      previous_level: number
      current_level: number
      current_xp?: number
      next_level_xp?: number
      reward_peak?: number
    }
  | {
      id?: string
      event: 'peak.earned'
      amount: number
      balance: number
    }
  | {
      id?: string
      event: 'mission.completed'
      mission_name: string
      reward_peak?: number
      reward_xp?: number
    }
  | {
      id?: string
      event: 'daily_checkin.completed'
      consecutive_day?: number
      day_in_cycle?: number
      event_code?: string
    }
  | {
      id?: string
      event: 'achievement.unlocked'
      achievement_name?: string
      title?: string
      reward_peak?: number
      reward_xp?: number
    }

type QueuedGamificationEvent = GamificationRealtimeEvent & {
  id: string
}

interface GamificationEventQueueState {
  activeEvent: QueuedGamificationEvent | null
  queue: QueuedGamificationEvent[]
  enqueue: (event: GamificationRealtimeEvent) => void
  completeActive: () => void
  clear: () => void
}

function createEventId(event: GamificationRealtimeEvent) {
  return event.id ?? `${event.event}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useGamificationEventQueueStore = create<GamificationEventQueueState>((set) => ({
  activeEvent: null,
  queue: [],
  enqueue: (event) =>
    set((state) => {
      const queuedEvent = { ...event, id: createEventId(event) } as QueuedGamificationEvent

      if (!state.activeEvent) {
        return { activeEvent: queuedEvent }
      }

      return { queue: [...state.queue, queuedEvent] }
    }),
  completeActive: () =>
    set((state) => {
      const [nextEvent, ...remaining] = state.queue
      return {
        activeEvent: nextEvent ?? null,
        queue: remaining,
      }
    }),
  clear: () => set({ activeEvent: null, queue: [] }),
}))
