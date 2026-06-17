/**
 * Comment Card Component
 * Hiển thị một comment với replies
 */

import React, { useState } from 'react'
import { View, Pressable } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import type { QAComment } from '../../types/chat'
import { formatRelativeTime } from '../../mock-data'

interface CommentCardProps {
  comment: QAComment
  allComments: QAComment[]
  onToggleReaction: (commentId: string) => void
  onStartReply: (comment: QAComment) => void
  isDark: boolean
  isReply?: boolean
}

export function CommentCard({
  comment,
  allComments,
  onToggleReaction,
  onStartReply,
  isDark,
  isReply = false,
}: CommentCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Get replies
  const replies = allComments.filter(c => c.parent_id === comment.id)

  // Render avatar
  const renderAvatar = (avatarUrl: string | null, name: string, size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-7 h-7' : 'w-10 h-10'
    const fontSize = size === 'sm' ? 'text-xs' : 'text-sm'

    if (avatarUrl) {
      return (
        <View className={`${sizeClass} rounded-full bg-zinc-200 overflow-hidden items-center justify-center`}>
          <Text className={`${fontSize} font-bold ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )
    }

    return (
      <View className={`${sizeClass} rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 items-center justify-center`}>
        <Text className={`${fontSize} font-bold text-white`}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
    )
  }

  return (
    <View className={isReply ? 'ml-8 mt-2' : ''}>
      <View className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}`}>
        {/* Author info */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3">
            {renderAvatar(comment.user_avatar, comment.user_name)}
            <View>
              <View className="flex-row items-center gap-2">
                <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {comment.user_name}
                </Text>
                {comment.is_author && (
                  <View className="px-1.5 py-0.5 rounded bg-emerald-500/10">
                    <Text className="text-[10px] font-bold text-emerald-600">GV</Text>
                  </View>
                )}
                {comment.is_owner && (
                  <View className="px-1.5 py-0.5 rounded bg-blue-500/10">
                    <Text className="text-[10px] font-bold text-blue-600">Bạn</Text>
                  </View>
                )}
              </View>
              <Text className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                {formatRelativeTime(comment.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <Text className={`text-sm leading-relaxed mb-3 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
          {comment.content}
        </Text>

        {/* Actions */}
        <View className="flex-row items-center gap-4">
          {/* Reaction */}
          <Pressable
            onPress={() => onToggleReaction(comment.id)}
            className="flex-row items-center gap-1.5"
          >
            <Ionicons
              name={comment.reactions.has_reacted ? 'heart' : 'heart-outline'}
              size={16}
              color={comment.reactions.has_reacted ? '#EF4444' : isDark ? '#71717A' : '#9CA3AF'}
            />
            <Text className={`text-xs font-medium ${comment.reactions.has_reacted ? 'text-red-500' : isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              {comment.reactions.total > 0 ? comment.reactions.total : 'Thích'}
            </Text>
          </Pressable>

          {/* Reply */}
          <Pressable
            onPress={() => onStartReply(comment)}
            className="flex-row items-center gap-1.5"
          >
            <Ionicons name="chatbubble-outline" size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
            <Text className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              Trả lời
            </Text>
          </Pressable>

          {/* Show/hide replies */}
          {replies.length > 0 && (
            <Pressable
              onPress={() => setIsExpanded(!isExpanded)}
              className="flex-row items-center gap-1"
            >
              <View className={`w-px h-4 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={isDark ? '#71717A' : '#9CA3AF'}
              />
              <Text className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                {isExpanded ? 'Ẩn' : 'Xem'} {replies.length} câu trả lời
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Replies */}
      {isExpanded && replies.length > 0 && (
        <View className="mt-2">
          {replies.map(reply => (
            <CommentCard
              key={reply.id}
              comment={reply}
              allComments={allComments}
              onToggleReaction={onToggleReaction}
              onStartReply={onStartReply}
              isDark={isDark}
              isReply
            />
          ))}
        </View>
      )}
    </View>
  )
}
