/**
 * Resources Modal Component
 * Hiển thị danh sách tài nguyên bài học
 */

import React from 'react'
import { View, Modal, Pressable, ScrollView, Linking, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import type { LessonResource } from '../types'

interface ResourcesModalProps {
  visible: boolean
  onClose: () => void
  resources: LessonResource[]
  lessonTitle?: string
  isDark: boolean
}

function getResourceIcon(type: string) {
  const t = type?.toLowerCase() || 'file'
  switch (t) {
    case 'pdf': return { icon: 'file-text' as const, color: '#EF4444' }
    case 'link':
    case 'url': return { icon: 'link' as const, color: '#3B82F6' }
    case 'image':
    case 'jpg':
    case 'jpeg':
    case 'png': return { icon: 'image' as const, color: '#8B5CF6' }
    case 'zip':
    case 'archive': return { icon: 'download' as const, color: '#F59E0B' }
    default: return { icon: 'file' as const, color: '#10B981' }
  }
}

function getResourceLabel(type: string) {
  const t = type?.toLowerCase() || 'file'
  const labels: Record<string, string> = {
    pdf: 'PDF', link: 'Liên kết', url: 'Liên kết',
    image: 'Hình ảnh', jpg: 'Hình ảnh', jpeg: 'Hình ảnh', png: 'Hình ảnh',
    zip: 'ZIP', file: 'File',
  }
  return labels[t] || 'File'
}

function formatSize(bytes?: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function ResourcesModal({
  visible,
  onClose,
  resources,
  lessonTitle,
  isDark,
}: ResourcesModalProps) {
  const handleDownload = async (resource: LessonResource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      if (resource.file_url) {
        await Linking.openURL(resource.file_url)
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở tài nguyên')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50" onTouchEnd={onClose}>
        <View />
        <Pressable className={`${isDark ? 'bg-zinc-900' : 'bg-white'} rounded-t-3xl max-h-[70vh]`} onPress={() => { }}>
          {/* Handle bar */}
          <View className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-4" />

          {/* Header */}
          <View className={`px-5 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Tài nguyên bài học
                </Text>
                {lessonTitle && (
                  <Text className={`text-xs mt-0.5 text-emerald-600`} numberOfLines={1}>{lessonTitle}</Text>
                )}
              </View>
              <Pressable onPress={onClose} className="w-10 h-10 rounded-full items-center justify-center bg-gray-100 dark:bg-zinc-800">
                <Feather name="x" size={20} color={isDark ? '#A1A1AA' : '#71717A'} />
              </Pressable>
            </View>
          </View>

          {/* Content */}
          <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
            {resources.length === 0 ? (
              <View className="items-center py-12">
                <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                  <Feather name="file" size={32} color={isDark ? '#52525B' : '#9CA3AF'} />
                </View>
                <Text className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Không có tài nguyên</Text>
              </View>
            ) : (
              <View className="gap-3">
                {resources.map(res => {
                  const { icon, color } = getResourceIcon(res.file_type)
                  return (
                    <Pressable
                      key={res.id}
                      onPress={() => handleDownload(res)}
                      className={`flex-row items-center p-4 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-100'}`}
                    >
                      <View className={`w-12 h-12 rounded-xl items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
                        <Feather name={icon} size={22} color={color} />
                      </View>
                      <View className="flex-1 ml-3 mr-2">
                        <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
                          {res.title}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <View className={`px-2 py-0.5 rounded ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`}>
                            <Text className={`text-[10px] font-bold ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                              {getResourceLabel(res.file_type)}
                            </Text>
                          </View>
                          {formatSize(res.file_size) && (
                            <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{formatSize(res.file_size)}</Text>
                          )}
                        </View>
                      </View>
                      <View className="w-10 h-10 rounded-xl bg-emerald-500 items-center justify-center shadow-sm shadow-emerald-500/40">
                        <Feather name="download" size={18} color="#FFFFFF" />
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View className={`px-5 py-4 border-t ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
            <Pressable
              onPress={onClose}
              className="py-3.5 rounded-xl bg-emerald-500 items-center shadow-lg shadow-emerald-500/30"
            >
              <Text className="text-white text-sm font-bold">Đóng</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  )
}
