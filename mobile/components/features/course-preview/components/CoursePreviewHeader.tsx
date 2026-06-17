import React from 'react'
import { View, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { BackButton } from '@/components/ui/BackButton'

interface CoursePreviewHeaderProps {
  isDark: boolean
}

export function CoursePreviewHeader({ isDark }: CoursePreviewHeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <View
      className={`flex-row items-center justify-between border-b ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-gray-200 bg-white'
        }`}
      style={{ paddingTop: insets.top + 14, paddingBottom: 14, paddingHorizontal: 20 }}
    >
      <BackButton />

      {/* Title */}
      <Text
        className={`text-lg font-bold flex-1 text-center px-4 ${isDark ? 'text-white' : 'text-gray-900'
          }`}
        numberOfLines={1}
      >
        Xem trước khóa học
      </Text>

      {/* Placeholder để cân bằng layout */}
      <View className="w-11 h-11 rounded-2xl" />
    </View>
  )
}
