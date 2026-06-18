import React from 'react'
import { View, ViewProps, StyleSheet } from 'react-native'
import { useColorScheme } from 'nativewind'
import { BlurView } from 'expo-blur'
import { GamificationRadius, GamificationShadow } from '../tokens'

interface GamificationCardProps extends ViewProps {
  children: React.ReactNode
  isDark?: boolean
  intensity?: number
  hasShadow?: boolean
  shadowType?: 'sm' | 'md' | 'peak' | 'streak' | 'exp' | 'glow'
}

export function GamificationCard({
  children,
  isDark: propIsDark,
  intensity,
  hasShadow = true,
  shadowType = 'sm',
  style,
  ...props
}: GamificationCardProps) {
  const { colorScheme } = useColorScheme()
  const isDark = propIsDark !== undefined ? propIsDark : colorScheme === 'dark'
  
  const blurIntensity = intensity !== undefined ? intensity : (isDark ? 25 : 0)
  
  const borderStyle = isDark 
    ? 'border-white/5 bg-zinc-900/45' 
    : 'border-zinc-100 bg-white/90'

  const shadowStyle = hasShadow ? GamificationShadow[shadowType] : {}

  return (
    <View
      style={[
        { borderRadius: GamificationRadius.lg, overflow: 'hidden' }, 
        shadowStyle, 
        style
      ]}
      className={`border ${borderStyle}`}
      {...props}
    >
      <BlurView
        intensity={blurIntensity}
        tint={isDark ? 'dark' : 'default'}
        className="p-5"
      >
        {children}
      </BlurView>
    </View>
  )
}
