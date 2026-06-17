/**
 * Quiz Progress Component
 * Progress bar cho quiz
 */

import React from 'react'
import { View } from 'react-native'
import { Text } from '@/components/ui'

interface QuizProgressProps {
  currentIndex: number
  totalQuestions: number
  correctCount: number
  isDark: boolean
  showResults?: boolean
}

export function QuizProgress({
  currentIndex,
  totalQuestions,
  correctCount,
  isDark,
  showResults = false,
}: QuizProgressProps) {
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0

  return (
    <View className={`px-5 py-4 ${isDark ? 'border-zinc-800' : 'border-gray-100'} border-b`}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Luyện tập
          </Text>
          {showResults && (
            <View className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <Text className="text-xs font-bold text-emerald-600">Hoàn thành</Text>
            </View>
          )}
        </View>
        <View className={`px-3 py-1 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
          <Text className="text-xs font-bold text-emerald-600">
            Câu {currentIndex + 1}/{totalQuestions}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <View
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </View>

      <View className="flex-row items-center justify-between mt-1.5">
        <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
          Đã trả lời đúng: {correctCount}/{totalQuestions}
        </Text>
        {correctCount > 0 && (
          <Text className="text-xs font-bold text-emerald-600">
            {Math.round((correctCount / totalQuestions) * 100)}%
          </Text>
        )}
      </View>
    </View>
  )
}
