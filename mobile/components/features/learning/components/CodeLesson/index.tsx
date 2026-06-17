/**
 * Code Lesson Component
 * Code editor với file tabs và test runner
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import type { Lesson } from '../types'
import type { CodeExercise } from '../types/code-lesson'
import { FileTabs } from './FileTabs'
import { TestRunner } from './TestRunner'
import { TestResults } from './TestResults'
import { mockTestResult } from '../../mock-data'
import { Celebration } from '../Celebration'

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface CodeLessonProps {
  lesson: Lesson
  isDark: boolean
  isCompleted: boolean
  onMarkCompleted: (lessonId: string) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CodeLesson({ lesson, isDark, isCompleted, onMarkCompleted }: CodeLessonProps) {
  // Mock exercises data - trong thực tế sẽ fetch từ API
  const [exercises] = useState<CodeExercise[]>([
    {
      id: 'code-001',
      title: 'Bài 1: Viết hàm tính tổng',
      description: 'Viết một hàm `sum_numbers(a, b)` nhận vào hai số và trả về tổng của chúng.',
      language: { id: 'lang-py', name: 'python', display_name: 'Python', extensions: ['.py'], monaco_language: 'python' },
      files: [
        {
          id: 'file-001',
          filename: 'solution.py',
          content: '# Viết hàm tính tổng ở đây\ndef sum_numbers(a, b):\n    pass\n',
          language: { id: 'lang-py', name: 'python', display_name: 'Python', extensions: ['.py'], monaco_language: 'python' },
          is_main: true,
        },
      ],
      testcases: [
        { id: 'tc-001', input: 'sum_numbers(1, 2)', expected: '3', description: 'Tổng 1 + 2 = 3' },
        { id: 'tc-002', input: 'sum_numbers(0, 0)', expected: '0', description: 'Tổng 0 + 0 = 0' },
        { id: 'tc-003', input: 'sum_numbers(-1, 1)', expected: '0', description: 'Tổng -1 + 1 = 0' },
      ],
      is_pass: false,
      order: 1,
    },
    {
      id: 'code-002',
      title: 'Bài 2: Kiểm tra số chẵn/lẻ',
      description: 'Viết hàm `is_even(n)` trả về True nếu n là số chẵn.',
      language: { id: 'lang-py', name: 'python', display_name: 'Python', extensions: ['.py'], monaco_language: 'python' },
      files: [
        {
          id: 'file-002',
          filename: 'solution.py',
          content: '# Viết hàm kiểm tra số chẵn ở đây\ndef is_even(n):\n    pass\n',
          language: { id: 'lang-py', name: 'python', display_name: 'Python', extensions: ['.py'], monaco_language: 'python' },
          is_main: true,
        },
      ],
      testcases: [
        { id: 'tc-004', input: 'is_even(4)', expected: 'True', description: '4 là số chẵn' },
        { id: 'tc-005', input: 'is_even(7)', expected: 'False', description: '7 là số lẻ' },
        { id: 'tc-006', input: 'is_even(0)', expected: 'True', description: '0 là số chẵn' },
      ],
      is_pass: false,
      order: 2,
    },
  ])

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [userCode, setUserCode] = useState<Record<string, string>>({})
  const [isRunning, setIsRunning] = useState(false)
  const [testResult, setTestResult] = useState<typeof mockTestResult | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const currentExercise = exercises[currentExerciseIndex]

  // Initialize code state
  useEffect(() => {
    if (currentExercise) {
      const initialCode: Record<string, string> = {}
      currentExercise.files.forEach(file => {
        initialCode[file.id] = file.content
      })
      setUserCode(prev => {
        const merged = { ...prev }
        currentExercise.files.forEach(file => {
          if (!merged[file.id]) {
            merged[file.id] = file.content
          }
        })
        return merged
      })
      if (currentExercise.files.length > 0 && !activeFileId) {
        const mainFile = currentExercise.files.find(f => f.is_main) || currentExercise.files[0]
        setActiveFileId(mainFile.id)
      }
    }
  }, [currentExercise])

  const activeFile = currentExercise?.files.find(f => f.id === activeFileId)
  const currentCode = activeFile ? (userCode[activeFile.id] ?? activeFile.content) : ''

  // Test result stats
  const passPercent = testResult
    ? Math.round((testResult.passed / testResult.total) * 100)
    : 0

  // Handle code change
  const handleCodeChange = useCallback((text: string) => {
    if (!activeFile) return
    setUserCode(prev => ({ ...prev, [activeFile.id]: text }))
  }, [activeFile])

  // Run tests
  const handleRun = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsRunning(true)
    setTestResult(null)

    // Simulate API call - trong thực tế sẽ gọi API
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock test result based on code content
      const hasReturn = currentCode.includes('return')
      const passed = hasReturn ? 2 : 1
      const failed = hasReturn ? 1 : 2

      const result = {
        ...mockTestResult,
        passed,
        failed,
        total: 3,
        status: (passed === 3 ? 'success' : 'partial') as 'success' | 'partial',
        details: [
          {
            id: 'tc-001',
            index: 0,
            result: (passed >= 1 ? 'passed' : 'failed') as 'passed' | 'failed',
            input: 'sum_numbers(1, 2)',
            expected: '3',
            output: hasReturn ? '3' : 'None',
            cpu_time: 0.001,
          },
          {
            id: 'tc-002',
            index: 1,
            result: (passed >= 2 ? 'passed' : 'failed') as 'passed' | 'failed',
            input: 'sum_numbers(0, 0)',
            expected: '0',
            output: hasReturn ? '0' : 'None',
            cpu_time: 0.001,
          },
          {
            id: 'tc-003',
            index: 2,
            result: (passed === 3 ? 'passed' : 'failed') as 'passed' | 'failed',
            input: 'sum_numbers(-1, 1)',
            expected: '0',
            output: hasReturn ? '0' : 'None',
            cpu_time: 0.001,
          },
        ],
      }

      setTestResult(result)

      // Celebration if all pass
      if (passed >= 1) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setShowCelebration(true)
        if (!isCompleted) {
          onMarkCompleted(lesson.id)
        }
        setTimeout(() => setShowCelebration(false), 3000)
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể chạy code. Vui lòng thử lại.')
    } finally {
      setIsRunning(false)
    }
  }, [currentCode, isCompleted, lesson.id, onMarkCompleted])

  // Reset code
  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (!activeFile || !currentExercise) return

    Alert.alert(
      'Đặt lại code',
      'Bạn có chắc muốn đặt lại code về trạng thái ban đầu?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          style: 'destructive',
          onPress: () => {
            setUserCode(prev => ({ ...prev, [activeFile.id]: activeFile.content }))
            setTestResult(null)
          },
        },
      ]
    )
  }, [activeFile, currentExercise])

  // Change exercise
  const handleSelectExercise = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentExerciseIndex(index)
    setTestResult(null)
    setActiveFileId(null)
  }, [])

  return (
    <View className="flex-1">
      {/* Exercise Tabs */}
      <View className={`px-4 py-3 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'} border-b`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {exercises.map((ex, idx) => (
              <Pressable
                key={ex.id}
                onPress={() => handleSelectExercise(idx)}
                className={`px-4 py-2 rounded-full flex-row items-center gap-2 ${idx === currentExerciseIndex
                    ? 'bg-emerald-500'
                    : isDark ? 'bg-zinc-800' : 'bg-white'
                  }`}
              >
                <Ionicons
                  name="code-slash"
                  size={14}
                  color={idx === currentExerciseIndex ? '#FFFFFF' : isDark ? '#A1A1AA' : '#71717A'}
                />
                <Text className={`text-xs font-semibold ${idx === currentExerciseIndex
                    ? 'text-white'
                    : isDark ? 'text-zinc-300' : 'text-gray-700'
                  }`}>
                  {ex.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Exercise Info */}
      <View className={`px-4 py-3 ${isDark ? 'bg-zinc-800' : 'bg-gray-50'} border-b ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentExercise?.title}
            </Text>
            <Text className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`} numberOfLines={1}>
              {currentExercise?.description}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowHint(!showHint)}
            className="ml-3 px-3 py-1.5 rounded-full bg-amber-500/10"
          >
            <Text className="text-xs font-bold text-amber-600">Gợi ý</Text>
          </Pressable>
        </View>
        {showHint && (
          <View className={`mt-2 p-3 rounded-lg ${isDark ? 'bg-zinc-700' : 'bg-amber-50'}`}>
            <Text className={`text-xs ${isDark ? 'text-zinc-300' : 'text-amber-800'}`}>
              💡 Hàm cần có `return` để trả về kết quả. Ví dụ: `return a + b`
            </Text>
          </View>
        )}
      </View>

      {/* File Tabs */}
      {currentExercise && currentExercise.files.length > 1 && (
        <FileTabs
          files={currentExercise.files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          isDark={isDark}
        />
      )}

      {/* Code Editor */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View className={`flex-1 p-4 ${isDark ? 'bg-zinc-950' : 'bg-gray-900'}`}>
          {/* Line numbers + Code */}
          <View className="flex-1">
            {/* Code header */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <Ionicons name="code-slash" size={16} color="#10B981" />
                <Text className="text-zinc-400 text-xs font-medium">
                  {activeFile?.filename || 'solution.py'}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-zinc-500 text-[10px]">
                  {currentExercise?.language.display_name}
                </Text>
              </View>
            </View>

            {/* Code area */}
            <TextInput
              value={currentCode}
              onChangeText={handleCodeChange}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              textAlignVertical="top"
              className="flex-1 text-sm font-mono leading-6 text-green-400"
              placeholder="// Write your code here..."
              placeholderTextColor="#52525B"
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              }}
            />
          </View>
        </View>

        {/* Action buttons */}
        <View className={`px-4 py-3 flex-row items-center gap-3 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'} border-t`}>
          <Pressable
            onPress={handleReset}
            className={`px-4 py-2.5 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-white'}`}
          >
            <View className="flex-row items-center gap-2">
              <Feather name="rotate-ccw" size={16} color={isDark ? '#A1A1AA' : '#71717A'} />
              <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                Reset
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleRun}
            disabled={isRunning}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center ${isRunning ? 'bg-emerald-500/50' : 'bg-emerald-500'
              } shadow-lg shadow-emerald-500/30`}
          >
            <View className="flex-row items-center gap-2">
              {isRunning ? (
                <>
                  <View className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <Text className="text-white text-sm font-bold">Đang chạy...</Text>
                </>
              ) : (
                <>
                  <Feather name="play" size={16} color="#FFFFFF" />
                  <Text className="text-white text-sm font-bold">Chạy code</Text>
                </>
              )}
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Test Results */}
      {testResult && (
        <TestResults
          testcases={currentExercise?.testcases ?? []}
          testResult={testResult}
          isDark={isDark}
        />
      )}

      {/* Celebration */}
      <Celebration
        visible={showCelebration}
        type="code_pass"
        message="Code hoàn hảo!"
        subMessage="Tất cả test cases đều pass"
      />
    </View>
  )
}
