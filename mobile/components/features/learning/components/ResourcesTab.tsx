/**
 * Resources Tab - Tài liệu
 */

import React, { useState } from 'react'
import { View, ScrollView, Pressable, Linking, Alert, ActivityIndicator, useColorScheme } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Text } from '@/components/ui'
import type { LessonResource } from '../types'

interface ResourcesTabProps {
  resources: LessonResource[]
}

export function ResourcesTab({ resources }: ResourcesTabProps) {
  const isDark = useColorScheme() === 'dark'

  return (
    <View className="flex-1">
      {/* Header */}
      <View className={`px-5 py-4 flex-row items-center justify-between border-b ${
        isDark ? 'border-zinc-800' : 'border-zinc-100'
      }`}>
        <Text className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Tài liệu bài học</Text>
        <View className={`px-3 py-1.5 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <Text className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{resources.length} tài liệu</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          {/* Resources */}
          {resources.length === 0 ? (
            <EmptyResources isDark={isDark} />
          ) : (
            <View className="gap-3">
              {resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} isDark={isDark} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function EmptyResources({ isDark }: { isDark: boolean }) {
  return (
    <View className="items-center py-12">
      <View className={`w-16 h-16 rounded-full items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
        <Ionicons name="folder-open-outline" size={28} color={isDark ? '#52525B' : '#A1A1AA'} />
      </View>
      <Text className={`mt-4 font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Không có tài liệu</Text>
      <Text className="text-zinc-500 text-xs mt-1 text-center">
        Bài học này không có tài liệu đính kèm
      </Text>
    </View>
  )
}

function ResourceCard({ resource, isDark }: { resource: LessonResource; isDark: boolean }) {
  const [isDownloading, setIsDownloading] = useState(false)

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return ''
    const kb = bytes / 1024
    if (kb < 1024) return `${Math.round(kb)} KB`
    return `${Math.round(kb / 1024)} MB`
  }

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf': return 'document-text'
      case 'zip':
      case 'rar': return 'archive'
      case 'link': return 'link'
      case 'doc':
      case 'docx': return 'document-text'
      case 'xls':
      case 'xlsx': return 'grid'
      default: return 'document'
    }
  }

  const getIconColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf': return '#EF4444'
      case 'zip':
      case 'rar': return '#F59E0B'
      case 'link': return '#3B82F6'
      default: return '#10B981'
    }
  }

  const getBgColor = (type: string) => {
    if (isDark) {
      switch (type?.toLowerCase()) {
        case 'pdf': return 'bg-red-500/10'
        case 'zip': return 'bg-amber-500/10'
        case 'link': return 'bg-blue-500/10'
        default: return 'bg-emerald-500/10'
      }
    }
    switch (type?.toLowerCase()) {
      case 'pdf': return 'bg-red-50'
      case 'zip': return 'bg-amber-50'
      case 'link': return 'bg-blue-50'
      default: return 'bg-emerald-50'
    }
  }

  const handleDownload = async () => {
    if (!resource.url) {
      Alert.alert('Lỗi', 'Không tìm thấy liên kết tải tài liệu')
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Kiểm tra nếu là link Google Drive (thường là link view, không download trực tiếp được qua FileSystem)
    const isGoogleDrive = resource.url.includes('drive.google.com')
    
    // Nếu là link hoặc là Google Drive thì mở browser
    if (resource.resource_type === 'link' || isGoogleDrive) {
      Linking.openURL(resource.url).catch(() => {
        Alert.alert('Lỗi', 'Không thể mở liên kết')
      })
      return
    }

    try {
      setIsDownloading(true)
      
      const fileName = resource.title || `document_${resource.id.slice(0, 8)}`
      const fileUri = FileSystem.cacheDirectory + fileName

      const downloadResumable = FileSystem.createDownloadResumable(
        resource.url,
        fileUri,
        {},
        (downloadProgress) => {
          // Progress tracking could be added here
        }
      )

      const result = await downloadResumable.downloadAsync()
      
      if (result && result.uri) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri)
        } else {
          Alert.alert('Thành công', 'Đã tải tài liệu xuống thiết bị')
        }
      }
    } catch (error) {
      console.error('Download error:', error)
      Alert.alert('Lỗi', 'Không thể tải tài liệu. Vui lòng thử lại sau.')
    } finally {
      setIsDownloading(false)
    }
  }

  const iconName = getFileIcon(resource.resource_type) as keyof typeof Ionicons.glyphMap

  return (
    <Pressable
      onPress={handleDownload}
      disabled={isDownloading}
      className={`flex-row items-center p-4 rounded-3xl border ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'
      } ${isDownloading ? 'opacity-70' : ''}`}
    >
      {/* Icon */}
      <View className={`w-14 h-14 rounded-2xl items-center justify-center ${getBgColor(resource.resource_type)}`}>
        {isDownloading ? (
          <ActivityIndicator size="small" color={getIconColor(resource.resource_type)} />
        ) : (
          <Ionicons name={iconName} size={26} color={getIconColor(resource.resource_type)} />
        )}
      </View>

      {/* Info */}
      <View className="flex-1 ml-4">
        <Text className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`} numberOfLines={2}>
          {resource.title}
        </Text>
        <View className="flex-row items-center mt-1.5">
          <View className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <Text className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {resource.resource_type}
            </Text>
          </View>
          {resource.file_size > 0 && (
            <>
              <View className="w-1 h-1 rounded-full bg-zinc-400 mx-2" />
              <Text className="text-xs text-zinc-500">{formatSize(resource.file_size)}</Text>
            </>
          )}
        </View>
      </View>

      {/* Download Action */}
      <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
        <Ionicons 
          name={resource.resource_type === 'link' ? 'open-outline' : 'download-outline'} 
          size={18} 
          color={isDark ? '#71717A' : '#71717A'} 
        />
      </View>
    </Pressable>
  )
}
