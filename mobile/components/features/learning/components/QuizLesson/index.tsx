/**
 * Quiz Lesson Component
 * Giao diện quiz đầy đủ với scoring và results
 */

import React, { useCallback, useMemo, useState } from 'react'
import { View, ScrollView, Pressable, Animated, StyleSheet } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import type { Lesson, Quiz } from '../types'
import { QuizProgress } from './QuizProgress'
import { QuestionCard } from './QuestionCard'
import { QuizResults } from './QuizResults'
import { Celebration } from '../Celebration'

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface QuizLessonProps {
  lesson: Lesson
  isDark: boolean
  onComplete: () => void
  onNext: () => void
  onPrev: () => void
  hasNext: boolean
  hasPrev: boolean
  isCompleted: boolean
  onMarkCompleted?: (lessonId: string) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function QuizLesson({
  lesson,
  isDark,
  onComplete,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  isCompleted,
  onMarkCompleted,
}: QuizLessonProps) {
  const quizzes = lesson.quizzes ?? []

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const currentQuestion = quizzes[currentIndex]
  const isLast = currentIndex === quizzes.length - 1
  const isFirst = currentIndex === 0
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const isAnswered = currentAnswer !== undefined

  // Scoring
  const answeredCount = Object.keys(answers).length
  const correctCount = useMemo(() => {
    return quizzes.filter(q => {
      const ans = answers[q.id]
      if (ans === undefined) return false
      const correctIdx = q.options.findIndex(o => o.is_correct)
      return ans === correctIdx && correctIdx >= 0
    }).length
  }, [quizzes, answers])

  const scorePercent = quizzes.length > 0 ? Math.round((correctCount / quizzes.length) * 100) : 0
  const passed = scorePercent >= 80

  // Handlers
  const handleSelectAnswer = useCallback((answerIdx: number) => {
    if (!currentQuestion || isAnswered) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answerIdx }))
  }, [currentQuestion, isAnswered])

  const handleNext = useCallback(() => {
    if (isLast) {
      // Show results
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowResults(true)

      // Trigger celebration if passed
      if (passed) {
        setShowCelebration(true)
        if (!isCompleted && onMarkCompleted) {
          onMarkCompleted(lesson.id)
        }
        setTimeout(() => {
          setShowCelebration(false)
        }, 3000)
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setCurrentIndex(prev => prev + 1)
    }
  }, [isLast, passed, lesson.id, isCompleted, onMarkCompleted])

  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowResults(false)
    setCurrentIndex(0)
    setAnswers({})
    setShowCelebration(false)
  }, [])

  // Empty state
  if (quizzes.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className={`w-20 h-20 rounded-full items-center justify-center mb-5 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
          <Feather name="help-circle" size={40} color={isDark ? '#52525B' : '#9CA3AF'} />
        </View>
        <Text className={`text-lg font-bold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Không có câu hỏi nào
        </Text>
        <Text className={`text-sm text-center mt-2 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          Bài kiểm tra này chưa có nội dung
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1">
      {/* Quiz Progress Header */}
      <QuizProgress
        currentIndex={currentIndex}
        totalQuestions={quizzes.length}
        correctCount={correctCount}
        isDark={isDark}
        showResults={showResults}
      />

      {/* Content */}
      {showResults ? (
        <QuizResults
          scorePercent={scorePercent}
          correctCount={correctCount}
          totalQuestions={quizzes.length}
          passed={passed}
          onRetry={handleRetry}
          onComplete={() => {
            setShowResults(false)
            onComplete()
          }}
          onNext={hasNext ? onNext : undefined}
          isDark={isDark}
        />
      ) : (
        <>
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Question Card */}
            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                questionIndex={currentIndex}
                selectedAnswer={currentAnswer}
                isAnswered={isAnswered}
                onSelectAnswer={handleSelectAnswer}
                isDark={isDark}
              />
            )}
          </ScrollView>

          {/* Navigation Footer */}
          <View className={`px-5 py-4 flex-row items-center justify-between border-t ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
            {/* Prev button */}
            <Pressable
              onPress={onPrev}
              disabled={!hasPrev}
              className={`flex-row items-center gap-2 px-4 py-3 rounded-xl ${hasPrev ? (isDark ? 'bg-zinc-800' : 'bg-gray-100') : 'opacity-40'}`}
            >
              <Feather
                name="arrow-left"
                size={16}
                color={hasPrev ? (isDark ? '#A1A1AA' : '#71717A') : '#D4D4D8'}
              />
              <Text className={`text-sm font-medium ${hasPrev ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-zinc-600' : 'text-gray-300')}`}>
                Trước
              </Text>
            </Pressable>

            {/* Next/Finish button */}
            <Pressable
              onPress={handleNext}
              disabled={!isAnswered && !isLast}
              className={`flex-row items-center gap-2 px-6 py-3 rounded-xl ${isAnswered
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                  : isDark ? 'bg-zinc-800' : 'bg-gray-200'
                }`}
            >
              <Text className={`text-sm font-bold ${isAnswered ? 'text-white' : isDark ? 'text-zinc-500' : 'text-gray-400'
                }`}>
                {isLast ? 'Xem kết quả' : 'Tiếp theo'}
              </Text>
              {!isLast && <Feather name="arrow-right" size={16} color={isAnswered ? '#FFFFFF' : isDark ? '#52525B' : '#D4D4D8'} />}
            </Pressable>
          </View>
        </>
      )}

      {/* Celebration Overlay */}
      <Celebration
        visible={showCelebration}
        type="quiz_pass"
        message={passed ? 'Xuất sắc!' : 'Cố gắng lên!'}
        subMessage={passed ? 'Bạn đã vượt qua bài kiểm tra' : 'Hãy ôn lại bài và thử lại nhé'}
      />
    </View>
  )
}
