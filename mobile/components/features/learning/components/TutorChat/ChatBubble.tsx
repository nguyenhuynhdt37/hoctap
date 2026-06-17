/**
 * Chat Bubble Component
 * Hiển thị một message trong chat
 */

import React from 'react'
import { View } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import type { ChatMessage } from '../../types/chat'
import { formatRelativeTime } from '../../mock-data'

interface ChatBubbleProps {
  message: ChatMessage
  isDark: boolean
}

export function ChatBubble({ message, isDark }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  if (isUser) {
    return (
      <View className="flex-row items-end justify-end gap-2 mb-3">
        {/* Time */}
        <View className="items-end">
          <Text className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            {formatRelativeTime(message.created_at)}
          </Text>
        </View>

        {/* Bubble */}
        <View className="max-w-[75%]">
          <View className="bg-emerald-500 px-4 py-3 rounded-2xl rounded-br-md">
            <Text className="text-white text-sm leading-relaxed">
              {message.content}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  if (isAssistant) {
    return (
      <View className="flex-row items-end gap-2 mb-3">
        {/* Avatar */}
        <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
          <Ionicons name="school" size={16} color="#10B981" />
        </View>

        {/* Bubble */}
        <View className="max-w-[75%]">
          <View className={`px-4 py-3 rounded-2xl rounded-bl-md ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
            {/* Parse markdown-like content */}
            <Text className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              {message.content.split('```').map((part, idx) => {
                if (idx % 2 === 1) {
                  // Code block
                  const lines = part.split('\n')
                  const lang = lines[0]
                  const code = lines.slice(1).join('\n')
                  return (
                    <View key={idx} className={`my-2 p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-gray-800'}`}>
                      {lang && (
                        <Text className="text-emerald-400 text-[10px] font-bold mb-1">{lang}</Text>
                      )}
                      <Text className="text-emerald-400 text-xs font-mono">{code}</Text>
                    </View>
                  )
                }
                // Regular text with bold support
                return part.split('**').map((text, i) => (
                  <Text key={i} className={i % 2 === 1 ? 'font-bold' : ''}>
                    {text}
                  </Text>
                ))
              })}
            </Text>
          </View>
          <Text className={`text-[10px] mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            {formatRelativeTime(message.created_at)}
          </Text>
        </View>
      </View>
    )
  }

  return null
}
