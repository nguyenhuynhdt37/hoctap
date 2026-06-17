import React, { useState } from 'react'
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'

interface ListItem {
  text: string
  icon?: string
}

interface Props {
  items: ListItem[]
  isDark: boolean
  maxVisible?: number
  bulletColor?: string
  bulletType?: 'dot' | 'icon'
}

export function ListSection({ items, isDark, maxVisible = 4, bulletColor = '#10B981', bulletType = 'dot' }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (!items?.length) return null

  const hasMore = items.length > maxVisible
  const visibleItems = expanded ? items : items.slice(0, maxVisible)

  return (
    <View className="gap-2">
      {visibleItems.map((item, i) => (
        <View key={i} className="flex-row items-start gap-2.5">
          {bulletType === 'icon' && item.icon ? (
            <Ionicons name={item.icon as any} size={16} color={bulletColor} className="mt-1" />
          ) : (
            <View className="mt-2">
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bulletColor }} />
            </View>
          )}
          <Text
            className={`text-sm flex-1 leading-relaxed ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}
            style={{ textAlign: 'justify' }}
          >
            {item.text}
          </Text>
        </View>
      ))}

      {hasMore && (
        <Pressable onPress={() => setExpanded(p => !p)} className="mt-1">
          <View className="flex-row items-center gap-1">
            <Text className="text-sm font-medium text-emerald-600">{expanded ? t('common.collapse') : t('common.view_more_count', { count: items.length - maxVisible })}</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#10B981" />
          </View>
        </Pressable>
      )}
    </View>
  )
}
