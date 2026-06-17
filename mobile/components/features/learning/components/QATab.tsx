import React, { useState } from 'react'
import { View, ScrollView, Pressable, useColorScheme, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Text } from '@/components/ui'
import { learningService } from '../services/learning.service'
import type { Comment } from '../types'

interface QATabProps {
  lessonId: string
}

export function QATab({ lessonId }: QATabProps) {
  const isDark = useColorScheme() === 'dark'
  const queryClient = useQueryClient()
  
  // Fetch Comments
  const { data: commentsResponse, isLoading } = useQuery({
    queryKey: ['learning', 'comments', lessonId],
    queryFn: () => learningService.getComments(lessonId),
    enabled: !!lessonId,
  })

  const comments = commentsResponse?.items ?? []

  // Toggle Reaction Mutation
  const reactionMutation = useMutation({
    mutationFn: (commentId: string) => learningService.toggleReaction(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'comments', lessonId] })
    },
  })

  return (
    <View className="flex-1">
      {/* Header */}
      <View className={`px-5 py-4 flex-row items-center justify-between border-b ${
        isDark ? 'border-zinc-800' : 'border-zinc-100'
      }`}>
        <Text className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Hỏi & Đáp</Text>
        <View className={`px-3 py-1.5 rounded-full ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
          <Text className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {comments.length} câu hỏi
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          {/* Ask Button */}
          <Pressable className={`flex-row items-center p-4 rounded-2xl border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          } mb-5`}>
            <View className={`w-10 h-10 rounded-full items-center justify-center ${
              isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
            }`}>
              <Ionicons name="add" size={20} color="#10B981" />
            </View>
            <View className="flex-1 ml-3">
              <Text className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>Đặt câu hỏi</Text>
              <Text className="text-xs text-zinc-500 mt-0.5">Hỏi về nội dung bài học</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#52525B' : '#71717A'} />
          </Pressable>

          {/* Comments */}
          {isLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator color="#10B981" />
            </View>
          ) : comments.length === 0 ? (
            <EmptyQA isDark={isDark} />
          ) : (
            <View className="gap-4">
              {comments.map((comment) => (
                <CommentCard 
                  key={comment.id} 
                  comment={comment} 
                  isDark={isDark} 
                  onToggleReaction={() => reactionMutation.mutate(comment.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function EmptyQA({ isDark }: { isDark: boolean }) {
  return (
    <View className="items-center py-12">
      <View className={`w-16 h-16 rounded-full items-center justify-center ${
        isDark ? 'bg-zinc-900' : 'bg-zinc-100'
      }`}>
        <Ionicons name="chatbubbles-outline" size={28} color={isDark ? '#52525B' : '#A1A1AA'} />
      </View>
      <Text className={`mt-4 font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Chưa có câu hỏi nào</Text>
      <Text className="text-zinc-500 text-xs mt-1 text-center">
        Hãy là người đầu tiên đặt câu hỏi cho bài học này
      </Text>
    </View>
  )
}

function CommentCard({ 
  comment, 
  isDark, 
  onToggleReaction 
}: { 
  comment: Comment; 
  isDark: boolean; 
  onToggleReaction?: () => void 
}) {
  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}p`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
  }

  const avatarText = comment.user_name
    ? comment.user_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <View className={`p-4 rounded-2xl border ${
      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      <View className="flex-row items-start">
        {/* Avatar */}
        <View className="w-9 h-9 rounded-full bg-emerald-500 items-center justify-center">
          <Text className="text-xs font-bold text-white">{avatarText}</Text>
        </View>

        <View className="flex-1 ml-3">
          {/* Name & Time */}
          <View className="flex-row items-center gap-2">
            <Text className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {comment.user_name || 'Người dùng'}
            </Text>
            {comment.is_author && (
              <View className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                <Text className={`text-[10px] font-semibold ${isDark ? 'text-amber-500' : 'text-amber-700'}`}>Tác giả</Text>
              </View>
            )}
            <Text className="text-xs text-zinc-500">{formatTime(comment.created_at)}</Text>
          </View>

          {/* Content */}
          <Text className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
            {comment.content}
          </Text>

          {/* Actions */}
          <View className="flex-row items-center gap-4 mt-3">
            <Pressable onPress={onToggleReaction} className="flex-row items-center">
              <Ionicons
                name={comment.reactions?.has_reacted ? 'heart' : 'heart-outline'}
                size={16}
                color={comment.reactions?.has_reacted ? '#EF4444' : '#71717A'}
              />
              <Text className="text-xs text-zinc-500 ml-1">{comment.reactions?.total ?? 0}</Text>
            </Pressable>
            <Pressable className="flex-row items-center">
              <Ionicons name="chatbubble-outline" size={16} color={isDark ? '#52525B' : '#71717A'} />
              <Text className="text-xs text-zinc-500 ml-1">{comment.reply_count_all ?? 0}</Text>
            </Pressable>
            <Pressable className="flex-row items-center">
              <Ionicons name="flag-outline" size={16} color={isDark ? '#52525B' : '#71717A'} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}
