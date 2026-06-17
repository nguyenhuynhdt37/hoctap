/**
 * Chat Chips Component
 * Quick action chips cho chat
 */

import React from 'react'
import { View, ScrollView, Pressable } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'

interface ChatChipsProps {
  onChipPress: (label: string) => void
  isDark: boolean
}

const CHIPS = [
  { id: '1', label: 'Giải thích', icon: 'bulb-outline' as const },
  { id: '2', label: 'Ví dụ', icon: 'code-slash-outline' as const },
  { id: '3', label: 'Gợi ý', icon: 'help-circle-outline' as const },
  { id: '4', label: 'Tóm tắt', icon: 'document-text-outline' as const },
]

export function ChatChips({ onChipPress, isDark }: ChatChipsProps) {
  return (
    <View className="flex-row gap-2 py-1">
      {CHIPS.map(chip => (
        <Pressable
          key={chip.id}
          onPress={() => onChipPress(`${chip.label} về bài học này`)}
          className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}
        >
          <Ionicons
            name={chip.icon}
            size={14}
            color={isDark ? '#A1A1AA' : '#71717A'}
          />
          <Text className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
