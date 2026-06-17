import React, { useEffect } from 'react'
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router'
import { useAuthStore } from '@/src/stores/auth.store'
import { requestNotificationPermissions } from '@/src/utils/notifications'

export default function AppLayout() {
  const user = useAuthStore(s => s.user)
  const isLoading = useAuthStore(s => s.isLoading)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const rootNavigationState = useRootNavigationState()
  const segments = useSegments()
  const isNavReady = Boolean(rootNavigationState?.key)

  useEffect(() => {
    requestNotificationPermissions()
  }, [])

  useEffect(() => {
    if (isLoading || !isNavReady) return

    const inAppGroup = segments[0] === '(app)'
    const inAuthGroup = segments[0] === '(auth)'
    const currentScreen = segments[segments.length - 1]
    const isCompleteProfile = currentScreen === 'complete-profile'
    const isAccountSettingsScreen = ['language', 'settings', 'profile'].includes(
      String(currentScreen)
    )

    if (isAuthenticated) {
      if (!user) return

      if (!user?.preferences_str) {
        if (!isCompleteProfile && !isAccountSettingsScreen) {
          router.replace('/(app)/complete-profile')
        }
      } else {
        if (isCompleteProfile || !inAppGroup) {
          router.replace('/(app)/(tabs)')
        }
      }
    } else if (!inAuthGroup && segments[0] !== 'demo') {
      router.replace('/(auth)/onboarding')
    }
  }, [isAuthenticated, user, isLoading, segments, isNavReady])

  if (!isNavReady || isLoading) {
    return null
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="complete-profile"
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="favorites/index"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
    </Stack>
  )
}
