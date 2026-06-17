/**
 * Test Results Component
 * Hiển thị kết quả test cases
 */

import React from 'react'
import { View, ScrollView, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import type { TestCase } from '../../types/code-lesson'
import type { CodeTestResult } from '../../types'

interface TestResultsProps {
  testcases: TestCase[]
  testResult: CodeTestResult
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
          {testcases.map((tc, idx) => {
            const result = testResult.details.find(d => d.index === idx)
            const isPassed = result?.result === 'passed'
            const isFailed = result?.result === 'failed'

            return (
              <View
                key={tc.id}
                className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}
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
                  </View>
                  <Text className={`text-[10px] font-medium ${isPassed ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                    {isPassed ? 'Passed' : 'Failed'}
                  </Text>
                </View>

                {/* Test case info */}
                <View className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-600'} space-y-1`}>
                  <View className="flex-row">
                    <Text className="w-16 font-medium">Input:</Text>
                    <Text className={`font-mono flex-1 ${isDark ? 'text-zinc-300' : 'text-gray-800'}`}>
                      {tc.input}
                    </Text>
                  </View>
                  <View className="flex-row">
                    <Text className="w-16 font-medium">Expected:</Text>
                    <Text className={`font-mono flex-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {tc.expected}
                    </Text>
                  </View>
                  {isFailed && result?.output && (
                    <View className="flex-row">
                      <Text className="w-16 font-medium">Output:</Text>
                      <Text className={`font-mono flex-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {result.output}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Description */}
                <Text className={`text-[10px] mt-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                  {tc.description}
                </Text>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
