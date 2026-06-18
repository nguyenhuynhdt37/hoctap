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
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer'

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
            <Text className="text-white text-sm leading-relaxed" selectable={true}>
              {message.content}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  if (isAssistant) {
    return (
      <View className="flex-row items-start gap-2.5 mb-3">
        {/* Avatar */}
        <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
          <Ionicons name="school" size={16} color="#10B981" />
        </View>

        {/* Bubble */}
        <View className="flex-1 max-w-[82%]">
          <View className={`border rounded-2xl rounded-bl-sm p-3 shadow-sm ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-100'
          }`}>
            <MarkdownRenderer
              content={message.content}
              compact
              autoHeight
            />
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
