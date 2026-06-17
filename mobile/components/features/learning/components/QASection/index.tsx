/**
 * QASection Component
 * Comment section với nested replies và reactions thực tế từ API và WebSocket
 */

import React, { useCallback, useEffect, useState } from 'react'
import { View, ScrollView, Pressable, RefreshControl, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import type { QAComment } from '../../types/chat'
import { CommentCard } from './CommentCard'
import { CommentForm } from './CommentForm'
import { useWebSocket } from '@/src/hooks/websocket/useWebSocket'
import { learningService } from '../../services/learning.service'

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface QASectionProps {
  lessonId: string
  isDark: boolean
  initialCommentId?: string
  hideHeader?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function QASection({ lessonId, isDark, initialCommentId, hideHeader }: QASectionProps) {
  const [comments, setComments] = useState<QAComment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showReplyForm, setShowReplyForm] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<QAComment | null>(null)

  // Fetch comments (roots + replies) from API
  const fetchComments = useCallback(async (showIndicator = false) => {
    if (!lessonId) return
    if (showIndicator) setIsLoading(true)
    setError(null)

    try {
      const rootRes = await learningService.getComments(lessonId, { depth: 0, limit: 50 })
      const roots = (rootRes.items || []) as QAComment[]
      setComments(roots)

      // Fetch replies in parallel for roots that have reply_count_all > 0
      const replyPromises = roots.map(async (root) => {
        if (root.reply_count_all > 0) {
          try {
            const [r1Res, r2Res] = await Promise.all([
              learningService.getComments(lessonId, { depth: 1, root_id: root.id, limit: 50 }),
              learningService.getComments(lessonId, { depth: 2, root_id: root.id, limit: 50 }),
            ])
            return [...(r1Res.items || []), ...(r2Res.items || [])] as QAComment[]
          } catch (err) {
            console.error('Error fetching replies:', err)
            return []
          }
        }
        return []
      })

      const repliesArray = await Promise.all(replyPromises)
      const allReplies = repliesArray.flat()

      setComments(prev => {
        const rootsFiltered = prev.filter(c => c.depth === 0)
        return [...rootsFiltered, ...allReplies]
      })
    } catch (err) {
      console.error('Failed to load Q&A comments:', err)
      setError('Không thể tải bình luận')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [lessonId])

  // Trigger initial fetch
  useEffect(() => {
    fetchComments(true)
  }, [fetchComments])

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    fetchComments(false)
  }, [fetchComments])

  // Connect to WebSocket Q&A Room
  const { sendMessage } = useWebSocket({
    endpoint: `/api/v1/learning/ws/comments/${lessonId}`,
    role_name: 'USER',
    onMessage: useCallback((data: any) => {
      if (!data) return

      if (data.error) {
        console.error('WebSocket Q&A error:', data.error)
        return
      }

      const type = data.type

      if (type === 'comment_created' && data.comment) {
        setComments(prev => {
          const newComment = data.comment as QAComment
          if (prev.some(c => c.id === newComment.id)) return prev

          // Tăng count replies của comments cha
          const updated = prev.map(c => {
            if (c.id === newComment.parent_id || c.id === newComment.root_id) {
              return { ...c, reply_count_all: (c.reply_count_all || 0) + 1 }
            }
            return c
          })

          if (newComment.depth === 0) {
            return [newComment, ...updated]
          } else {
            return [...updated, newComment]
          }
        })
      }
      else if (type === 'comment_updated' && data.comment) {
        setComments(prev => prev.map(c =>
          c.id === data.comment.id ? { ...c, content: data.comment.content } : c
        ))
      }
      else if (type === 'comment_deleted' && data.comment) {
        setComments(prev => {
          const deletedId = data.comment.id
          const commentToDelete = prev.find(c => c.id === deletedId)
          let updated = prev.filter(c => c.id !== deletedId)

          if (commentToDelete && commentToDelete.parent_id) {
            updated = updated.map(c => {
              if (c.id === commentToDelete.parent_id || c.id === commentToDelete.root_id) {
                return { ...c, reply_count_all: Math.max((c.reply_count_all || 0) - 1, 0) }
              }
              return c
            })
          }
          return updated
        })
      }
      else if (type === 'comment_hidden' && data.comment) {
        setComments(prev => prev.map(c =>
          c.id === data.comment.id ? { ...c, content: data.comment.content || '[Bình luận đã bị ẩn]' } : c
        ))
      }
      else if ((type === 'comment_reacted' || type === 'comment_unreacted') && data.comment_id) {
        setComments(prev => prev.map(c => {
          if (c.id === data.comment_id) {
            return {
              ...c,
              reactions: {
                total: data.reactions?.total ?? c.reactions.total,
                has_reacted: data.reactions?.has_reacted ?? c.reactions.has_reacted,
              }
            }
          }
          return c
        }))
      }
    }, []),
  })

  // Submit new comment
  const handleSubmitComment = useCallback((content: string) => {
    if (!content.trim()) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    sendMessage({
      type: 'create',
      create: { content: content.trim() }
    })
  }, [sendMessage])

  // Submit reply
  const handleSubmitReply = useCallback((parentId: string, rootId: string | null, content: string) => {
    if (!content.trim()) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    sendMessage({
      type: 'create',
      create: {
        content: content.trim(),
        parent_id: parentId
      }
    })
    setShowReplyForm(null)
    setReplyingTo(null)
  }, [sendMessage])

  // Toggle reaction
  const handleToggleReaction = useCallback(async (commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const res = await learningService.toggleReaction(commentId)
      // Update local state directly
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            reactions: {
              total: res.reactions.total,
              has_reacted: res.reactions.has_reacted
            }
          }
        }
        return c
      }))
    } catch (err) {
      console.error('Error toggling reaction:', err)
    }
  }, [])

  // Start reply
  const handleStartReply = useCallback((comment: QAComment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setReplyingTo(comment)
    setShowReplyForm(comment.id)
  }, [])

  // Build comment tree
  const rootComments = comments.filter(c => c.depth === 0)

  return (
    <View className="flex-1">
      {!hideHeader && (
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
                  {comments.length} bình luận
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Comment Form */}
      <CommentForm
        onSubmit={handleSubmitComment}
        isDark={isDark}
        placeholder="Đặt câu hỏi hoặc chia sẻ thảo luận..."
      />

      {/* Comments List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
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
          {error && (
            <View className="p-4 bg-red-500/10 m-5 rounded-xl">
              <Text className="text-sm text-red-500 text-center">{error}</Text>
            </View>
          )}

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
                  highlightedCommentId={initialCommentId}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Reply Form Modal */}
      <Modal
        visible={!!showReplyForm && !!replyingTo}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowReplyForm(null)
          setReplyingTo(null)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Backdrop */}
          <Pressable
            onPress={() => {
              setShowReplyForm(null)
              setReplyingTo(null)
            }}
            className="flex-1 bg-black/40"
          />

          {/* Form Content */}
          {replyingTo && (
            <View className={`p-4 border-t ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
