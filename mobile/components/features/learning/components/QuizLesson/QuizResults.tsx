/**
 * Quiz Results Component
 * Hiển thị kết quả bài quiz
 */

import React from 'react'
import { View, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui'

interface QuizResultsProps {
  scorePercent: number
  correctCount: number
  totalQuestions: number
  passed: boolean
  onRetry: () => void
  onComplete: () => void
  onNext?: () => void
  isDark: boolean
}

export function QuizResults({
  scorePercent,
  correctCount,
  totalQuestions,
  passed,
  onRetry,
  onComplete,
  onNext,
  isDark,
}: QuizResultsProps) {
  const getResultConfig = () => {
    if (scorePercent >= 90) {
      return {
        icon: 'award',
        iconBg: 'bg-amber-500',
        title: 'Xuất sắc!',
        titleColor: 'text-amber-500',
        subText: 'Bạn làm rất tốt!',
        stars: 5,
      }
    } else if (scorePercent >= 80) {
      return {
        icon: 'check-circle',
        iconBg: 'bg-emerald-500',
        title: 'Tốt lắm!',
        titleColor: 'text-emerald-500',
        subText: 'Bạn đã vượt qua bài kiểm tra',
        stars: 4,
      }
    } else if (scorePercent >= 60) {
      return {
        icon: 'thumbs-up',
        iconBg: 'bg-blue-500',
        title: 'Khá tốt!',
        titleColor: 'text-blue-500',
        subText: 'Cần ôn tập thêm một chút',
        stars: 3,
      }
    } else if (scorePercent >= 40) {
      return {
        icon: 'alert-circle',
        iconBg: 'bg-amber-500',
        title: 'Cần cố gắng hơn',
        titleColor: 'text-amber-500',
        subText: 'Hãy ôn lại bài và thử lại nhé',
        stars: 2,
      }
    } else {
      return {
        icon: 'x-circle',
        iconBg: 'bg-red-500',
        title: 'Chưa đạt',
        titleColor: 'text-red-500',
        subText: 'Đừng nản lòng, hãy thử lại!',
        stars: 1,
      }
    }
  }

  const config = getResultConfig()

  return (
    <View className="flex-1 items-center justify-center px-8">
      {/* Score circle */}
      <View className="relative mb-6">
        <View
          className={`w-36 h-36 rounded-full items-center justify-center ${config.iconBg}`}
        >
          <Text className="text-4xl font-extrabold text-white">{scorePercent}%</Text>
        </View>
        <View className={`absolute -bottom-2 -right-2 w-14 h-14 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-white'} shadow-lg`}>
          <Feather name={config.icon as any} size={28} color={config.titleColor.replace('text-', '#').replace('-500', '')} />
        </View>
      </View>

      {/* Title */}
      <Text className={`text-2xl font-extrabold mb-1 ${config.titleColor}`}>
        {config.title}
      </Text>
      <Text className={`text-base font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
        {config.subText}
      </Text>

      {/* Stars */}
      <View className="flex-row items-center gap-1 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <Feather
            key={i}
            name="star"
            size={20}
            color={i <= config.stars ? '#F59E0B' : isDark ? '#52525B' : '#D4D4D8'}
            fill={i <= config.stars ? '#F59E0B' : 'transparent'}
          />
        ))}
      </View>

      {/* Stats */}
      <View className={`w-full p-4 rounded-xl mb-6 ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}>
        <View className="flex-row items-center justify-around">
          <View className="items-center">
            <Text className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {correctCount}
            </Text>
            <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Đúng</Text>
          </View>
          <View className={`w-px h-10 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
          <View className="items-center">
            <Text className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {totalQuestions - correctCount}
            </Text>
            <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Sai</Text>
          </View>
          <View className={`w-px h-10 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
          <View className="items-center">
            <Text className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {totalQuestions}
            </Text>
            <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Tổng</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row gap-3 w-full">
        <Pressable
          onPress={onRetry}
          className={`flex-1 py-3.5 rounded-xl items-center ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}
        >
          <View className="flex-row items-center gap-2">
            <Feather name="rotate-ccw" size={16} color={isDark ? '#A1A1AA' : '#71717A'} />
            <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Làm lại
            </Text>
          </View>
        </Pressable>

        {onNext ? (
          <Pressable
            onPress={onNext}
            className="flex-1 py-3.5 rounded-xl bg-emerald-500 items-center shadow-lg shadow-emerald-500/30"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-white text-sm font-bold">Bài tiếp</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={onComplete}
            className="flex-1 py-3.5 rounded-xl bg-emerald-500 items-center shadow-lg shadow-emerald-500/30"
          >
            <Text className="text-white text-sm font-bold">Hoàn thành</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
