import React from 'react'
import {
  View,
  Pressable,
  ScrollView,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { Feather, Ionicons } from '@expo/vector-icons'

interface CategoryItem {
  id: string
  name: string
  slug: string
}

interface Props {
  categories: CategoryItem[]
  isDark?: boolean
}

export function RelatedTopicsSection({ categories, isDark = false }: Props) {
  const { t } = useTranslation()
  if (!categories || categories.length === 0) return null

  return (
    <View className={`mt-5 p-6 rounded-[32px] border ${isDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'}`}>
      <View className="flex-row items-center gap-4 mb-6">
        <View className={`w-10 h-10 rounded-2xl items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500'}`}>
          <Ionicons name="compass" size={20} color="white" />
        </View>
        <Text className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-emerald-900'}`}>
          {t('course_detail.related_topics')}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => { }}
            className={`flex-row items-center gap-3 px-5 py-4 rounded-[24px] border ${isDark ? 'bg-zinc-950 border-white/5' : 'bg-white border-zinc-100 shadow-sm shadow-zinc-200/50'}`}
          >
            <View className={`w-8 h-8 rounded-xl items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <Ionicons name="leaf" size={14} color="#10B981" />
            </View>
            <Text
              className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable className="mt-6 flex-row items-center justify-center gap-2">
        <Text className="text-emerald-600 text-[11px] font-black uppercase tracking-widest">
          {t('common.view_all')}
        </Text>
        <Ionicons name="arrow-forward" size={12} color="#10B981" />
      </Pressable>
    </View>
  )
}
