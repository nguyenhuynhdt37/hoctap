import React, { useState } from 'react'
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'

interface Props {
  content: string
  isDark: boolean
  maxLines?: number
}

export function ExpandableDescription({ content, isDark, maxLines = 7 }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (!content) return null

  const cleaned = content.replace(/[#*_`]/g, '').trim()

  return (
    <View>
      <Text
        className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}
        numberOfLines={expanded ? undefined : maxLines}
        style={{ textAlign: 'justify' }}
      >
        {cleaned}
      </Text>

      <Pressable onPress={() => setExpanded(!expanded)} className="flex-row items-center gap-1 mt-2">
        <Text className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {expanded ? t('common.collapse') : t('common.view_more')}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#10B981" />
      </Pressable>
    </View>
  )
}
