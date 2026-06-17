import React, { useCallback, useState } from 'react'
import { View, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Text } from '@/components/ui'
import { learningService } from '../../services/learning.service'
import type { LessonNote } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface NotesSectionProps {
  lessonId: string
  isDark: boolean
  currentVideoTime?: number
  onSeekToTime?: (timeSeconds: number) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function NotesSection({
  lessonId,
  isDark,
  currentVideoTime = 0,
  onSeekToTime,
}: NotesSectionProps) {
  const queryClient = useQueryClient()
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')

  // Fetch Notes
  const { data: notes = [], isLoading, refetch } = useQuery({
    queryKey: ['learning', 'notes', lessonId],
    queryFn: () => learningService.getNotes(lessonId),
    enabled: !!lessonId,
  })

  // Create Note Mutation
  const createMutation = useMutation({
    mutationFn: (content: string) => 
      learningService.createNote(lessonId, { 
        content, 
        time_seconds: Math.floor(currentVideoTime) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'notes', lessonId] })
      setNewNoteContent('')
      setIsAddingNote(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
  })

  // Update Note Mutation
  const updateMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) => 
      learningService.updateNote(noteId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'notes', lessonId] })
      setEditingNoteId(null)
      setEditingContent('')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    },
  })

  // Delete Note Mutation
  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => learningService.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'notes', lessonId] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
  })

  // Format timestamp
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays < 7) return `${diffDays} ngày trước`
    return date.toLocaleDateString('vi-VN')
  }

  // Add new note
  const handleAddNote = useCallback(() => {
    if (!newNoteContent.trim() || createMutation.isPending) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    createMutation.mutate(newNoteContent.trim())
  }, [newNoteContent, createMutation])

  // Delete note
  const handleDeleteNote = useCallback((noteId: string) => {
    Alert.alert(
      'Xóa ghi chú',
      'Bạn có chắc muốn xóa ghi chú này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            deleteMutation.mutate(noteId)
          },
        },
      ]
    )
  }, [deleteMutation])

  // Start editing
  const handleStartEdit = useCallback((note: LessonNote) => {
    setEditingNoteId(note.id)
    setEditingContent(note.content)
  }, [])

  // Save edit
  const handleSaveEdit = useCallback((noteId: string) => {
    if (!editingContent.trim() || updateMutation.isPending) return
    updateMutation.mutate({ noteId, content: editingContent.trim() })
  }, [editingContent, updateMutation])

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null)
    setEditingContent('')
  }, [])

  // Seek to time
  const handleSeekToTime = useCallback((timeSeconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onSeekToTime?.(timeSeconds)
  }, [onSeekToTime])

  // Quick add at current time
  const handleQuickAdd = useCallback(() => {
    setIsAddingNote(true)
    setNewNoteContent('')
  }, [])

  return (
    <View className="flex-1">
      {/* Header */}
      <View className={`px-5 py-4 border-b ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
              <Ionicons name="create-outline" size={20} color={isDark ? '#A1A1AA' : '#71717A'} />
            </View>
            <View>
              <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Ghi chú
              </Text>
              <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                {notes.length} ghi chú • {formatTimestamp(currentVideoTime)}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleQuickAdd}
            className="px-4 py-2 rounded-full bg-emerald-500"
          >
            <Text className="text-white text-sm font-bold">+ Thêm</Text>
          </Pressable>
        </View>
      </View>

      {/* Add Note Form */}
      {isAddingNote && (
        <View className={`px-5 py-4 border-b ${isDark ? 'bg-zinc-800 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <View className="px-2 py-1 rounded bg-emerald-500/10">
                <Text className="text-xs font-bold text-emerald-600">
                  @ {formatTimestamp(currentVideoTime)}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setIsAddingNote(false)}>
              <Feather name="x" size={20} color={isDark ? '#71717A' : '#9CA3AF'} />
            </Pressable>
          </View>
          <TextInput
            value={newNoteContent}
            onChangeText={setNewNoteContent}
            placeholder="Viết ghi chú của bạn..."
            placeholderTextColor={isDark ? '#52525B' : '#9CA3AF'}
            multiline
            autoFocus
            className={`text-sm p-3 rounded-xl min-h-[80px] ${isDark ? 'bg-zinc-700 text-white' : 'bg-white text-gray-900'}`}
          />
          <View className="flex-row items-center justify-end gap-2 mt-3">
            <Pressable
              onPress={() => setIsAddingNote(false)}
              className={`px-4 py-2 rounded-lg ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}
            >
              <Text className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}>
                Hủy
              </Text>
            </Pressable>
            <Pressable
              onPress={handleAddNote}
              disabled={!newNoteContent.trim()}
              className={`px-4 py-2 rounded-lg ${newNoteContent.trim() ? 'bg-emerald-500' : isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}
            >
              <Text className={`text-sm font-bold ${newNoteContent.trim() ? 'text-white' : isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                Lưu
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Notes List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator color="#10B981" />
            <Text className={`mt-4 text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              Đang tải ghi chú...
            </Text>
          </View>
        ) : notes.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16 px-8">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
              <Feather name="edit-3" size={32} color={isDark ? '#52525B' : '#9CA3AF'} />
            </View>
            <Text className={`text-base font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Chưa có ghi chú nào
            </Text>
            <Text className={`text-sm text-center ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              Tạo ghi chú để đánh dấu những điểm quan trọng trong bài học
            </Text>
          </View>
        ) : (
          <View className="p-5 gap-4">
            {notes.map(note => (
              <View
                key={note.id}
                className={`p-5 rounded-2xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-white border border-gray-100'}`}
              >
                {/* Timestamp Header */}
                <View className="flex-row items-center justify-between mb-4">
                  <Pressable
                    onPress={() => handleSeekToTime(note.time_seconds)}
                    className="flex-row items-center bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20"
                  >
                    <Ionicons name="play-circle" size={18} color="#10B981" />
                    <Text className="text-sm font-bold text-emerald-600 ml-2">
                      @ {formatTimestamp(note.time_seconds)}
                    </Text>
                  </Pressable>
                  
                  <View className="flex-row items-center gap-4">
                    <Pressable 
                      onPress={() => handleStartEdit(note)}
                      className={`w-9 h-9 rounded-full items-center justify-center ${isDark ? 'bg-zinc-700' : 'bg-gray-100'}`}
                    >
                      <Feather name="edit-2" size={16} color={isDark ? '#A1A1AA' : '#71717A'} />
                    </Pressable>
                    <Pressable 
                      onPress={() => handleDeleteNote(note.id)}
                      disabled={deleteMutation.isPending}
                      className={`w-9 h-9 rounded-full items-center justify-center ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>

                {/* Content */}
                {editingNoteId === note.id ? (
                  <View>
                    <TextInput
                      value={editingContent}
                      onChangeText={setEditingContent}
                      multiline
                      autoFocus
                      className={`text-base p-4 rounded-xl min-h-[100px] leading-relaxed ${isDark ? 'bg-zinc-700 text-white' : 'bg-gray-50 text-gray-900 border border-gray-200'}`}
                    />
                    <View className="flex-row items-center justify-end gap-3 mt-4">
                      <Pressable 
                        onPress={handleCancelEdit} 
                        disabled={updateMutation.isPending}
                        className={`px-5 py-2.5 rounded-xl ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}
                      >
                        <Text className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}>Hủy</Text>
                      </Pressable>
                      <Pressable 
                        onPress={() => handleSaveEdit(note.id)} 
                        disabled={updateMutation.isPending}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500"
                      >
                        {updateMutation.isPending ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className="text-sm font-bold text-white">Lưu thay đổi</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text className={`text-[15px] leading-relaxed ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
                      {note.content}
                    </Text>

                    {/* Footer */}
                    <View className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-700/50">
                      <View className="flex-row items-center gap-2">
                        <Feather name="clock" size={12} color={isDark ? '#52525B' : '#9CA3AF'} />
                        <Text className={`text-[11px] font-medium ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                          {formatRelativeTime(note.updated_at || note.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
