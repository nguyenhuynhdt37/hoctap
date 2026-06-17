import React, { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { useAuthStore } from '@/src/stores/auth.store'
import { requestNotificationPermissions } from '@/src/utils/notifications'
import { NotificationWS } from '../../src/providers/NotificationWS'

export default function AppLayout() {
  const user = useAuthStore(s => s.user)
  const isLoading = useAuthStore(s => s.isLoading)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const segments = useSegments()

  useEffect(() => {
    requestNotificationPermissions()
  }, [])

  useEffect(() => {
    if (isLoading) return

    const inAppGroup = segments[0] === '(app)'
    const inAuthGroup = segments[0] === '(auth)'
    const currentScreen = segments[segments.length - 1]
    const isCompleteProfile = currentScreen === 'complete-profile'
    const isAccountSettingsScreen = ['language', 'settings', 'profile'].includes(
      String(currentScreen)
    )

    const runRedirect = () => {
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
    }

    const timer = setTimeout(runRedirect, 0)
    return () => clearTimeout(timer)
  }, [isAuthenticated, user, isLoading, segments])

  if (isLoading) {
    return null
  }

  return (
    <>
      <NotificationWS />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="learning/[slug]" />
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
    </>
  )
}
