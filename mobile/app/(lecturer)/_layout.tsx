import React, { useEffect } from 'react'
import { Stack, router, useRootNavigationState } from 'expo-router'
import { useAuthStore } from '@/src/stores/auth.store'

export default function LecturerLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isLoading = useAuthStore(s => s.isLoading)
  const rootNavigationState = useRootNavigationState()

  useEffect(() => {
    if (isLoading || !rootNavigationState?.key) return
    if (!isAuthenticated) router.replace('/(auth)/onboarding')
  }, [isAuthenticated, isLoading, rootNavigationState?.key])

  if (!rootNavigationState?.key || isLoading) return null

  return <Stack screenOptions={{ headerShown: false }} />
}
