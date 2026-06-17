/**
 * File Tabs Component
 * Tab bar cho multiple files trong code editor
 */

import React from 'react'
import { View, ScrollView, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import type { CodeFile } from '../../types/code-lesson'

interface FileTabsProps {
  files: CodeFile[]
  activeFileId: string | null
  onSelectFile: (fileId: string) => void
  isDark: boolean
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'py': return 'file-text'
    case 'js': return 'file'
    case 'ts': return 'file'
    case 'json': return 'file'
    case 'md': return 'file-text'
    case 'html': return 'globe'
    case 'css': return 'eye'
    default: return 'file'
  }
}

export function FileTabs({ files, activeFileId, onSelectFile, isDark }: FileTabsProps) {
  return (
    <View className={`flex-row ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'} border-b`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
        <View className="flex-row">
          {files.map(file => {
            const isActive = file.id === activeFileId
            return (
              <Pressable
                key={file.id}
                onPress={() => onSelectFile(file.id)}
                className={`px-4 py-2.5 flex-row items-center gap-2 border-b-2 ${isActive
                    ? 'border-emerald-500'
                    : 'border-transparent'
                  }`}
              >
                <Feather
                  name={getFileIcon(file.filename) as any}
                  size={14}
                  color={isActive ? '#10B981' : isDark ? '#71717A' : '#9CA3AF'}
                />
                <Text className={`text-xs font-medium ${isActive
                    ? 'text-emerald-600'
                    : isDark ? 'text-zinc-400' : 'text-gray-500'
                  }`}>
                  {file.filename}
                </Text>
                {file.is_main && (
                  <View className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                    <Text className="text-[9px] font-bold text-emerald-600">main</Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
