import { api } from '@/src/services/api'
import type { GamificationProfile } from '@/components/features/gamification/types'

export const gamificationService = {
  getProfile: async (): Promise<GamificationProfile> => {
    const { data } = await api.get<GamificationProfile>('/gamification/profile')
    return data
  },
}

