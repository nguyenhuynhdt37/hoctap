import React from 'react'
import { View } from 'react-native'
import { Text } from '@/components/ui'
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer'
import type { CodeExercise } from '../../types/code-lesson'

interface CodeProblemPanelProps {
  exercise: CodeExercise
  isDark: boolean
  formatLimitMs: (value?: number) => string
  formatMemory: (value?: number) => string
  difficultyLabel: (value?: string) => string
}

export function CodeProblemPanel({
  exercise,
  isDark,
  formatLimitMs,
  formatMemory,
  difficultyLabel,
}: CodeProblemPanelProps) {
  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-2">
        <View className="rounded-full bg-emerald-500/10 px-2.5 py-1">
          <Text className="text-[10px] font-bold text-emerald-600">
            {exercise.language.name} {exercise.language.version}
          </Text>
        </View>
        <View className="rounded-full bg-amber-500/10 px-2.5 py-1">
          <Text className="text-[10px] font-bold text-amber-600">
            Time {formatLimitMs(exercise.time_limit)}
          </Text>
        </View>
        <View className="rounded-full bg-sky-500/10 px-2.5 py-1">
          <Text className="text-[10px] font-bold text-sky-600">
            Memory {formatMemory(exercise.memory_limit)}
          </Text>
        </View>
        <View className="rounded-full bg-zinc-500/10 px-2.5 py-1">
          <Text className={`text-[10px] font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
            {difficultyLabel(exercise.difficulty)}
          </Text>
        </View>
      </View>

      <View className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
        <Text className={`mb-3 text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
          Mô tả bài toán
        </Text>
        {exercise.description ? (
          <MarkdownRenderer content={exercise.description} autoHeight />
        ) : (
          <Text className="text-xs italic text-zinc-500">Chưa có mô tả</Text>
        )}
      </View>

      {exercise.hints && exercise.hints.length > 0 && (
        <View className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
          <Text className={`mb-3 text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
            Gợi ý
          </Text>
          <View className="gap-2">
            {exercise.hints.map((hint, index) => (
              <Text
                key={`${exercise.id}-hint-${index}`}
                className={`text-sm leading-6 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}
              >
                {index + 1}. {hint}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}
