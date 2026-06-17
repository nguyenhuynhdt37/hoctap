import React from 'react'
import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from 'nativewind'
import { router } from 'expo-router'
import { cn } from '@/src/lib/utils'

import * as Haptics from 'expo-haptics'

interface BackButtonProps {
  onPress?: () => void
  className?: string
  icon?: keyof typeof Ionicons.glyphMap
  size?: number
  isDark?: boolean
}

export function BackButton({ onPress, className, icon = 'chevron-back', size = 24, isDark: propIsDark }: BackButtonProps) {
  const { colorScheme } = useColorScheme()
  const isDark = propIsDark ?? (colorScheme === 'dark')

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (onPress) {
      onPress()
    } else {
      if (router.canGoBack()) {
        router.back()
      } else {
        router.replace('/')
      }
    }
  }

  return (
    <Pressable 
      onPress={handlePress}
      className={cn(
        "w-12 h-12 rounded-full items-center justify-center bg-white/80 dark:bg-zinc-900/50 border border-black/5 dark:border-white/10 shadow-sm backdrop-blur-md active:opacity-70",
        className
      )}
    >
      <Ionicons name={icon} size={size} color={isDark ? '#fff' : '#000'} />
    </Pressable>
  )
}
