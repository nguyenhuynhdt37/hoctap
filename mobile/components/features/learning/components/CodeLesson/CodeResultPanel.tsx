import React from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import type { CodeLessonTestResult, TestCase } from '../../types/code-lesson'
import { TestResults } from './TestResults'

interface CodeResultPanelProps {
  testcases: TestCase[]
  testResult: CodeLessonTestResult | null
  isDark: boolean
}

export function CodeResultPanel({ testcases, testResult, isDark }: CodeResultPanelProps) {
  if (!testResult) {
    return (
      <View className={`items-center justify-center rounded-2xl border p-6 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
        <View className={`mb-3 h-12 w-12 items-center justify-center rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
          <Ionicons name="flask-outline" size={24} color={isDark ? '#A1A1AA' : '#71717A'} />
        </View>
        <Text className={`text-center text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Chưa có kết quả
        </Text>
        <Text className={`mt-1 text-center text-xs leading-5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          Mở tab Code và nhấn Run để xem Passed / Failed, output, error, runtime, memory và console.
        </Text>
      </View>
    )
  }

  return (
    <TestResults
      testcases={testcases}
      testResult={testResult}
      isDark={isDark}
    />
  )
}
