import React from 'react'
import { Platform, Pressable, TextInput, View } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import type { CodeExercise, CodeFile } from '../../types/code-lesson'
import { FileTabs } from './FileTabs'

interface CodeEditorPanelProps {
  exercise: CodeExercise
  files: CodeFile[]
  activeFileId: string | null
  activeFile?: CodeFile
  currentCode: string
  isDark: boolean
  isRunning: boolean
  onSelectFile: (fileId: string) => void
  onCodeChange: (text: string) => void
  onRun: () => void
  onReset: () => void
}

export function CodeEditorPanel({
  exercise,
  files,
  activeFileId,
  activeFile,
  currentCode,
  isDark,
  isRunning,
  onSelectFile,
  onCodeChange,
  onRun,
  onReset,
}: CodeEditorPanelProps) {
  return (
    <View className={`overflow-hidden rounded-2xl border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'}`}>
      <View className={`border-b px-4 py-3 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-emerald-50 border-gray-200'}`}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
              {exercise.title || 'Luyện tập code'}
            </Text>
            <Text className={`mt-1 text-xs ${isDark ? 'text-zinc-400' : 'text-gray-600'}`} numberOfLines={1}>
              {exercise.language.name} {exercise.language.version}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={onReset}
              className={`h-9 flex-row items-center gap-1.5 rounded-lg px-3 ${isDark ? 'bg-zinc-800' : 'bg-white'}`}
            >
              <Feather name="rotate-ccw" size={14} color={isDark ? '#A1A1AA' : '#4B5563'} />
              <Text className={`text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>Reset</Text>
            </Pressable>
            <Pressable
              onPress={onRun}
              disabled={isRunning || !files.length}
              className={`h-9 flex-row items-center gap-1.5 rounded-lg px-3 ${
                isRunning ? 'bg-emerald-500/50' : 'bg-emerald-500'
              }`}
            >
              <Feather name={isRunning ? 'loader' : 'play'} size={14} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white">{isRunning ? 'Đang chạy' : 'Run'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {files.length > 0 && (
        <FileTabs
          files={files}
          activeFileId={activeFileId}
          onSelectFile={onSelectFile}
          isDark={isDark}
        />
      )}

      <View className={`${isDark ? 'bg-zinc-950' : 'bg-gray-950'}`}>
        <View className="flex-row items-center justify-between border-b border-zinc-800 px-4 py-2">
          <View className="flex-row items-center gap-2">
            <Ionicons name="code-slash" size={15} color="#10B981" />
            <Text className="text-xs font-medium text-zinc-300">
              {activeFile?.filename || 'No file selected'}
            </Text>
            {activeFile?.role === 'starter' && (
              <View className="rounded bg-amber-500/20 px-1.5 py-0.5">
                <Text className="text-[9px] font-bold text-amber-300">Starter</Text>
              </View>
            )}
            {activeFile?.is_main && (
              <View className="rounded bg-emerald-500/20 px-1.5 py-0.5">
                <Text className="text-[9px] font-bold text-emerald-300">main</Text>
              </View>
            )}
          </View>
        </View>

        <TextInput
          value={currentCode}
          onChangeText={onCodeChange}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textAlignVertical="top"
          editable={!activeFile?.is_readonly}
          className="min-h-[420px] px-4 py-3 font-mono text-sm leading-6 text-green-300"
          placeholder="// Write your code here..."
          placeholderTextColor="#52525B"
          style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
        />
      </View>
    </View>
  )
}
