/**
 * Code Lesson Component
 * Mobile port of the web Study FE code lesson flow.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import { MarkdownRenderer } from '@/components/editor/MarkdownRenderer'
import type { Lesson } from '../../types'
import type { CodeExercise, CodeFile, CodeLessonTestResult } from '../../types/code-lesson'
import { learningService } from '../../services/learning.service'
import { FileTabs } from './FileTabs'
import { TestResults } from './TestResults'
import { Celebration } from '../Celebration'

interface CodeLessonProps {
  lesson: Lesson
  isDark: boolean
  isCompleted: boolean
  onMarkCompleted: (lessonId: string) => void
}

function normalizeExercise(exercise: CodeExercise, index: number): CodeExercise {
  return {
    ...exercise,
    order: exercise.order ?? index + 1,
    is_pass: exercise.is_pass ?? false,
    files: (exercise.files ?? []).map(file => ({
      ...file,
      language: file.language ?? exercise.language,
    })),
    testcases: [...(exercise.testcases ?? [])].sort((a, b) => {
      return (a.order_index ?? 0) - (b.order_index ?? 0)
    }),
  }
}

function formatLimitMs(value?: number): string {
  if (!value) return '2.00s'
  return value >= 100 ? `${(value / 1000).toFixed(2)}s` : `${value.toFixed(2)}s`
}

function formatMemory(value?: number): string {
  if (!value) return '256 MB'
  return `${(value / (1024 * 1024)).toFixed(0)} MB`
}

function difficultyLabel(value?: string): string {
  switch (value) {
    case 'easy':
      return 'Dễ'
    case 'medium':
      return 'Trung bình'
    case 'hard':
      return 'Khó'
    default:
      return 'Code'
  }
}

export function CodeLesson({ lesson, isDark, isCompleted, onMarkCompleted }: CodeLessonProps) {
  const exercises = useMemo(() => {
    return (lesson.codes ?? []).map(normalizeExercise)
  }, [lesson])

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [userFiles, setUserFiles] = useState<Record<string, Record<string, string>>>({})
  const [initialFileContents, setInitialFileContents] = useState<Record<string, Record<string, string>>>({})
  const [savedFileContents, setSavedFileContents] = useState<Record<string, Record<string, string>>>({})
  const [isRunning, setIsRunning] = useState(false)
  const [testResult, setTestResult] = useState<CodeLessonTestResult | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showInfo, setShowInfo] = useState(true)
  const [exercisePassStatus, setExercisePassStatus] = useState<Record<string, boolean>>({})
  const prevFileIdRef = useRef<string | null>(null)
  const isSavingRef = useRef(false)
  const hasCalledCompleteRef = useRef(false)

  useEffect(() => {
    setCurrentExerciseIndex(0)
    setActiveFileId(null)
    setUserFiles({})
    setInitialFileContents({})
    setSavedFileContents({})
    setTestResult(null)
    hasCalledCompleteRef.current = false
  }, [lesson.id])

  useEffect(() => {
    if (exercises.length === 0) return
    const initialStatus: Record<string, boolean> = {}
    exercises.forEach(exercise => {
      initialStatus[exercise.id] = exercise.is_pass ?? false
    })
    setExercisePassStatus(prev => ({ ...initialStatus, ...prev }))
  }, [exercises])

  const exercisesWithPassStatus = useMemo(() => {
    return exercises.map(exercise => ({
      ...exercise,
      is_pass: exercisePassStatus[exercise.id] ?? exercise.is_pass ?? false,
    }))
  }, [exercises, exercisePassStatus])

  const currentExercise = exercisesWithPassStatus[currentExerciseIndex]
  const activeFiles = useMemo(() => currentExercise?.files ?? [], [currentExercise])

  useEffect(() => {
    if (!currentExercise || userFiles[currentExercise.id]) return

    const initialFiles: Record<string, string> = {}
    currentExercise.files.forEach(file => {
      initialFiles[file.id] = file.content
    })

    setUserFiles(prev => ({ ...prev, [currentExercise.id]: initialFiles }))
    setInitialFileContents(prev => ({ ...prev, [currentExercise.id]: { ...initialFiles } }))
    setSavedFileContents(prev => ({ ...prev, [currentExercise.id]: { ...initialFiles } }))
  }, [currentExercise, userFiles])

  const currentUserFiles = useMemo<CodeFile[]>(() => {
    if (!currentExercise) return []
    const exerciseId = currentExercise.id
    const contents = userFiles[exerciseId]
    if (!contents) return activeFiles

    return activeFiles.map(file => ({
      ...file,
      content: contents[file.id] ?? file.content,
    }))
  }, [activeFiles, currentExercise, userFiles])

  useEffect(() => {
    if (!currentExercise || currentUserFiles.length === 0) return
    const mainFile = currentUserFiles.find(file => file.is_main) || currentUserFiles[0]
    setActiveFileId(currentId => {
      return currentId && currentUserFiles.some(file => file.id === currentId)
        ? currentId
        : mainFile.id
    })
  }, [currentExercise, currentUserFiles])

  const activeFile = currentUserFiles.find(file => file.id === activeFileId)
  const currentCode = activeFile?.content ?? ''
  const passPercent = testResult && testResult.total > 0
    ? Math.round((testResult.passed / testResult.total) * 100)
    : 0

  const saveFile = useCallback(async (
    exerciseId: string,
    filename: string,
    content: string,
    isMain: boolean
  ) => {
    await learningService.saveCodeFile(exerciseId, {
      filename,
      content,
      is_main: isMain,
    })
    setExercisePassStatus(prev => ({ ...prev, [exerciseId]: false }))
    setTestResult(null)
  }, [])

  const saveCurrentFileIfChanged = useCallback(async () => {
    if (isSavingRef.current || !activeFileId || !currentExercise) return

    const file = currentUserFiles.find(item => item.id === activeFileId)
    if (!file) return

    const exerciseId = currentExercise.id
    const savedContent = savedFileContents[exerciseId]?.[activeFileId] ?? ''
    const currentContent = userFiles[exerciseId]?.[activeFileId] ?? ''

    if (currentContent === savedContent || currentContent.trim() === '') return

    isSavingRef.current = true
    try {
      await saveFile(exerciseId, file.filename, currentContent, file.is_main)
      setSavedFileContents(prev => ({
        ...prev,
        [exerciseId]: {
          ...prev[exerciseId],
          [activeFileId]: currentContent,
        },
      }))
    } catch (error) {
      console.error('Lỗi khi lưu file:', error)
    } finally {
      isSavingRef.current = false
    }
  }, [activeFileId, currentExercise, currentUserFiles, savedFileContents, saveFile, userFiles])

  useEffect(() => {
    if (prevFileIdRef.current && prevFileIdRef.current !== activeFileId) {
      const oldFileId = prevFileIdRef.current
      const oldFile = currentUserFiles.find(file => file.id === oldFileId)

      if (oldFile && currentExercise && !isSavingRef.current) {
        const exerciseId = currentExercise.id
        const savedContent = savedFileContents[exerciseId]?.[oldFileId] ?? ''
        const currentContent = userFiles[exerciseId]?.[oldFileId] ?? ''

        if (currentContent !== savedContent && currentContent.trim() !== '') {
          isSavingRef.current = true
          saveFile(exerciseId, oldFile.filename, currentContent, oldFile.is_main)
            .then(() => {
              setSavedFileContents(prev => ({
                ...prev,
                [exerciseId]: {
                  ...prev[exerciseId],
                  [oldFileId]: currentContent,
                },
              }))
            })
            .catch(error => {
              console.error('Lỗi khi lưu file:', error)
            })
            .finally(() => {
              isSavingRef.current = false
            })
        }
      }
    }
    prevFileIdRef.current = activeFileId
  }, [activeFileId, currentExercise, currentUserFiles, savedFileContents, saveFile, userFiles])

  useEffect(() => {
    if (exercisesWithPassStatus.length === 0 || hasCalledCompleteRef.current) return

    const allExercisesPassed = exercisesWithPassStatus.every(exercise => exercise.is_pass === true)
    if (!allExercisesPassed || isCompleted) return

    hasCalledCompleteRef.current = true
    setShowCelebration(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onMarkCompleted(lesson.id)
    setTimeout(() => setShowCelebration(false), 3000)
  }, [exercisesWithPassStatus, isCompleted, lesson.id, onMarkCompleted])

  const handleCodeChange = useCallback((text: string) => {
    if (!activeFile || !currentExercise) return
    setUserFiles(prev => ({
      ...prev,
      [currentExercise.id]: {
        ...prev[currentExercise.id],
        [activeFile.id]: text,
      },
    }))
  }, [activeFile, currentExercise])

  const handleRun = useCallback(async () => {
    if (!currentExercise || currentUserFiles.length === 0) return

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await saveCurrentFileIfChanged()
    setIsRunning(true)
    setTestResult(null)

    try {
      const response = await learningService.testCodeExercise(currentExercise.id, {
        language_id: currentExercise.language.id,
        files: currentUserFiles.map(file => ({
          filename: file.filename,
          content: file.content || '',
          is_main: file.is_main,
        })),
      })

      setTestResult(response)

      const nextPassPercent = response.total > 0
        ? Math.round((response.passed / response.total) * 100)
        : 0

      if (nextPassPercent >= 85) {
        setExercisePassStatus(prev => ({ ...prev, [currentExercise.id]: true }))
      }

      Haptics.notificationAsync(
        nextPassPercent >= 85
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      )
    } catch (error: any) {
      console.error('Lỗi khi test code:', error)
      const message = error?.response?.data?.detail || error?.message || 'Không thể chạy code. Vui lòng thử lại.'
      Alert.alert('Lỗi', String(message))
    } finally {
      setIsRunning(false)
    }
  }, [currentExercise, currentUserFiles, saveCurrentFileIfChanged])

  const handleReset = useCallback(() => {
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
            const exerciseId = currentExercise.id
            const initialContents = initialFileContents[exerciseId] || {}
            const resetFiles: Record<string, string> = {}
            activeFiles.forEach(file => {
              resetFiles[file.id] = initialContents[file.id] ?? file.content
            })
            setUserFiles(prev => ({ ...prev, [exerciseId]: resetFiles }))
            setSavedFileContents(prev => ({ ...prev, [exerciseId]: { ...resetFiles } }))
            setExercisePassStatus(prev => ({ ...prev, [exerciseId]: false }))
            setTestResult(null)
          },
        },
      ]
    )
  }, [activeFile, activeFiles, currentExercise, initialFileContents])

  const handleSelectExercise = useCallback((index: number) => {
    saveCurrentFileIfChanged()
    setCurrentExerciseIndex(index)
    setActiveFileId(null)
    setTestResult(null)
  }, [saveCurrentFileIfChanged])

  if (exercisesWithPassStatus.length === 0) {
    return (
      <View className={`m-5 p-6 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        <Text className="text-zinc-500 text-center">Không có bài tập code nào trong bài học này.</Text>
      </View>
    )
  }

  return (
    <View className="flex-1">
      <View className={`px-4 py-3 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'} border-b`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {exercisesWithPassStatus.map((exercise, index) => {
              const active = index === currentExerciseIndex
              const passed = exercise.is_pass === true
              return (
                <Pressable
                  key={exercise.id}
                  onPress={() => handleSelectExercise(index)}
                  className={`px-4 py-2 rounded-full flex-row items-center gap-2 ${
                    active ? 'bg-emerald-500' : isDark ? 'bg-zinc-800' : 'bg-white'
                  }`}
                >
                  <Ionicons
                    name={passed ? 'checkmark-circle' : 'code-slash'}
                    size={14}
                    color={active ? '#FFFFFF' : passed ? '#10B981' : isDark ? '#A1A1AA' : '#71717A'}
                  />
                  <Text
                    numberOfLines={1}
                    className={`text-xs font-semibold ${
                      active ? 'text-white' : isDark ? 'text-zinc-300' : 'text-gray-700'
                    }`}
                  >
                    {exercise.title}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      </View>

      {currentExercise && (
        <View className={`px-4 py-3 ${isDark ? 'bg-zinc-800' : 'bg-gray-50'} border-b ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {currentExercise.title}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-emerald-500/10 px-2.5 py-1">
                  <Text className="text-[10px] font-bold text-emerald-600">
                    {currentExercise.language.name} {currentExercise.language.version}
                  </Text>
                </View>
                <View className="rounded-full bg-amber-500/10 px-2.5 py-1">
                  <Text className="text-[10px] font-bold text-amber-600">
                    {formatLimitMs(currentExercise.time_limit)}
                  </Text>
                </View>
                <View className="rounded-full bg-sky-500/10 px-2.5 py-1">
                  <Text className="text-[10px] font-bold text-sky-600">
                    {formatMemory(currentExercise.memory_limit)}
                  </Text>
                </View>
                <View className="rounded-full bg-zinc-500/10 px-2.5 py-1">
                  <Text className={`text-[10px] font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {difficultyLabel(currentExercise.difficulty)}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={() => setShowInfo(prev => !prev)}
              className={`px-3 py-1.5 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-white'}`}
            >
              <Text className={`text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                {showInfo ? 'Ẩn mô tả' : 'Mô tả'}
              </Text>
            </Pressable>
          </View>

          {showInfo && (
            <View className={`mt-3 rounded-xl border p-3 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}`}>
              {currentExercise.description ? (
                <MarkdownRenderer content={currentExercise.description} />
              ) : (
                <Text className="text-xs italic text-zinc-500">Chưa có mô tả</Text>
              )}
              {testResult && (
                <View className={`mt-3 rounded-lg p-3 ${isDark ? 'bg-emerald-950/20' : 'bg-emerald-50'}`}>
                  <Text className="text-xs font-bold text-emerald-600">
                    Kết quả: {testResult.passed}/{testResult.total} passed ({passPercent}%)
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {currentExercise && currentExercise.files.length > 1 && (
        <FileTabs
          files={currentUserFiles}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          isDark={isDark}
        />
      )}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View className={`flex-1 p-4 ${isDark ? 'bg-zinc-950' : 'bg-gray-900'}`}>
          <View className="flex-1">
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="code-slash" size={16} color="#10B981" />
                <Text className="text-xs font-medium text-zinc-400">
                  {activeFile?.filename || 'solution'}
                </Text>
                {activeFile?.is_main && (
                  <View className="rounded bg-emerald-500/20 px-1.5 py-0.5">
                    <Text className="text-[9px] font-bold text-emerald-400">main</Text>
                  </View>
                )}
              </View>
              <Text className="text-[10px] text-zinc-500">
                {currentExercise?.language.name}
              </Text>
            </View>

            <TextInput
              value={currentCode}
              onChangeText={handleCodeChange}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              textAlignVertical="top"
              className="flex-1 font-mono text-sm leading-6 text-green-400"
              placeholder="// Write your code here..."
              placeholderTextColor="#52525B"
              style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
            />
          </View>
        </View>

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
            disabled={isRunning || !currentExercise}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
              isRunning ? 'bg-emerald-500/50' : 'bg-emerald-500'
            } shadow-lg shadow-emerald-500/30`}
          >
            <View className="flex-row items-center gap-2">
              <Feather name={isRunning ? 'loader' : 'play'} size={16} color="#FFFFFF" />
              <Text className="text-white text-sm font-bold">
                {isRunning ? 'Đang chạy...' : 'Chạy code'}
              </Text>
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {testResult && (
        <TestResults
          testcases={currentExercise?.testcases ?? []}
          testResult={testResult}
          isDark={isDark}
        />
      )}

      <Celebration
        visible={showCelebration}
        type="code_pass"
        message="Code hoàn hảo!"
        subMessage="Tất cả bài tập đều đã pass"
      />
    </View>
  )
}
