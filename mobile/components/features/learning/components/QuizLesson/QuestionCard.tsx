/**
 * Question Card Component
 * Hiển thị câu hỏi và các lựa chọn
 */

import React from 'react'
import { View, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import type { Quiz } from '../../types'

interface QuestionCardProps {
  question: Quiz
  questionIndex: number
  selectedAnswer: number | undefined
  isAnswered: boolean
  onSelectAnswer: (answerIdx: number) => void
  isDark: boolean
}

export function QuestionCard({
  question,
  questionIndex,
  selectedAnswer,
  isAnswered,
  onSelectAnswer,
  isDark,
}: QuestionCardProps) {
  const correctIdx = question.options.findIndex(o => o.is_correct)

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return { bg: 'bg-emerald-500/10', text: 'text-emerald-600' }
      case 'medium': return { bg: 'bg-amber-500/10', text: 'text-amber-600' }
      case 'hard': return { bg: 'bg-red-500/10', text: 'text-red-600' }
      default: return { bg: 'bg-gray-500/10', text: 'text-gray-600' }
    }
  }

  const difficulty = getDifficultyColor(question.difficulty_level)

  return (
    <View className="mt-5">
      {/* Question header */}
      <View className="flex-row items-center gap-3 mb-4">
        <View className={`px-3 py-1 rounded-full ${difficulty.bg}`}>
          <Text className={`text-xs font-bold uppercase ${difficulty.text}`}>
            {question.difficulty_level === 'easy' ? 'Dễ' : question.difficulty_level === 'medium' ? 'Trung bình' : 'Khó'}
          </Text>
        </View>
      </View>

      {/* Question */}
      <View className={`p-5 rounded-xl mb-4 ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}>
        <Text className={`text-base font-semibold leading-relaxed ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {question.question}
        </Text>
      </View>

      {/* Options */}
      <View className="gap-2">
        {question.options.map((option, idx) => {
          const isSelected = selectedAnswer === idx
          const isCorrectOption = idx === correctIdx
          const showCorrect = isAnswered && isCorrectOption
          const showWrong = isAnswered && isSelected && !isCorrectOption

          let bgClass = isDark ? 'bg-zinc-800' : 'bg-gray-50'
          let borderClass = isDark ? 'border-zinc-700' : 'border-gray-200'
          let textClass = isDark ? 'text-white' : 'text-gray-900'

          if (isSelected && !isAnswered) {
            bgClass = 'bg-blue-500/10'
            borderClass = 'border-blue-500'
            textClass = 'text-blue-600'
          }
          if (showCorrect) {
            bgClass = 'bg-emerald-500/10'
            borderClass = 'border-emerald-500'
            textClass = 'text-emerald-600'
          }
          if (showWrong) {
            bgClass = 'bg-red-500/10'
            borderClass = 'border-red-500'
            textClass = 'text-red-500'
          }

          return (
            <Pressable
              key={option.id}
              onPress={() => onSelectAnswer(idx)}
              disabled={isAnswered}
              className={`flex-row items-center p-4 rounded-xl border-2 ${bgClass} ${borderClass}`}
            >
              {/* Option letter */}
              <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${isSelected
                  ? 'bg-blue-500'
                  : showCorrect
                    ? 'bg-emerald-500'
                    : showWrong
                      ? 'bg-red-500'
                      : isDark ? 'bg-zinc-700' : 'bg-gray-200'
                }`}>
                <Text className={`text-sm font-bold ${isSelected || showCorrect || showWrong
                    ? 'text-white'
                    : isDark ? 'text-zinc-400' : 'text-gray-500'
                  }`}>
                  {String.fromCharCode(65 + idx)}
                </Text>
              </View>

              {/* Option text */}
              <Text className={`text-sm font-medium flex-1 ${textClass}`} numberOfLines={3}>
                {option.text}
              </Text>

              {/* Result icon */}
              {isAnswered && (
                showCorrect ? (
                  <View className="w-7 h-7 rounded-full bg-emerald-500 items-center justify-center">
                    <Feather name="check" size={16} color="#FFFFFF" />
                  </View>
                ) : showWrong ? (
                  <View className="w-7 h-7 rounded-full bg-red-500 items-center justify-center">
                    <Feather name="x" size={16} color="#FFFFFF" />
                  </View>
                ) : null
              )}
            </Pressable>
          )
        })}
      </View>

      {/* Explanation */}
      {isAnswered && question.explanation && (
        <View className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
          <View className="flex-row items-center gap-2 mb-2">
            <Feather name="message-circle" size={16} color={isDark ? '#F59E0B' : '#F59E0B'} />
            <Text className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              Giải thích
            </Text>
          </View>
          <Text className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
            {question.explanation}
          </Text>
        </View>
      )}
    </View>
  )
}
