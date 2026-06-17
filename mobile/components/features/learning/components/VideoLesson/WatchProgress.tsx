/**
 * Video Controls Component
 * Progress bar với thời gian cho video player
 */

import React from 'react'
import { View, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui'

interface WatchProgressProps {
  currentTime: number
  duration: number
  watchTime: number
  requiredWatchTime: number
  isFastForwarding: boolean
  isDark: boolean
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function WatchProgress({
  currentTime,
  duration,
  watchTime,
  requiredWatchTime,
  isFastForwarding,
  isDark,
}: WatchProgressProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const watchPercent = requiredWatchTime > 0 ? Math.min((watchTime / requiredWatchTime) * 100, 100) : 0
  const isComplete = watchTime >= requiredWatchTime

  return (
    <View className="w-full">
      {/* Watch progress label */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-white/80 text-xs font-medium">
            {formatTime(currentTime)}
          </Text>
          {isFastForwarding && (
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded bg-red-500/80">
              <Feather name="alert-circle" size={10} color="#FFFFFF" />
              <Text className="text-white text-[10px] font-bold">Tua nhanh - không được tính</Text>
            </View>
          )}
        </View>
        <Text className="text-white/80 text-xs font-medium">
          {formatTime(duration)}
        </Text>
      </View>

      {/* Progress bars */}
      <View className="gap-1.5">
        {/* Watch time bar (shows how much of required time watched) */}
        <View className="h-2 rounded-full bg-white/30 overflow-hidden">
          <View
            className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-blue-400'}`}
            style={{ width: `${watchPercent}%` }}
          />
        </View>

        {/* Current position bar */}
        <View className="h-1 rounded-full bg-white/20 overflow-hidden">
          <View
            className="h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

      {/* Status */}
      <View className="flex-row items-center justify-between mt-1.5">
        <View className="flex-row items-center gap-2">
          {isComplete ? (
            <View className="flex-row items-center gap-1">
              <Feather name="check-circle" size={12} color="#10B981" />
              <Text className="text-emerald-400 text-[10px] font-semibold">
                Đã xem đủ ({Math.round(watchPercent)}%)
              </Text>
            </View>
          ) : (
            <Text className="text-white/60 text-[10px]">
              Cần xem thêm {Math.ceil((requiredWatchTime - watchTime) / 60)} phút để hoàn thành
            </Text>
          )}
        </View>
        <Text className="text-white/60 text-[10px]">
          {formatTime(watchTime)} / {formatTime(requiredWatchTime)}
        </Text>
      </View>
    </View>
  )
}
