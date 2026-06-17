/**
 * Progress Modal Component
 * Hiển thị tiến độ học tập
 */

import React from 'react'
import { View, Modal, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui'

interface ProgressModalProps {
  visible: boolean
  onClose: () => void
  title: string
  completedLessons: number
  totalLessons: number
  totalDuration: number
  isDark: boolean
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h} giờ ${m} phút`
  if (m > 0) return `${m} phút ${s} giây`
  return `${s} giây`
}

export function ProgressModal({
  visible,
  onClose,
  title,
  completedLessons,
  totalLessons,
  totalDuration,
  isDark,
}: ProgressModalProps) {
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose}>
        <View className="flex-1 justify-end">
          <Pressable className={`${isDark ? 'bg-zinc-900' : 'bg-white'} rounded-t-3xl p-6 pb-10`} onPress={() => { }}>
            {/* Handle bar */}
            <View className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />

            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-1">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Tiến độ học tập
                </Text>
                <Text className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`} numberOfLines={1}>
                  {title}
                </Text>
              </View>
              <Pressable onPress={onClose} className="w-10 h-10 rounded-full items-center justify-center bg-gray-100 dark:bg-zinc-800">
                <Feather name="x" size={20} color={isDark ? '#A1A1AA' : '#71717A'} />
              </Pressable>
            </View>

            {/* Content */}
            <View className="flex-row items-center gap-5">
              {/* Circular progress */}
              <View className="items-center">
                <View className="w-32 h-32 relative items-center justify-center">
                  <View className="absolute inset-0 rounded-full border-[10px] border-zinc-200 dark:border-zinc-700" />
                  <View className="absolute top-0 left-1/2 w-3 h-3 bg-emerald-500 rounded-full"
                    style={{ transform: [{ translateX: -6 }, { rotate: `${(percent / 100) * 360 - 90}deg` }, { translateY: -14 }] }}
                  />
                  <Text className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {percent}%
                  </Text>
                </View>
              </View>

              {/* Stats */}
              <View className="flex-1 gap-2">
                <View className={`p-3 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                  <Text className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Hoàn thành</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>{percent}%</Text>
                    <View className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <View className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${percent}%` }} />
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <View className={`flex-1 p-3 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                    <Text className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Bài đã học</Text>
                    <Text className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>{completedLessons}</Text>
                  </View>
                  <View className={`flex-1 p-3 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                    <Text className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Tổng số bài</Text>
                    <Text className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalLessons}</Text>
                  </View>
                </View>

                <View className={`p-3 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}>
                  <Text className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Tổng thời lượng</Text>
                  <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatDuration(totalDuration)}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  )
}
