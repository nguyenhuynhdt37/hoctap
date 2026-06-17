/**
 * Notes Tab - Ghi chú
 */

import React from 'react'
import { View, ScrollView, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import type { LessonNote } from '../types'

interface NotesTabProps {
  notes: LessonNote[]
}

export function NotesTab({ notes }: NotesTabProps) {
  return (
    <View className="flex-1">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center justify-between border-b border-zinc-100">
        <Text className="text-base font-bold text-zinc-900">Ghi chú</Text>
        <View className="px-3 py-1.5 rounded-full bg-zinc-100">
          <Text className="text-xs font-medium text-zinc-600">{notes.length} ghi chú</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          {/* Notes */}
          {notes.length === 0 ? (
            <EmptyNotes />
          ) : (
            <View className="gap-3">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function EmptyNotes() {
  return (
    <View className="items-center py-12">
      <View className="w-16 h-16 rounded-full bg-zinc-100 items-center justify-center">
        <Ionicons name="create-outline" size={28} color="#A1A1AA" />
      </View>
      <Text className="text-zinc-600 mt-4 font-medium">Chưa có ghi chú</Text>
      <Text className="text-zinc-400 text-xs mt-1 text-center">
        Thêm ghi chú khi đang xem video{'\n'}để ôn tập sau này
      </Text>
    </View>
  )
}

function NoteCard({ note }: { note: LessonNote }) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <View className="p-4 bg-white rounded-2xl border border-zinc-200">
      {/* Time & Date */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="play-circle" size={14} color="#10B981" />
          <Text className="text-xs font-mono font-medium text-emerald-600 ml-1.5">
            {formatTime(note.time_seconds)}
          </Text>
        </View>
        <Text className="text-xs text-zinc-400">{formatDate(note.created_at)}</Text>
      </View>

      {/* Content */}
      <Text className="text-sm text-zinc-800 leading-relaxed">{note.content}</Text>

      {/* Actions */}
      <View className="flex-row gap-4 mt-4 pt-3 border-t border-zinc-100">
        <Pressable className="flex-row items-center">
          <Ionicons name="pencil-outline" size={16} color="#71717A" />
          <Text className="text-xs text-zinc-500 ml-1.5">Sửa</Text>
        </Pressable>
        <Pressable className="flex-row items-center">
          <Ionicons name="share-outline" size={16} color="#71717A" />
          <Text className="text-xs text-zinc-500 ml-1.5">Chia sẻ</Text>
        </Pressable>
        <Pressable className="flex-row items-center">
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text className="text-xs text-red-500 ml-1.5">Xóa</Text>
        </Pressable>
      </View>
    </View>
  )
}
