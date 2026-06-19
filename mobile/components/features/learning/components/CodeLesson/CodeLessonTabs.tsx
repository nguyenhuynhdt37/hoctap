import React from 'react'
import { Pressable, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'

export type CodeLessonPanel = 'problem' | 'code' | 'testcases' | 'results'

const TABS: { id: CodeLessonPanel; label: string }[] = [
  { id: 'problem', label: 'Đề bài' },
  { id: 'code', label: 'Code' },
  { id: 'testcases', label: 'Test Cases' },
  { id: 'results', label: 'Kết quả' },
]

interface CodeLessonTabsProps {
  activePanel: CodeLessonPanel
  onChange: (panel: CodeLessonPanel) => void
  isDark: boolean
}

export function CodeLessonTabs({ activePanel, onChange, isDark }: CodeLessonTabsProps) {
  return (
    <View className={`rounded-2xl p-1 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
      <View className="flex-row">
        {TABS.map(tab => {
          const active = activePanel === tab.id
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onChange(tab.id)
              }}
              className={`flex-1 items-center justify-center rounded-xl px-2 py-2.5 ${
                active ? 'bg-emerald-500' : 'bg-transparent'
              }`}
            >
              <Text
                numberOfLines={1}
                className={`text-[11px] font-bold ${
                  active ? 'text-white' : isDark ? 'text-zinc-300' : 'text-zinc-600'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
