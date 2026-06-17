/**
 * Test Results Component
 * Hiển thị kết quả test cases
 */

import React from 'react'
import { View, ScrollView } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import type { CodeLessonTestResult, TestCase } from '../../types/code-lesson'

interface TestResultsProps {
  testcases: TestCase[]
  testResult: CodeLessonTestResult
  isDark: boolean
}

export function TestResults({ testcases, testResult, isDark }: TestResultsProps) {
  const passPercent = testResult.total > 0
    ? Math.round((testResult.passed / testResult.total) * 100)
    : 0

  const allPassed = testResult.passed === testResult.total

  return (
    <View className={`${isDark ? 'bg-zinc-900' : 'bg-white'} border-t ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-200 dark:border-zinc-800">
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-2">
            <View className={`w-6 h-6 rounded-full items-center justify-center ${allPassed ? 'bg-emerald-500' : 'bg-red-500'
              }`}>
              <Feather
                name={allPassed ? 'check' : 'x'}
                size={14}
                color="#FFFFFF"
              />
            </View>
            <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Kết quả test
            </Text>
          </View>

          {/* Score badge */}
          <View className={`px-3 py-1 rounded-full ${allPassed ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <Text className={`text-xs font-bold ${allPassed ? 'text-emerald-600' : 'text-red-600'}`}>
              {testResult.passed}/{testResult.total} passed ({passPercent}%)
            </Text>
          </View>
        </View>
      </View>

      {/* Test cases */}
      <ScrollView className="max-h-48" showsVerticalScrollIndicator={false}>
        <View className="p-4 gap-3">
          {[...testcases].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((tc, idx) => {
            const result = testResult.details.find(d => d.index === idx)
            const isPassed = result?.result === 'passed'
            const hasResult = Boolean(result)
            const isFailed = hasResult && !isPassed
            const isHidden = Boolean(tc.hidden)
            const expected = tc.expected_output ?? tc.expected ?? ''

            return (
              <View
                key={tc.id}
                className={`p-3 rounded-lg border ${
                  hasResult
                    ? isPassed
                      ? isDark ? 'bg-emerald-950/20 border-emerald-700' : 'bg-emerald-50 border-emerald-300'
                      : isDark ? 'bg-rose-950/20 border-rose-700' : 'bg-rose-50 border-rose-300'
                    : isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className={`w-5 h-5 rounded-full items-center justify-center ${isPassed ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-zinc-500'
                      }`}>
                      <Feather
                        name={isPassed ? 'check' : 'x'}
                        size={12}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Test {idx + 1}
                    </Text>
                    {tc.is_sample && (
                      <View className="rounded bg-emerald-500/10 px-1.5 py-0.5">
                        <Text className="text-[9px] font-bold text-emerald-600">Sample</Text>
                      </View>
                    )}
                    {isHidden && (
                      <View className="rounded bg-zinc-500/10 px-1.5 py-0.5">
                        <Text className={`text-[9px] font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>Hidden</Text>
                      </View>
                    )}
                  </View>
                  <Text className={`text-[10px] font-medium ${isPassed ? 'text-emerald-600' : hasResult ? 'text-red-600' : 'text-zinc-500'
                    }`}>
                    {hasResult ? (isPassed ? 'Passed' : 'Failed') : 'Chưa chạy'}
                  </Text>
                </View>

                {/* Test case info */}
                <View className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-600'} space-y-1`}>
                  <View className="flex-row">
                    <Text className="w-16 font-medium">Input:</Text>
                    <Text className={`font-mono flex-1 ${isDark ? 'text-zinc-300' : 'text-gray-800'}`}>
                      {isHidden ? '•••' : tc.input || '∅'}
                    </Text>
                  </View>
                  <View className="flex-row">
                    <Text className="w-16 font-medium">Expected:</Text>
                    <Text className={`font-mono flex-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {isHidden ? '•••' : expected || '∅'}
                    </Text>
                  </View>
                  {!isHidden && result?.output !== undefined && (
                    <View className="flex-row">
                      <Text className="w-16 font-medium">Output:</Text>
                      <Text className={`font-mono flex-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {result.output || '(empty)'}
                      </Text>
                    </View>
                  )}
                  {result?.stderr ? (
                    <View className="flex-row">
                      <Text className="w-16 font-medium">Error:</Text>
                      <Text className={`font-mono flex-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {result.stderr}
                      </Text>
                    </View>
                  ) : null}
                  {result?.error_message ? (
                    <View className="flex-row">
                      <Text className="w-16 font-medium">Error:</Text>
                      <Text className={`font-mono flex-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {result.error_message}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {result && (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    <Text className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      CPU: {result.cpu_time ?? 0}ms
                    </Text>
                    <Text className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      Memory: {((result.memory ?? 0) / 1000000).toFixed(2)} MB
                    </Text>
                    <Text className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      Exit: {result.exit_code ?? 0}
                    </Text>
                  </View>
                )}

                {tc.description ? (
                  <Text className={`text-[10px] mt-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                    {tc.description}
                  </Text>
                ) : null}
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
