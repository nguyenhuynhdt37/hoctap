/**
 * QASection Component
 * Comment section với nested replies và reactions
 */

import React, { useCallback, useState } from 'react'
import { View, ScrollView, Pressable, TextInput, RefreshControl } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import type { QAComment } from '../../types/chat'
import { CommentCard } from './CommentCard'
import { CommentForm } from './CommentForm'
import { mockComments, formatRelativeTime } from '../../mock-data'

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface QASectionProps {
  lessonId: string
  isDark: boolean
  isModal?: boolean
  onClose?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function QASection({ lessonId, isDark, isModal, onClose }: QASectionProps) {
  const [comments, setComments] = useState<QAComment[]>(mockComments as QAComment[])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<QAComment | null>(null)

  // Refresh comments
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }, [])

  // Submit new comment
  const handleSubmitComment = useCallback((content: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const newComment: QAComment = {
      id: `cmt-${Date.now()}`,
      lesson_id: lessonId,
      root_id: null,
      parent_id: null,
      user_id: 'current-user',
      user_name: 'Bạn',
      user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=current',
      content,
      depth: 0,
      is_owner: true,
      is_author: false,
      reply_count_all: 0,
      created_at: new Date().toISOString(),
      reactions: { total: 0, has_reacted: false },
    }
    setComments(prev => [newComment, ...prev])
  }, [lessonId])

  // Submit reply
  const handleSubmitReply = useCallback((parentId: string, rootId: string | null, content: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const parentComment = comments.find(c => c.id === parentId)
    const newReply: QAComment = {
      id: `cmt-${Date.now()}`,
      lesson_id: lessonId,
      root_id: rootId || parentId,
      parent_id: parentId,
      user_id: 'current-user',
      user_name: 'Bạn',
      user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=current',
      content,
      depth: (parentComment?.depth ?? 0) + 1,
      is_owner: true,
      is_author: false,
      reply_count_all: 0,
      created_at: new Date().toISOString(),
      reactions: { total: 0, has_reacted: false },
    }
    setComments(prev => [...prev, newReply])
    setShowReplyForm(null)
    setReplyingTo(null)
  }, [comments, lessonId])

  // Toggle reaction
  const handleToggleReaction = useCallback((commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const hasReacted = c.reactions.has_reacted
        return {
          ...c,
          reactions: {
            total: hasReacted ? c.reactions.total - 1 : c.reactions.total + 1,
            has_reacted: !hasReacted,
          },
        }
      }
      return c
    }))
  }, [])

  // Start reply
  const handleStartReply = useCallback((comment: QAComment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setReplyingTo(comment)
    setShowReplyForm(comment.id)
  }, [])

  // Build comment tree
  const rootComments = comments.filter(c => c.root_id === null)

  return (
    <View className="flex-1">
      {/* Header */}
      <View className={`px-5 py-4 border-b ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
              <Ionicons name="chatbubbles" size={20} color={isDark ? '#A1A1AA' : '#71717A'} />
            </View>
            <View>
              <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Hỏi & Đáp
              </Text>
              <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                {comments.length} câu hỏi
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Comment Form */}
      <CommentForm
        onSubmit={handleSubmitComment}
        isDark={isDark}
        placeholder="Đặt câu hỏi hoặc chia sẻ thảo luận..."
      />

      {/* Comments List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#10B981"
          />
        }
      >
        {rootComments.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16 px-8">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
              <Feather name="message-circle" size={32} color={isDark ? '#52525B' : '#9CA3AF'} />
            </View>
            <Text className={`text-base font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Chưa có câu hỏi nào
            </Text>
            <Text className={`text-sm text-center ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              Hãy đặt câu hỏi hoặc chia sẻ thảo luận về bài học này
            </Text>
          </View>
        ) : (
          <View className="px-5 py-4 gap-4">
            {rootComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                allComments={comments}
                onToggleReaction={handleToggleReaction}
                onStartReply={handleStartReply}
                isDark={isDark}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Reply Form Modal */}
      {showReplyForm && replyingTo && (
        <View className={`absolute bottom-0 left-0 right-0 p-4 ${isDark ? 'bg-zinc-900 border-t border-zinc-800' : 'bg-white border-t border-gray-100'}`}>
          <View className="flex-row items-center justify-between mb-2">
            <Text className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
              Trả lời @{replyingTo.user_name}
            </Text>
            <Pressable onPress={() => { setShowReplyForm(null); setReplyingTo(null) }}>
              <Feather name="x" size={20} color={isDark ? '#71717A' : '#9CA3AF'} />
            </Pressable>
          </View>
          <CommentForm
            onSubmit={(content) => handleSubmitReply(replyingTo.id, replyingTo.root_id, content)}
            onCancel={() => { setShowReplyForm(null); setReplyingTo(null) }}
            isDark={isDark}
            placeholder={`Trả lời ${replyingTo.user_name}...`}
            autoFocus
            showCancel
          />
        </View>
      )}
    </View>
  )
}
