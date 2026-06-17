import React, { memo, useState, useCallback } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import { cn } from '@/src/lib/utils'
import type { CategoryCardProps } from '../types'

export const CategoryCard = memo(function CategoryCard({
  category,
  onPress,
  onChildPress,
  isExpanded: controlledExpanded,
  onToggle,
}: CategoryCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isExpanded = controlledExpanded ?? internalExpanded

  const children = category.parent_reverse ?? []

  const handleToggle = useCallback(() => {
    if (children.length === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onPress?.(category)
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (onToggle) {
      onToggle()
    } else {
      setInternalExpanded(prev => !prev)
    }
  }, [children.length, onPress, category, onToggle])

  const handleChildPress = useCallback((child: { id: string; name: string; slug: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onChildPress?.(child)
  }, [onChildPress])

  return (
    <View className="mb-2">
      <Pressable
        onPress={handleToggle}
        className={cn(
          'flex-row items-center justify-between px-4 py-4 rounded-xl',
          'bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800'
        )}
      >
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            {category.name}
          </Text>
          {children.length > 0 && (
            <Text className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
              {children.length} danh mục con
            </Text>
          )}
        </View>

        <View className="flex-row items-center gap-2">
          {children.length > 0 && (
            <View className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center">
              <Feather
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#6B7280"
              />
            </View>
          )}
          {children.length === 0 && (
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          )}
        </View>
      </Pressable>

      {/* Children */}
      {isExpanded && children.length > 0 && (
        <View className="mt-2 ml-4">
          {children.map((child) => (
            <Pressable
              key={child.id}
              onPress={() => handleChildPress(child)}
              className={cn(
                'flex-row items-center justify-between px-4 py-3 rounded-xl mb-1.5',
                'bg-gray-50 dark:bg-zinc-800'
              )}
            >
              <Text className="text-sm text-gray-700 dark:text-zinc-300 flex-1">
                {child.name}
              </Text>
              <Feather name="chevron-right" size={16} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
})

// ── Simple Category Item ────────────────────────────────────────────────────────
interface CategoryItemProps {
  item: { id: string; name: string; slug: string }
  onPress?: (item: { id: string; name: string; slug: string }) => void
  isDark?: boolean
}

export const CategoryItem = memo(function CategoryItem({
  item,
  onPress,
  isDark = false,
}: CategoryItemProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress?.(item)
  }, [item, onPress])

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        'flex-row items-center justify-between px-4 py-4 rounded-xl mb-2',
        'bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800'
      )}
    >
      <Text className={cn('text-base font-medium', isDark ? 'text-white' : 'text-gray-900')}>
        {item.name}
      </Text>
      <Feather name="chevron-right" size={18} color="#9CA3AF" />
    </Pressable>
  )
})
