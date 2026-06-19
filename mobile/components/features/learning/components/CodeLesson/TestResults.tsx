/**
 * Test Results Component
 * Hiển thị kết quả test cases
 */

import React from 'react'
import { View } from 'react-native'
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
    <View className="gap-3">
      <View className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2">
            <View className={`h-8 w-8 items-center justify-center rounded-full ${allPassed ? 'bg-emerald-500' : 'bg-red-500'}`}>
              <Feather name={allPassed ? 'check' : 'x'} size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Kết quả
              </Text>
              <Text className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                {testResult.passed}/{testResult.total} passed
              </Text>
            </View>
          </View>
          <Text className={`text-lg font-black ${allPassed ? 'text-emerald-600' : 'text-red-600'}`}>
            {passPercent}%
          </Text>
        </View>
        <View className={`mt-3 h-2 overflow-hidden rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
          <View className={`${allPassed ? 'bg-emerald-500' : 'bg-red-500'} h-2 rounded-full`} style={{ width: `${passPercent}%` }} />
        </View>
      </View>

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
            className={`rounded-2xl border p-4 ${
              hasResult
                ? isPassed
                  ? isDark ? 'bg-emerald-950/20 border-emerald-700' : 'bg-emerald-50 border-emerald-300'
                  : isDark ? 'bg-rose-950/20 border-rose-700' : 'bg-rose-50 border-rose-300'
                : isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
            }`}
          >
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <View className={`h-6 w-6 items-center justify-center rounded-full ${isPassed ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-zinc-500'}`}>
                  <Feather name={isPassed ? 'check' : 'x'} size={13} color="#FFFFFF" />
                </View>
                <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Test {idx + 1}
                </Text>
                {tc.is_sample && (
                  <View className="rounded bg-emerald-500/10 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-emerald-600">Sample</Text>
                  </View>
                )}
                {isHidden && (
                  <View className="rounded bg-zinc-500/10 px-2 py-0.5">
                    <Text className={`text-[10px] font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>Hidden</Text>
                  </View>
                )}
              </View>
              <Text className={`text-[10px] font-bold ${isPassed ? 'text-emerald-600' : hasResult ? 'text-red-600' : 'text-zinc-500'}`}>
                {hasResult ? (isPassed ? 'PASSED' : 'FAILED') : 'CHƯA CHẠY'}
              </Text>
            </View>

            <View className="gap-3">
              <View>
                <Text className={`mb-1 text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>Input</Text>
                <View className={`rounded-xl border px-3 py-2 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'}`}>
                  <Text className={`font-mono text-xs leading-5 ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
                    {isHidden ? '•••' : tc.input || '∅'}
                  </Text>
                </View>
              </View>

              <View>
                <Text className={`mb-1 text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>Expected Output</Text>
                <View className={`rounded-xl border px-3 py-2 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'}`}>
                  <Text className={`font-mono text-xs leading-5 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {isHidden ? '•••' : expected || '∅'}
                  </Text>
                </View>
              </View>

              {!isHidden && result?.output !== undefined && (
                <View>
                  <Text className={`mb-1 text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>Output</Text>
                  <View className={`rounded-xl border px-3 py-2 ${isPassed ? isDark ? 'bg-emerald-950/30 border-emerald-800' : 'bg-emerald-100 border-emerald-200' : isDark ? 'bg-red-950/30 border-red-800' : 'bg-red-100 border-red-200'}`}>
                    <Text className={`font-mono text-xs leading-5 ${isPassed ? 'text-emerald-700' : 'text-red-700'}`}>
                      {result.output || '(empty)'}
                    </Text>
                  </View>
                </View>
              )}

              {(result?.stderr || result?.error_message) ? (
                <View>
                  <Text className="mb-1 text-[11px] font-bold text-red-600">Error / Console</Text>
                  <View className={`rounded-xl border px-3 py-2 ${isDark ? 'bg-red-950/30 border-red-800' : 'bg-red-50 border-red-200'}`}>
                    <Text className="font-mono text-xs leading-5 text-red-700">
                      {result.stderr || result.error_message}
                    </Text>
                  </View>
                </View>
              ) : null}

              {result && (
                <View className="flex-row flex-wrap gap-2">
                  <Text className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Runtime: {result.cpu_time ?? 0}ms
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
                <Text className={`text-xs leading-5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                  {tc.description}
                </Text>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}
