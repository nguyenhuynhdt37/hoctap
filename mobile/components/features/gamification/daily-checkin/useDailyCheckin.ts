/**
 * useDailyCheckin
 * Hook quản lý toàn bộ state của Daily Check-in widget.
 * Dùng React Query + real API.
 */

import { useCallback, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { checkinService } from '@/src/services/checkin.service'
import type {
  CheckinStatusResponse,
  CheckinClaimResponse,
  ClaimState,
} from './types'

export const CHECKIN_QUERY_KEY = ['gamification', 'checkin'] as const

interface UseDailyCheckinReturn {
  status: CheckinStatusResponse | null
  claimState: ClaimState
  isLoading: boolean
  isError: boolean
  claimResult: CheckinClaimResponse | null
  claim: () => Promise<void>
  refresh: () => Promise<void>
}

export function useDailyCheckin(): UseDailyCheckinReturn {
  const queryClient = useQueryClient()
  const [claimState, setClaimState] = useState<ClaimState>('idle')
  const [claimResult, setClaimResult] = useState<CheckinClaimResponse | null>(null)

  // ── Fetch status ────────────────────────────────────────────
  const {
    data: status = null,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: CHECKIN_QUERY_KEY,
    queryFn: checkinService.getStatus,
    staleTime: 1000 * 60 * 5,   // 5 phút – không refetch liên tục
    retry: 2,
  })

  // ── Claim mutation ──────────────────────────────────────────
  const { mutateAsync: claimMutation } = useMutation({
    mutationFn: checkinService.claim,
    onSuccess: (data) => {
      // Cập nhật cache ngay lập tức với dữ liệu mới từ server
      queryClient.setQueryData<CheckinStatusResponse>(CHECKIN_QUERY_KEY, (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          checked_today: true,
          current_streak: data.current_streak,
          best_streak: data.best_streak,
          current_day_in_cycle: data.current_day,
          today_reward: null,
          next_reward: prev.next_reward,
          calendar: data.calendar,
          current_peak_balance: data.current_peak_balance,
        }
      })
    },
  })

  // ── Public claim action ─────────────────────────────────────
  const claim = useCallback(async () => {
    if (claimState === 'loading') return

    // Nếu đã check-in (biết trước qua status) → không gọi API
    if (status?.checked_today) {
      setClaimState('already_claimed')
      return
    }

    setClaimState('loading')
    try {
      const result = await claimMutation()
      setClaimResult(result)
      setClaimState('success')
    } catch (err: unknown) {
      // Xử lý 409 ALREADY_CHECKED_IN từ server
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setClaimState('already_claimed')
        // Refresh để lấy status mới nhất
        queryClient.invalidateQueries({ queryKey: CHECKIN_QUERY_KEY })
      } else {
        setClaimState('error')
      }
    }
  }, [claimState, status, claimMutation, queryClient])

  // ── Pull-to-refresh / manual refresh ───────────────────────
  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  return {
    status,
    claimState,
    isLoading,
    isError,
    claimResult,
    claim,
    refresh,
  }
}
