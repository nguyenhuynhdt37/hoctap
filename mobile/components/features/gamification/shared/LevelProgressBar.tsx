import React from 'react'
import { View, Text } from 'react-native'
import { MotiView } from 'moti'
import { useColorScheme } from 'nativewind'
import { LinearGradient } from 'expo-linear-gradient'

interface LevelProgressBarProps {
  level: number
  currentXp: number
  requiredXp: number
}

export function LevelProgressBar({ level, currentXp, requiredXp }: LevelProgressBarProps) {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  const percentage = requiredXp > 0 ? (currentXp / requiredXp) * 100 : 0
  const cleanPercentage = Math.min(100, Math.max(0, percentage))

  return (
    <View className="w-full">
      {/* Header Info */}
      <View className="flex-row justify-between items-center mb-2.5">
        <View className="flex-row items-center">
          <View 
            className="w-8 h-8 rounded-full bg-indigo-500 items-center justify-center mr-2.5 shadow-sm"
            style={{
              shadowColor: '#6366F1',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 2
            }}
          >
            <Text className="text-white font-black text-xs">Lv.{level}</Text>
          </View>
          <Text className={`font-black text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            Đường tới Cấp {level + 1}
          </Text>
        </View>
        <Text className={`text-xs font-black tracking-tight ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {requiredXp > 0
            ? `${currentXp.toLocaleString()} / ${requiredXp.toLocaleString()} XP`
            : `${currentXp.toLocaleString()} XP`}
        </Text>
      </View>

      {/* Progress Track */}
      <View className={`h-3 w-full rounded-full overflow-hidden ${isDark ? 'bg-zinc-800/80' : 'bg-zinc-100'}`}>
        <MotiView
          animate={{ width: `${cleanPercentage}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 80 }}
          style={{ height: '100%', minWidth: 8 }}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="h-full rounded-full"
          />
        </MotiView>
      </View>
    </View>
  )
}
