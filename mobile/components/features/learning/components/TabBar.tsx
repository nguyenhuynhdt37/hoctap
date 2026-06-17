import React from 'react'
import { View, ScrollView, Pressable, useColorScheme } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import type { ContentTab } from '../types'

interface TabBarProps {
  activeTab: ContentTab
  onTabChange: (tab: ContentTab) => void
  insets?: { left: number; right: number }
}

const TABS: { id: ContentTab; label: string; icon: string }[] = [
  { id: 'content', label: 'Bài học', icon: 'book-outline' },
]

export function TabBar({ activeTab, onTabChange, insets }: TabBarProps) {
  const isDark = useColorScheme() === 'dark'

  return (
    <View className={`border-b ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-100'}`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingHorizontal: Math.max(insets?.left ?? 0, insets?.right ?? 0, 12)
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onTabChange(tab.id)
              }}
              className={`px-6 py-4 items-center min-w-[100px] border-b-2 ${
                isActive ? 'border-emerald-500' : 'border-transparent'
              }`}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={isActive ? '#10B981' : isDark ? '#52525B' : '#71717A'}
              />
              <Text
                className={`text-[13px] font-bold mt-1.5 text-center ${
                  isActive ? 'text-emerald-500' : isDark ? 'text-zinc-500' : 'text-zinc-500'
                }`}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
