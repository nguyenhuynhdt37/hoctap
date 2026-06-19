import { create } from 'zustand'
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User, TokenResponse } from '../types/auth'
import { authService } from '../services/auth.service'
import { BASE_URL } from '../services/api'
import { queryClient } from '../lib/query-client'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  connectionError: boolean

  // Actions
  initialize: () => Promise<void>
  saveTokens: (tokens: TokenResponse) => Promise<void>
  clearTokens: () => Promise<void>
  refreshUser: () => Promise<void>
  setUser: (user: User) => void
  setConnectionError: (v: boolean) => void
  logout: () => Promise<void>
  login: (access_token: string, refresh_token: string, session_id?: string) => Promise<void>
  bypassLogin: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  connectionError: false,

  setConnectionError: (v: boolean) => set({ connectionError: v }),

  initialize: async () => {
    try {
      set({ isLoading: true, connectionError: false })
      const token = await SecureStore.getItemAsync('access_token')
      const cachedUser = await AsyncStorage.getItem('cached_user')

      if (cachedUser) {
        set({ user: JSON.parse(cachedUser), isAuthenticated: !!token })
      }

      if (!token) {
        set({ isLoading: false, isAuthenticated: false, user: null })
        await AsyncStorage.removeItem('cached_user')
        return
      }

      // getMe() sẽ trigger interceptor nếu 401.
      // Interceptor sẽ tự refresh token và retry.
      const { data } = await authService.getMe()
      set({ user: data, isAuthenticated: true, connectionError: false })
      await AsyncStorage.setItem('cached_user', JSON.stringify(data))
    } catch (error: any) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
      const noResponse = !error.response

      if (isTimeout || noResponse) {
        set({ connectionError: true })
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        await get().clearTokens()
        set({ connectionError: false })
      } else {
        const token = await SecureStore.getItemAsync('access_token')
        set({ isAuthenticated: !!token, connectionError: false })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  saveTokens: async (tokens: TokenResponse) => {
    await SecureStore.setItemAsync('access_token', tokens.access_token)
    await SecureStore.setItemAsync('refresh_token', tokens.refresh_token)
    await SecureStore.setItemAsync('session_id', tokens.session_id)
    try {
      const { data } = await authService.getMe()
      set({ user: data, isAuthenticated: true })
      await AsyncStorage.setItem('cached_user', JSON.stringify(data))
    } catch {
      set({ isAuthenticated: true })
    }
  },

  clearTokens: async () => {
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
    await SecureStore.deleteItemAsync('session_id')
    await AsyncStorage.removeItem('cached_user')
    queryClient.clear()
    // QUAN TRỌNG: set isLoading = false để AuthGuard không bị stuck
    // khi refresh fail (refresh token hết hạn).
    // AuthGuard sẽ thấy isAuthenticated = false và redirect về login.
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  refreshUser: async () => {
    try {
      const { data } = await authService.getMe()
      set({ user: data })
      await AsyncStorage.setItem('cached_user', JSON.stringify(data))
    } catch { }
  },

  setUser: (user: User) => {
    set({ user })
    AsyncStorage.setItem('cached_user', JSON.stringify(user))
  },

  logout: async () => {
    const token = await SecureStore.getItemAsync('access_token')
    const sessionId = await SecureStore.getItemAsync('session_id')

    await get().clearTokens()

    try {
      await axios.post(
        `${BASE_URL}/auth/logout`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          params: sessionId ? { session_id: sessionId } : undefined,
          timeout: 5000,
        }
      )
    } catch { }
  },

  login: async (access_token: string, refresh_token: string, session_id?: string) => {
    await SecureStore.setItemAsync('access_token', access_token)
    await SecureStore.setItemAsync('refresh_token', refresh_token)
    if (session_id) {
      await SecureStore.setItemAsync('session_id', session_id)
    }
    try {
      const { data } = await authService.getMe()
      set({ user: data, isAuthenticated: true })
      await AsyncStorage.setItem('cached_user', JSON.stringify(data))
    } catch {
      set({ isAuthenticated: true })
    }
  },

  bypassLogin: async () => {
    const mockUser: User = {
      id: 'dev-user-id',
      email: 'dev@studynest.com',
      fullname: 'Developer User',
      avatar: null,
      bio: null,
      birthday: null,
      conscious: null,
      district: null,
      citizenship_identity: null,
      facebook_url: null,
      gender: null,
      is_verified_email: true,
      email_verified_at: null,
      is_banned: false,
      banned_reason: null,
      banned_until: null,
      last_login_at: null,
      roles: ['USER'],
      preferences_str: null,
      paypal_email: null,
      paypal_payer_id: null,
      paypal_raw_payer_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await SecureStore.setItemAsync('access_token', 'dev-token')
    set({ user: mockUser, isAuthenticated: true })
  },
}))
