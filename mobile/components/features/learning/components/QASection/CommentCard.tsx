/**
 * Comment Card Component
 * Hiển thị một comment với replies
 */

import React, { useState, useCallback } from 'react'
import { View, Pressable, Alert, Linking, Image } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
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
  highlightedCommentId?: string
}

export function CommentCard({
  comment,
  allComments,
  onToggleReaction,
  onStartReply,
  isDark,
  isReply = false,
  highlightedCommentId,
}: CommentCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const highlighted = highlightedCommentId && comment.id === highlightedCommentId

  // Get replies
  const replies = allComments.filter(c => c.parent_id === comment.id)

  // Render avatar
  const renderAvatar = (avatarUrl: string | null, name: string, size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-7 h-7' : 'w-10 h-10'
    const fontSize = size === 'sm' ? 'text-xs' : 'text-sm'

    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          className={`${sizeClass} rounded-full`}
        />
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

  // Handle clicking on a mention/link
  const handleLinkPress = useCallback((url: string, linkText: string) => {
    if (url.startsWith('/users/') || url.startsWith('/user/')) {
      const userId = url.split('/').pop()
      if (userId) {
        router.push({
          pathname: '/(app)/profile/[id]',
          params: { id: userId }
        })
      }
    } else {
      if (url.startsWith('http')) {
        Linking.openURL(url).catch(() => {
          Alert.alert('Lỗi', `Không thể mở liên kết: ${url}`)
        })
      }
    }
  }, [])

  // Parse markdown links/mentions and render as styled clickable Text components
  const renderCommentContent = useCallback((contentStr: string) => {
    if (!contentStr) return null

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const parts = contentStr.split(linkRegex)

    if (parts.length === 1) {
      return <Text>{contentStr}</Text>
    }

    const elements = []
    for (let i = 0; i < parts.length; i += 3) {
      // Plain text
      if (parts[i]) {
        elements.push(<Text key={`text-${i}`}>{parts[i]}</Text>)
      }

      // Link/Mention
      if (i + 1 < parts.length) {
        const linkText = parts[i + 1]
        const linkUrl = parts[i + 2]

        elements.push(
          <Text
            key={`link-${i}`}
            className="text-emerald-500 font-bold dark:text-emerald-400"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              handleLinkPress(linkUrl, linkText)
            }}
          >
            {linkText}
          </Text>
        )
      }
    }

    return <Text>{elements}</Text>
  }, [handleLinkPress])

  return (
    <View className={isReply ? 'ml-8 mt-2' : ''}>
      <View className={`p-4 rounded-xl border ${
        highlighted
          ? 'border-emerald-500 bg-emerald-500/5'
          : isDark ? 'bg-zinc-800/50 border-zinc-800/50' : 'bg-gray-50 border-gray-100'
      }`}>
        {/* Author info */}
        <View className="flex-row items-center justify-between mb-3">
          <Pressable
            onPress={() => {
              if (comment.user_id) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                router.push({
                  pathname: '/(app)/profile/[id]',
                  params: { id: comment.user_id }
                })
              }
            }}
            className="flex-row items-center gap-3 active:opacity-75"
          >
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
          </Pressable>
        </View>

        {/* Content */}
        <Text className={`text-sm leading-relaxed mb-3 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
          {renderCommentContent(comment.content)}
        </Text>

        {/* Actions */}
        <View className="flex-row items-center gap-4">
          {/* Reaction */}
          <Pressable
            onPress={() => onToggleReaction(comment.id)}
            className="flex-row items-center gap-1.5"
          >
            <Ionicons
              name={comment.reactions?.has_reacted ? 'heart' : 'heart-outline'}
              size={16}
              color={comment.reactions?.has_reacted ? '#EF4444' : isDark ? '#71717A' : '#9CA3AF'}
            />
            <Text className={`text-xs font-medium ${comment.reactions?.has_reacted ? 'text-red-500' : isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              {(comment.reactions?.total ?? 0) > 0 ? comment.reactions?.total : 'Thích'}
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
              highlightedCommentId={highlightedCommentId}
            />
          ))}
        </View>
      )}
    </View>
  )
}
