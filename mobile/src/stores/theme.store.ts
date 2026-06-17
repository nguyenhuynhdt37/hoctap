import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

type ColorSchemePreference = 'system' | 'light' | 'dark'

/**
 * Theme store — Persistent storage for user theme preferences.
 */
interface ThemeState {
  preference: ColorSchemePreference
  setPreference: (p: ColorSchemePreference) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'user-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
