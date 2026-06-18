import React from 'react'
import { View, Text } from 'react-native'
import { useColorScheme } from 'nativewind'
import { Feather } from '@expo/vector-icons'
import { GamificationColors } from '../tokens'

interface StudyStreakBadgeProps {
  streak: number
  size?: 'sm' | 'md' | 'lg'
}

export function StudyStreakBadge({ streak, size = 'md' }: StudyStreakBadgeProps) {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  const sizeConfig = {
    sm: {
      padding: 'px-2.5 py-1',
      iconSize: 13,
      textSize: 'text-xs',
      gap: 1,
    },
    md: {
      padding: 'px-3 py-1.5',
      iconSize: 16,
      textSize: 'text-sm',
      gap: 1.5,
    },
    lg: {
      padding: 'px-4 py-2',
      iconSize: 20,
      textSize: 'text-lg',
      gap: 2,
    },
  }[size]

  return (
    <View
      className={`flex-row items-center rounded-full border ${sizeConfig.padding} ${
        isDark 
          ? 'bg-orange-500/10 border-orange-500/20' 
          : 'bg-orange-50 border-orange-200'
      }`}
      style={{ gap: sizeConfig.gap }}
    >
      <Feather name="zap" size={sizeConfig.iconSize} color={GamificationColors.streak.DEFAULT} />
      <Text className={`font-black text-orange-500 ${sizeConfig.textSize}`}>
        {streak} ngày
      </Text>
    </View>
  )
}
