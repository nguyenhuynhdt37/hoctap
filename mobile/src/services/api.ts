import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { queryClient } from '@/src/lib/query-client'

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// ── Request: inject access_token ─────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  if (__DEV__) {
    console.log(
      `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
      config.data || config.params || ''
    )
  }

  return config
})

// ── Debug Logging ─────────────────────────────────────────────────────────────
if (__DEV__) {
  api.interceptors.response.use(
    (res) => {
      console.log(`[API Response] ${res.status} ${res.config.url}`, res.data)
      return res
    },
    (err) => {
      console.warn(
        `[API Error] ${err.response?.status} ${err.config?.url}`,
        err.response?.data || err.message
      )
      return Promise.reject(err)
    }
  )
}

// ── Response: auto-refresh on 401 ────────────────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (v: string) => void
  reject: (e: unknown) => void
}> = []

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    // Chỉ xử lý 401 khi CÓ response từ server (không phải network error)
    const is401 = error.response?.status === 401
    if (!is401) return Promise.reject(error)

    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }
    if (!original) return Promise.reject(error)

    // Skip các auth endpoint không được refresh/retry để tránh vòng lặp logout.
    if (
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/logout')
    ) {
      return Promise.reject(error)
    }

    // Skip nếu đã retry rồi (tránh infinite loop)
    if (original._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
        .catch((err) => Promise.reject(err))
    }

    original._retry = true
    isRefreshing = true

    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token')
      if (!refreshToken) throw new Error('no_refresh_token')

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
        device_type: Platform.OS.toUpperCase(),
      })

      await SecureStore.setItemAsync('access_token', data.access_token)
      await SecureStore.setItemAsync('refresh_token', data.refresh_token)
      await SecureStore.setItemAsync('session_id', data.session_id)

      // KHÔNG gọi initialize()/getMe() ở đây — nó sẽ trigger navigation
      // bên trong interceptor (React Navigation context chưa sẵn sàng).
      // Chỉ update user state với cached data, React Query sẽ refetch.
      const { useAuthStore } = await import('@/src/stores/auth.store')
      useAuthStore.setState({ isAuthenticated: true })

      // Invalidate tất cả queries để force refetch với token mới
      await queryClient.invalidateQueries()

      failedQueue.forEach((p) => p.resolve(data.access_token))
      failedQueue = []

      original.headers.Authorization = `Bearer ${data.access_token}`
      return api(original)
    } catch (refreshErr) {
      failedQueue.forEach((p) => p.reject(refreshErr))
      failedQueue = []

      const { useAuthStore } = await import('@/src/stores/auth.store')
      await useAuthStore.getState().clearTokens()

      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  }
)

// ── Helper: extract error message ─────────────────────────────────────────────
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    const errorMessages: Record<string, string> = {
      OTP_INVALID: 'Mã OTP không đúng',
      OTP_NOT_FOUND: 'Mã OTP đã hết hạn, vui lòng gửi lại',
      OTP_MAX_ATTEMPTS: 'Đã thử quá 3 lần, vui lòng gửi OTP mới',
      OTP_COOLDOWN: 'Vui lòng chờ 60 giây trước khi gửi lại',
      PHONE_EXISTS: 'Số điện thoại đã được đăng ký',
      INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
      ACCOUNT_BLOCKED: 'Tài khoản đã bị khóa',
      REFRESH_TOKEN_INVALID: 'Phiên đăng nhập hết hạn',
      OTP_TOKEN_INVALID: 'Phiên xác thực hết hạn, vui lòng thử lại',
    }
    if (data?.code && errorMessages[data.code]) return errorMessages[data.code]
    if (typeof data?.detail === 'string') return data.detail
  }
  return 'Có lỗi xảy ra, vui lòng thử lại'
}
