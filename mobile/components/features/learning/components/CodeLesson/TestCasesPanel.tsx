import React from 'react'
import { View } from 'react-native'
import { Text } from '@/components/ui'
import type { TestCase } from '../../types/code-lesson'

interface TestCasesPanelProps {
  testcases: TestCase[]
  isDark: boolean
}

const CodeBlock = ({ label, value, tone, isDark }: { label: string; value: string; tone?: 'green'; isDark: boolean }) => (
  <View className="gap-1">
    <Text className={`text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
      {label}
    </Text>
    <View className={`rounded-xl border px-3 py-2 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
      <Text className={`font-mono text-xs leading-5 ${tone === 'green' ? 'text-emerald-600' : isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
        {value || '∅'}
      </Text>
    </View>
  </View>
)

export function TestCasesPanel({ testcases, isDark }: TestCasesPanelProps) {
  const sortedTestcases = [...testcases].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  if (sortedTestcases.length === 0) {
    return (
      <View className={`rounded-2xl border p-5 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
        <Text className="text-center text-sm text-zinc-500">Bài này chưa có test case công khai.</Text>
      </View>
    )
  }

  return (
    <View className="gap-3">
      <View>
        <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Test Cases
        </Text>
        <Text className={`mt-1 text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          Sample và public test hiển thị trước khi chạy code. Hidden test được đánh dấu rõ ràng.
        </Text>
      </View>

      {sortedTestcases.map((testcase, index) => {
        const isHidden = Boolean(testcase.hidden)
        const expected = testcase.expected_output ?? testcase.expected ?? ''
        return (
          <View
            key={testcase.id}
            className={`rounded-2xl border p-4 ${
              testcase.is_sample
                ? isDark ? 'bg-emerald-950/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
                : isHidden
                  ? isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-gray-100 border-gray-300'
                  : isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
            }`}
          >
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Test {index + 1}
                </Text>
                {testcase.is_sample && (
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
            </View>

            <View className="gap-3">
              <CodeBlock label="Input" value={isHidden ? '•••' : testcase.input} isDark={isDark} />
              <CodeBlock label="Expected Output" value={isHidden ? '•••' : expected} tone="green" isDark={isDark} />
              {testcase.description ? (
                <View className={`rounded-xl px-3 py-2 ${isDark ? 'bg-zinc-950' : 'bg-gray-50'}`}>
                  <Text className={`text-xs leading-5 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {testcase.description}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}
