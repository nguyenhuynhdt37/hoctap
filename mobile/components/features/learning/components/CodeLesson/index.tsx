/**
 * Code Lesson Component
 * Mobile port of the web Study FE code lesson flow.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import type { Lesson } from '../../types'
import type { CodeExercise, CodeFile, CodeLessonTestResult } from '../../types/code-lesson'
import { learningService } from '../../services/learning.service'
import { Celebration } from '../Celebration'
import { CodeEditorPanel } from './CodeEditorPanel'
import { CodeLessonTabs, type CodeLessonPanel } from './CodeLessonTabs'
import { CodeProblemPanel } from './CodeProblemPanel'
import { CodeResultPanel } from './CodeResultPanel'
import { TestCasesPanel } from './TestCasesPanel'

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
  const [activePanel, setActivePanel] = useState<CodeLessonPanel>('problem')
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
    setActivePanel('problem')
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
      setActivePanel('results')

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
    setActivePanel('problem')
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
                    Bài {index + 1}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      </View>

      {currentExercise && (
        <View className={`border-b px-4 py-4 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'}`}>
          <Text className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {currentExercise.title}
          </Text>
          <Text className={`mt-1 text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
            {currentExercise.language.name} {currentExercise.language.version} • {difficultyLabel(currentExercise.difficulty)}
          </Text>
          <View className="mt-4">
            <CodeLessonTabs activePanel={activePanel} onChange={setActivePanel} isDark={isDark} />
          </View>
        </View>
      )}

      {currentExercise && (
        <View className="p-4">
          {activePanel === 'problem' && (
            <CodeProblemPanel
              exercise={currentExercise}
              isDark={isDark}
              formatLimitMs={formatLimitMs}
              formatMemory={formatMemory}
              difficultyLabel={difficultyLabel}
            />
          )}

          {activePanel === 'code' && (
            <CodeEditorPanel
              exercise={currentExercise}
              files={currentUserFiles}
              activeFileId={activeFileId}
              activeFile={activeFile}
              currentCode={currentCode}
              isDark={isDark}
              isRunning={isRunning}
              onSelectFile={setActiveFileId}
              onCodeChange={handleCodeChange}
              onRun={handleRun}
              onReset={handleReset}
            />
          )}

          {activePanel === 'testcases' && (
            <TestCasesPanel testcases={currentExercise.testcases ?? []} isDark={isDark} />
          )}

          {activePanel === 'results' && (
            <CodeResultPanel
              testcases={currentExercise.testcases ?? []}
              testResult={testResult}
              isDark={isDark}
            />
          )}
        </View>
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
