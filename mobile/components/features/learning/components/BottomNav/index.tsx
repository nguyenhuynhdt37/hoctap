import React, { useCallback, useRef } from 'react'
import { View, Pressable, Animated, useColorScheme } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'

interface BottomNavProps {
  canPrev: boolean
  canNext: boolean
  isCompleted: boolean
  onPrev: () => void
  onNext: () => void
  onMenu: () => void
  insets?: { left: number; right: number }
  shouldShake?: boolean
}

export function BottomNav({
  canPrev,
  canNext,
  isCompleted,
  onPrev,
  onNext,
  onMenu,
  insets,
  shouldShake,
}: BottomNavProps) {
  const isDark = useColorScheme() === 'dark'
  const scaleAnim = useRef(new Animated.Value(1)).current
  const shakeAnim = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (shouldShake && canNext) {
      const shake = Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ])
      
      const interval = setInterval(() => {
        shake.start()
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      }, 500)
      
      return () => {
        clearInterval(interval)
        shakeAnim.setValue(0)
      }
    }
  }, [shouldShake, canNext])

  const animatePress = (callback: () => void) => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
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
    ]).start()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    callback()
  }

  return (
    <View 
      className={`flex-row items-center py-4 border-t ${
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-100'
      }`}
      style={{
        paddingLeft: Math.max(insets?.left ?? 0, 20),
        paddingRight: Math.max(insets?.right ?? 0, 20),
      }}
    >
      {/* Menu */}
      <Pressable
        onPress={() => animatePress(onMenu)}
        className={`w-11 h-11 rounded-2xl items-center justify-center border ${
          isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'
        }`}
      >
        <Feather name="menu" size={20} color={isDark ? '#A1A1AA' : '#71717A'} />
      </Pressable>

      <View className="flex-1" />

      <View className="flex-row items-center gap-2">
        {/* Prev Button */}
        <Pressable
          onPress={() => animatePress(onPrev)}
          disabled={!canPrev}
          className={`px-6 py-3 rounded-2xl border ${
            canPrev 
              ? isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'
              : isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50'
          }`}
        >
          <Text className={`text-xs font-bold ${
            canPrev ? isDark ? 'text-zinc-200' : 'text-zinc-700' : 'text-zinc-400'
          }`}>
            TRƯỚC
          </Text>
        </Pressable>

        {/* Next Button */}
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <Pressable
            onPress={() => animatePress(onNext)}
            disabled={!canNext}
            className={`px-6 py-3 rounded-2xl ${
              canNext 
                ? isCompleted ? 'bg-emerald-500' : 'bg-emerald-600' 
                : isDark ? 'bg-zinc-800' : 'bg-zinc-200'
            }`}
          >
            <Text className={`text-xs font-bold ${canNext ? 'text-white' : 'text-zinc-400'}`}>
              TIẾP THEO
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      <View className="flex-1" />

      {/* Chat */}
      <Pressable
        onPress={() => { }}
        className={`w-11 h-11 rounded-2xl items-center justify-center border ${
          isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'
        }`}
      >
        <Feather name="message-circle" size={20} color={isDark ? '#A1A1AA' : '#71717A'} />
      </Pressable>
    </View>
  )
}
