/**
 * Test Runner Component
 * Header hiển thị trạng thái test
 */

import React from 'react'
import { View, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui'

interface TestRunnerProps {
  isRunning: boolean
  onRun: () => void
  isDark: boolean
  passPercent?: number
}

export function TestRunner({ isRunning, onRun, isDark, passPercent = 0 }: TestRunnerProps) {
  return (
    <View className={`px-4 py-3 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'} border-b ${isDark ? 'border-zinc-700' : 'border-gray-200'}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-2">
            <View className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-500 animate-pulse' : 'bg-zinc-500'}`} />
            <Text className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
              {isRunning ? 'Đang chạy...' : 'Test runner'}
            </Text>
          </View>
          {passPercent > 0 && (
            <View className="flex-row items-center gap-1">
              <Feather
                name={passPercent === 100 ? 'check-circle' : 'alert-circle'}
                size={14}
                color={passPercent === 100 ? '#10B981' : '#F59E0B'}
              />
              <Text className={`text-xs font-bold ${passPercent === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {passPercent}%
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={onRun}
          disabled={isRunning}
          className={`px-4 py-1.5 rounded-lg flex-row items-center gap-2 ${isRunning ? 'bg-emerald-500/50' : 'bg-emerald-500'
            }`}
        >
          <Feather name="play" size={14} color="#FFFFFF" />
          <Text className="text-white text-xs font-bold">
            {isRunning ? 'Đang chạy' : 'Chạy'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
