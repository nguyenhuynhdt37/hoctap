import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native'
import { AnimatePresence, MotiView } from 'moti'
import { Feather } from '@expo/vector-icons'
import { useColorScheme } from 'nativewind'
import { useStreakToastStore } from './useStreakToastStore'
import { GamificationRadius, GamificationShadow } from '../tokens'

const { width: SW } = Dimensions.get('window')

export function StreakMilestoneToast() {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const { visible, milestone, hideToast } = useStreakToastStore()

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        hideToast()
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [visible, hideToast])

  return (
    <AnimatePresence>
      {visible && milestone !== null && (
        <MotiView
          from={{ opacity: 0, translateY: -120 }}
          animate={{ opacity: 1, translateY: 50 }}
          exit={{ opacity: 0, translateY: -120 }}
          transition={{ type: 'spring', damping: 18, stiffness: 150 }}
          style={[
            styles.container,
            isDark ? styles.darkContainer : styles.lightContainer,
            GamificationShadow.streak,
          ]}
        >
          <Pressable onPress={hideToast} className="flex-row items-center p-4">
            <View className="w-10 h-10 rounded-full bg-orange-500/15 items-center justify-center mr-3 border border-orange-500/25">
              <Feather name="zap" size={22} color="#F97316" />
            </View>
            <View className="flex-1 text-left">
              <Text className={`font-black text-sm text-left ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Cột mốc mới: {milestone} ngày!
              </Text>
              <Text className={`text-xs mt-0.5 text-left ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Kỷ lục chuỗi ngày học tập liên tiếp 🎉
              </Text>
            </View>
            <Feather name="x" size={16} color={isDark ? '#52525b' : '#a1a1aa'} />
          </Pressable>
        </MotiView>
      )}
    </AnimatePresence>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: SW * 0.05,
    width: SW * 0.9,
    borderRadius: GamificationRadius.xl,
    borderWidth: 1,
    zIndex: 9999,
  },
  lightContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#e4e4e7',
  },
  darkContainer: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
  },
})
