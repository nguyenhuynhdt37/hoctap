import React from 'react'
import {
  View,
  Image,
  Pressable,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

interface Course {
  id: string
  title: string
  thumbnail_url?: string | null
  description?: string | null
  instructor?: {
    fullname: string
    avatar?: string | null
  } | null
}

interface Props {
  course: Course
  message?: string
  isFavourite: boolean
  isTogglingFavourite?: boolean
  onToggleFavourite?: () => void
  isDark?: boolean
}

export function EmptyCourseView({
  course,
  message,
  isFavourite,
  isTogglingFavourite,
  onToggleFavourite,
  isDark = false,
}: Props) {
  const { t } = useTranslation()
  const router = useRouter()

  const features = [
    { icon: 'play-circle', title: 'Video HD' },
    { icon: 'checkmark-circle', title: t('course_detail.outcomes') },
    { icon: 'book', title: t('course_detail.curriculum') },
    { icon: 'star', title: t('course_detail.support_24_7') },
  ]

  return (
    <View className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      <View className="flex-1 p-6 justify-center">
        <View className="flex-row gap-5 items-center mb-10">
          {course.thumbnail_url && (
            <View className={`w-32 h-32 rounded-[32px] overflow-hidden border-4 ${isDark ? 'border-zinc-900' : 'border-white'} shadow-2xl`}>
              <Image
                source={{ uri: course.thumbnail_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute top-3 left-3 bg-white/90 px-3 py-1.5 rounded-full">
                <Text className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">{t('course_detail.building_course.developing')}</Text>
              </View>
            </View>
          )}

          <View className="flex-1">
            <Text className={`text-xl font-black leading-tight mb-2 tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`} numberOfLines={3}>
              {course.title}
            </Text>
            {course.description && (
              <Text className={`text-sm font-medium leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`} numberOfLines={2}>
                {course.description}
              </Text>
            )}
          </View>
        </View>

        <View className={`p-6 rounded-[32px] border ${isDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'} mb-10`}>
          <View className="flex-row items-start gap-4">
            <View className={`w-12 h-12 rounded-2xl items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500'}`}>
              <Ionicons name="construct" size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text className={`text-base font-black mb-2 tracking-tight ${isDark ? 'text-white' : 'text-emerald-900'}`}>
                {t('course_detail.building_course.title')}
              </Text>
              <Text className={`text-sm font-medium leading-relaxed ${isDark ? 'text-zinc-400' : 'text-emerald-800/70'}`}>
                {message || t('course_detail.building_course.default_message')}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-3 mb-10">
          {features.map((feature) => (
            <View
              key={feature.title}
              className={`flex-row items-center gap-3 px-4 py-3 rounded-2xl border ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}
            >
              <Ionicons name={feature.icon as any} size={14} color="#10B981" />
              <Text className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {feature.title}
              </Text>
            </View>
          ))}
        </View>

        <View className="gap-4">
          <Pressable
            onPress={() => router.push('/')}
            className="w-full py-4 rounded-2xl bg-emerald-600 shadow-xl shadow-emerald-500/20 items-center justify-center flex-row gap-3"
          >
            <Ionicons name="compass" size={18} color="white" />
            <Text className="text-white font-black uppercase tracking-widest text-xs">{t('course_detail.building_course.explore_others')}</Text>
          </Pressable>

          {onToggleFavourite && (
            <Pressable
              onPress={onToggleFavourite}
              disabled={isTogglingFavourite}
              className={`w-full py-4 rounded-2xl border-2 items-center justify-center flex-row gap-3 ${isFavourite ? 'bg-rose-500/10 border-rose-500/20' : 'bg-zinc-100 dark:bg-zinc-900 border-transparent'}`}
            >
              <Ionicons
                name={isFavourite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavourite ? '#F43F5E' : isDark ? '#52525b' : '#a1a1aa'}
              />
              <Text className={`text-xs font-black uppercase tracking-widest ${isFavourite ? 'text-rose-500' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {isTogglingFavourite ? t('common.processing') : isFavourite ? t('common.favourited') : t('common.favourite')}
              </Text>
            </Pressable>
          )}

          <Text className={`text-center text-[11px] font-bold uppercase tracking-widest leading-relaxed px-4 ${isDark ? 'text-zinc-700' : 'text-zinc-400'}`}>
            {t('course_detail.building_course.favourite_hint')}
          </Text>
        </View>
      </View>
    </View>
  )
}
