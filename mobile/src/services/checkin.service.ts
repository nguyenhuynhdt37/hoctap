/**
 * Daily Check-in Service
 * Kết nối thật với Backend API:
 *   GET  /api/v1/gamification/checkin  – lấy trạng thái
 *   POST /api/v1/gamification/checkin  – thực hiện check-in
 */

import { api } from '@/src/services/api'
import type { CheckinStatusResponse, CheckinClaimResponse } from '../daily-checkin/types'

export const checkinService = {
  /**
   * Lấy trạng thái check-in hôm nay của user đang đăng nhập.
   */
  getStatus: async (): Promise<CheckinStatusResponse> => {
    const { data } = await api.get<CheckinStatusResponse>('/gamification/checkin')
    return data
  },

  /**
   * Thực hiện check-in (idempotent – server trả 409 nếu đã check-in).
   * Ném lỗi nếu HTTP ≥ 400, caller tự xử lý.
   */
  claim: async (): Promise<CheckinClaimResponse> => {
    const { data } = await api.post<CheckinClaimResponse>('/gamification/checkin')
    return data
  },
}
