import React, { useMemo, useState } from 'react'
import { Pressable, useColorScheme, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import type { Lesson } from '../types'

interface QuizLessonProps {
  lesson: Lesson
  onMarkCompleted: (lessonId: string) => void
  isDark?: boolean
}

type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

const PASSING_SCORE = 80

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (!raw) return ''

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed.trim()
    if (parsed && typeof parsed === 'object') {
      const candidate =
        (parsed as any).text ??
        (parsed as any).content ??
        (parsed as any).question ??
        (parsed as any).topic_description

      if (candidate) return String(candidate).trim()
    }
  } catch {
    // Plain text is the normal case.
  }

  return raw
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function QuizLesson({ lesson, onMarkCompleted, isDark: propIsDark }: QuizLessonProps) {
  const localIsDark = useColorScheme() === 'dark'
  const isDark = propIsDark ?? localIsDark

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ score: number; correct: number } | null>(null)
  const [completionSent, setCompletionSent] = useState(false)

  const quizQuestions = useMemo<QuizQuestion[]>(() => {
    return (lesson.quizzes ?? []).map((question, questionIndex) => {
      const sortedOptions = [...(question.options ?? [])].sort((a, b) => {
        return (a.position ?? 0) - (b.position ?? 0)
      })
      const correctAnswer = sortedOptions.findIndex(option => option.is_correct)

      return {
        id: question.id || `${lesson.id}-${questionIndex}`,
        question: normalizeText(question.question),
        options: sortedOptions.map(option => normalizeText(option.text)),
        correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
        explanation: normalizeText(question.explanation),
      }
    })
  }, [lesson.id, lesson.quizzes])

  const currentQuestion = quizQuestions[currentQuestionIndex]
  const currentAnswer = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined
  const isAnswered = currentAnswer !== undefined
  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1

  const calculateResult = () => {
    const correct = quizQuestions.reduce((total, question) => {
      return selectedAnswers[question.id] === question.correctAnswer ? total + 1 : total
    }, 0)
    const score = quizQuestions.length ? Math.round((correct / quizQuestions.length) * 100) : 0
    return { score, correct }
  }

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    if (selectedAnswers[questionId] !== undefined) return
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answerIndex }))
  }

  const handleFinishQuiz = () => {
    const nextResult = calculateResult()
    setResult(nextResult)

    if (
      nextResult.score >= PASSING_SCORE &&
      !completionSent &&
      !lesson.is_completed
    ) {
      setCompletionSent(true)
      setTimeout(() => {
        onMarkCompleted(lesson.id)
      }, 250)
    }
  }

  const handleNextQuestion = () => {
    if (!isAnswered) return
    if (isLastQuestion) {
      handleFinishQuiz()
      return
    }
    setCurrentQuestionIndex(prev => prev + 1)
  }

  const handlePrevQuestion = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleRetryQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswers({})
    setResult(null)
    setCompletionSent(false)
  }

  if (quizQuestions.length === 0) {
    return (
      <View className={`m-5 p-6 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        <Text className="text-zinc-500 text-center">Không có câu hỏi nào trong bài học này.</Text>
      </View>
    )
  }

  if (result) {
    const passed = result.score >= PASSING_SCORE

    return (
      <View className="p-5">
        <View className={`p-6 rounded-3xl items-center border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
          <Text className={`text-5xl font-black mb-3 ${passed ? 'text-emerald-500' : 'text-rose-500'}`}>
            {result.score}%
          </Text>
          <Text className={`text-lg font-bold mb-6 ${isDark ? 'text-zinc-300' : 'text-zinc-500'}`}>
            {result.correct}/{quizQuestions.length} câu đúng
          </Text>

          <View className={`w-full p-6 rounded-2xl border items-center mb-8 ${
            passed
              ? isDark ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-emerald-50 border-emerald-100'
              : isDark ? 'bg-rose-950/20 border-rose-900/30' : 'bg-rose-50 border-rose-100'
          }`}>
            <View className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${passed ? 'bg-emerald-500' : 'bg-rose-500'}`}>
              <Ionicons name={passed ? 'trophy' : 'close'} size={24} color="white" />
            </View>
            <Text className={`font-extrabold text-lg mb-1 ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
              {passed ? 'Chúc mừng!' : 'Chưa đạt yêu cầu!'}
            </Text>
            <Text className={`text-sm text-center ${passed ? 'text-emerald-700' : 'text-rose-700'}`}>
              {passed
                ? 'Bạn đã vượt qua bài kiểm tra và hoàn thành bài học này.'
                : `Bạn cần đạt tối thiểu ${PASSING_SCORE}% để hoàn thành. Hãy ôn lại bài và thử lại nhé!`}
            </Text>
          </View>

          <Pressable
            onPress={handleRetryQuiz}
            className={`px-6 py-3 rounded-full flex-row items-center gap-2 border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}`}
          >
            <Ionicons name="refresh" size={16} color={isDark ? '#E4E4E7' : '#3F3F46'} />
            <Text className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Làm lại</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (!currentQuestion) return null

  return (
    <View className="p-5">
      <View className="mb-5">
        <View className="flex-row items-center justify-between mb-3">
          <Text className={`text-base font-black ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            Luyện tập
          </Text>
          <View className={`px-3 py-1.5 rounded-full border ${isDark ? 'bg-emerald-950/30 border-emerald-900/30' : 'bg-emerald-50 border-emerald-100'}`}>
            <Text className="text-xs font-bold text-emerald-600">
              Câu {currentQuestionIndex + 1}/{quizQuestions.length}
            </Text>
          </View>
        </View>

        <View className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
          <View
            className="h-full bg-emerald-500 rounded-full"
            style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
          />
        </View>
      </View>

      <View className={`p-5 rounded-2xl mb-5 border min-h-[120px] ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        <Text className={`text-base font-semibold leading-7 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {currentQuestion.question}
        </Text>
      </View>

      <View className="gap-3 mb-6">
        {currentQuestion.options.map((option, index) => {
          const showCorrect = isAnswered && index === currentQuestion.correctAnswer
          const showWrong = isAnswered && currentAnswer === index && index !== currentQuestion.correctAnswer
          const muted = isAnswered && !showCorrect && !showWrong

          const cardClass = showCorrect
            ? isDark ? 'bg-emerald-950/20 border-emerald-500' : 'bg-emerald-50 border-emerald-500'
            : showWrong
              ? isDark ? 'bg-rose-950/20 border-rose-500' : 'bg-rose-50 border-rose-500'
              : isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'

          const textClass = showCorrect
            ? 'text-emerald-600'
            : showWrong
              ? 'text-rose-600'
              : muted ? 'text-zinc-400' : isDark ? 'text-zinc-300' : 'text-zinc-700'

          return (
            <Pressable
              key={`${currentQuestion.id}-${index}`}
              onPress={() => handleAnswerSelect(currentQuestion.id, index)}
              disabled={isAnswered}
              className={`w-full p-4 rounded-xl border-2 flex-row items-center ${cardClass}`}
            >
              <View className={`w-8 h-8 rounded-full border-2 items-center justify-center mr-3 ${
                showCorrect || showWrong
                  ? showCorrect ? 'bg-emerald-500 border-emerald-500' : 'bg-rose-500 border-rose-500'
                  : isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-300 bg-white'
              }`}>
                <Text className={`text-xs font-black ${showCorrect || showWrong ? 'text-white' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text className={`flex-1 text-sm font-semibold leading-6 ${textClass}`}>
                {option}
              </Text>
              {showCorrect && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
              {showWrong && <Ionicons name="close-circle" size={20} color="#EF4444" />}
            </Pressable>
          )
        })}
      </View>

      {isAnswered && (
        <View className={`p-4 rounded-xl border mb-6 ${
          currentAnswer === currentQuestion.correctAnswer
            ? isDark ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-emerald-50 border-emerald-100'
            : isDark ? 'bg-amber-950/20 border-amber-900/30' : 'bg-amber-50 border-amber-100'
        }`}>
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons
              name={currentAnswer === currentQuestion.correctAnswer ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={currentAnswer === currentQuestion.correctAnswer ? '#10B981' : '#D97706'}
            />
            <Text className={`font-bold ${currentAnswer === currentQuestion.correctAnswer ? 'text-emerald-700' : 'text-amber-700'}`}>
              {currentAnswer === currentQuestion.correctAnswer ? 'Chính xác! Đáp án đúng.' : 'Sai rồi! Đáp án đúng là:'}
            </Text>
          </View>

          {currentAnswer !== currentQuestion.correctAnswer && (
            <Text className="text-emerald-600 font-bold ml-7 mb-2">
              {String.fromCharCode(65 + currentQuestion.correctAnswer)}. {currentQuestion.options[currentQuestion.correctAnswer]}
            </Text>
          )}

          {!!currentQuestion.explanation && (
            <View className="mt-2 pt-2 border-t border-zinc-200/40">
              <Text className={`text-xs font-semibold mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Giải thích:
              </Text>
              <Text className={`text-sm leading-6 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {currentQuestion.explanation}
              </Text>
            </View>
          )}
        </View>
      )}

      <View className="flex-row items-center justify-between pt-4 border-t border-zinc-200/20 mb-10">
        <Pressable
          onPress={handlePrevQuestion}
          disabled={isFirstQuestion}
          className={`px-4 py-2.5 rounded-xl flex-row items-center gap-1.5 ${isFirstQuestion ? 'opacity-40' : ''} ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}
        >
          <Ionicons name="chevron-back" size={16} color={isDark ? '#E4E4E7' : '#3F3F46'} />
          <Text className={`text-sm font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Trước</Text>
        </Pressable>

        <Pressable
          onPress={handleNextQuestion}
          disabled={!isAnswered}
          className={`px-6 py-2.5 rounded-xl flex-row items-center gap-1.5 ${isAnswered ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800 opacity-50'}`}
        >
          <Text className={`text-sm font-bold ${isAnswered ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
            {isLastQuestion ? 'Hoàn thành' : 'Tiếp theo'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={isAnswered ? 'white' : (isDark ? '#52525B' : '#A1A1AA')} />
        </Pressable>
      </View>
    </View>
  )
}
