import { useThemeStore } from '@/src/stores/theme.store'
import { useColorScheme as useNWColorScheme } from 'nativewind'

export function useTheme() {
  const preference = useThemeStore(s => s.preference)
  const setPreference = useThemeStore(s => s.setPreference)

  const { colorScheme: nwScheme, setColorScheme: setNWScheme } = useNWColorScheme()

  const activeScheme = preference === 'system' ? (nwScheme ?? 'dark') : preference

  // Sync NativeWind with our preference
  if (nwScheme !== activeScheme) {
    setNWScheme(activeScheme)
  }

  return {
    preference,
    setPreference,
    colorScheme: activeScheme,
    isDark: activeScheme === 'dark',
  }
}

// Re-export for convenience
export { useColorScheme } from 'nativewind'
