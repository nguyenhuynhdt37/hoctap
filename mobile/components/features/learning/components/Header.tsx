import React, { useRef } from 'react'
import { View, Pressable, Animated, useColorScheme } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui'

interface HeaderProps {
  courseTitle: string
  progress: number
  completedLessons: number
  totalLessons: number
  onBack: () => void
  onMenuPress: () => void
  insets?: { left: number; right: number }
}

import { BackButton } from '@/components/ui/BackButton'

export function Header({
  courseTitle,
  progress,
  completedLessons,
  totalLessons,
  onBack,
  onMenuPress,
  insets,
}: HeaderProps) {
  const isDark = useColorScheme() === 'dark'
  const scaleAnim = useRef(new Animated.Value(1)).current

  const animatePress = (callback: () => void) => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        speed: 40,
        bounciness: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 10,
      }),
    ]).start(callback)
  }

  return (
    <View 
      className={`py-4 flex-row items-center border-b ${
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-100'
      }`}
      style={{ 
        paddingLeft: Math.max(insets?.left ?? 0, 20), 
        paddingRight: Math.max(insets?.right ?? 0, 20) 
      }}
    >
      {/* Back Button */}
      <BackButton onPress={onBack} />

      {/* Title & Progress */}
      <View className="flex-1 mx-4">
        <Text 
          className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`} 
          numberOfLines={1}
        >
          {courseTitle}
        </Text>
        <View className="flex-row items-center gap-2 mt-1.5">
          <View className={`h-1.5 flex-1 rounded-full overflow-hidden max-w-[100px] ${
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          }`}>
            <View
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
          <Text className="text-[10px] text-zinc-500 font-medium">
            {progress}% · {completedLessons}/{totalLessons} bài
          </Text>
        </View>
      </View>

      {/* Menu Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={() => animatePress(onMenuPress)}
          className="w-11 h-11 rounded-2xl items-center justify-center border border-emerald-500/10 bg-emerald-500/[0.08]"
        >
          <Feather name="menu" size={20} color="#10B981" />
        </Pressable>
      </Animated.View>
    </View>
  )
}
