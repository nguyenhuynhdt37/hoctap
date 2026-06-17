/**
 * Chat Input Component
 * Input field cho chat
 */

import React from 'react'
import { View, TextInput, Pressable, TextInputProps } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui'

interface ChatInputProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  isDark: boolean
  inputRef?: React.RefObject<TextInput>
}

export function ChatInput({ value, onChangeText, onSend, isDark, inputRef }: ChatInputProps) {
  const canSend = value.trim().length > 0

  return (
    <View className={`px-4 py-3 ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
      <View className={`flex-row items-end gap-3 px-4 py-2 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="Hỏi gia sư..."
          placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
          multiline
          maxLength={500}
          className={`flex-1 text-sm max-h-24 py-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
          style={{
            minHeight: 24,
          }}
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          className={`w-10 h-10 rounded-full items-center justify-center ${canSend ? 'bg-emerald-500' : isDark ? 'bg-zinc-700' : 'bg-gray-200'
            }`}
        >
          <Feather
            name="send"
            size={18}
            color={canSend ? '#FFFFFF' : isDark ? '#52525B' : '#9CA3AF'}
          />
        </Pressable>
      </View>
      {value.length > 400 && (
        <Text className={`text-[10px] text-right mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          {value.length}/500
        </Text>
      )}
    </View>
  )
}
