import React from 'react'
import { ViewStyle } from 'react-native'
import { MotiView } from 'moti'
import { useColorScheme } from 'nativewind'

interface GamificationSkeletonProps {
  width?: number | string
  height?: number | string
  borderRadius?: number
  style?: ViewStyle
}

export function GamificationSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: GamificationSkeletonProps) {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  const bgBase = isDark ? 'bg-zinc-800/60' : 'bg-zinc-200'

  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 0.8 }}
      transition={{
        type: 'timing',
        duration: 900,
        loop: true,
      }}
      style={[{ width: width as any, height: height as any, borderRadius }, style]}
      className={bgBase}
    />
  )
}
