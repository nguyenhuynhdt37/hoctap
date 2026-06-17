/**
 * Comment Form Component
 * Input form cho việc tạo comment/reply
 */

import React, { useState } from 'react'
import { View, TextInput, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'

interface CommentFormProps {
  onSubmit: (content: string) => void
  onCancel?: () => void
  isDark: boolean
  placeholder?: string
  autoFocus?: boolean
  showCancel?: boolean
}

export function CommentForm({
  onSubmit,
  onCancel,
  isDark,
  placeholder = 'Viết bình luận...',
  autoFocus = false,
  showCancel = false,
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = () => {
    if (!content.trim()) return
    onSubmit(content.trim())
    setContent('')
    setIsFocused(false)
  }

  const canSubmit = content.trim().length > 0

  return (
    <View className={`px-5 py-3 border-b ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
      <View className={`flex-row items-end gap-3 p-3 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#52525B' : '#9CA3AF'}
          multiline
          maxLength={1000}
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => !content && setIsFocused(false)}
          className={`flex-1 text-sm max-h-24 py-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
        />
        <View className="flex-row items-center gap-2">
          {showCancel && onCancel && (
            <Pressable
              onPress={onCancel}
              className={`px-3 py-2 rounded-lg ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}
            >
              <Text className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}>
                Hủy
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`w-10 h-10 rounded-full items-center justify-center ${canSubmit ? 'bg-emerald-500' : isDark ? 'bg-zinc-700' : 'bg-gray-200'
              }`}
          >
            <Feather
              name="send"
              size={18}
              color={canSubmit ? '#FFFFFF' : isDark ? '#52525B' : '#9CA3AF'}
            />
          </Pressable>
        </View>
      </View>
      {content.length > 800 && (
        <Text className={`text-[10px] text-right mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          {content.length}/1000
        </Text>
      )}
    </View>
  )
}
