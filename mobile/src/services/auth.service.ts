import { Platform } from 'react-native'
import { api } from './api'
import type { OtpVerifyResponse, TokenResponse, User, Session } from '../types/auth'

export const authService = {
  // ── OTP ────────────────────────────────────────────────────────────────────
  sendOtp: (identifier: string, purpose: 'authenticate' | 'reset_password') => {
    const data = identifier.includes('@') ? { email: identifier, purpose } : { phone: identifier, purpose }
    return api.post('/auth/send-otp', data)
  },

  verifyOtp: (identifier: string, otp_code: string, purpose: 'authenticate' | 'reset_password') => {
    const data = identifier.includes('@')
      ? { email: identifier, otp_code, purpose, device_type: Platform.OS.toUpperCase() }
      : { phone: identifier, otp_code, purpose, device_type: Platform.OS.toUpperCase() }
    return api.post<TokenResponse | OtpVerifyResponse>('/auth/verify-otp', data)
  },

  // ── Authenticate ───────────────────────────────────────────────────────────
  loginWithEmail: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password, device_type: Platform.OS.toUpperCase() }),

  loginWithGoogle: (credential: string) =>
    api.post<TokenResponse>('/auth/google', { credential, device_type: Platform.OS.toUpperCase() }),

  register: (data: any) =>
    api.post<{ message: string }>('/auth/register', data),

  checkEmail: (email: string) =>
    api.get<{ available: boolean; message: string }>('/auth/check-email', { params: { email } }),

  verifyEmail: (data: { email: string; code: string }) =>
    api.post<TokenResponse & { user: User }>('/auth/verify-email', data),

  // ── Token ──────────────────────────────────────────────────────────────────
  refresh: (refresh_token: string) =>
    api.post<TokenResponse>('/auth/refresh', { refresh_token }),

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout: () =>
    api.post('/auth/logout'),

  logoutAll: () => api.post('/auth/logout-all'),

  logoutOthers: () => api.post<{ message: string; revoked_count: number; revoked_session_ids: string[] }>('/auth/logout-others'),

  // ── User ───────────────────────────────────────────────────────────────────
  getMe: () => api.get<User>('/auth/me'),
  getPublicProfile: (userId: string) => api.get<User>(`/profile/${userId}`),
  updateProfile: (data: {
    fullname: string
    bio?: string
    facebook_url?: string
    birthday?: string
    conscious?: string
    district?: string
    citizenship_identity?: string
    instructor_description?: string
    learning_goals?: string
    daily_goal_minutes?: number
    preferred_learning_style?: string
  }) => api.put<User>('/profile', data),

  savePreferences: (preferences: string) =>
    api.post<{ message: string }>('/user_preferences', { preferences }),

  generateBio: (request: string) =>
    api.post<string>('/user/chat/profile/create_bio', { request }),

  uploadAvatar: (fileUri: string) => {
    const formData = new FormData()
    const filename = fileUri.split('/').pop() || 'avatar.jpg'
    const match = /\.(\w+)$/.exec(filename)
    const type = match ? `image/${match[1]}` : `image`

    // @ts-ignore
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type,
    })

    return api.put<{ id: string; avatar: string }>('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  uploadCover: (fileUri: string) => {
    const formData = new FormData()
    const filename = fileUri.split('/').pop() || 'cover.jpg'
    const match = /\.(\w+)$/.exec(filename)
    const type = match ? `image/${match[1]}` : `image`

    // @ts-ignore
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type,
    })

    return api.post<{ cover_url: string }>('/auth/cover', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // ── Sessions ───────────────────────────────────────────────────────────────
  getSessions: () => api.get<{ sessions: Session[]; total: number }>('/auth/sessions'),

  revokeSession: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`),
}
