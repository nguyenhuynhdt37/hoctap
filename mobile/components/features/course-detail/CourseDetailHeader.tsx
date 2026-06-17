import React from 'react'
import {
  View,
  Image,
  Pressable,
  ScrollView,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { Feather, Ionicons } from '@expo/vector-icons'
import { formatDate } from '@/src/utils/format'

interface CategoryChain {
  id: string
  name: string
  slug: string
}

interface Props {
  course: {
    title: string
    rating: number | null
    rating_count: number
    total_enrolls: number
    level: string | null
    thumbnail_url: string | null
    instructor: { fullname: string; avatar: string | null } | null
    last_updated: string | null
    language: string | null
  }
  categoryChain?: CategoryChain[]
  onPreview?: () => void
  isDark?: boolean
}

export function CourseDetailHeader({ course, categoryChain, onPreview, isDark = false }: Props) {
  const { t } = useTranslation()
  const rating = course.rating ?? 0

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  return (
    <View className={isDark ? 'bg-zinc-950' : 'bg-white'}>
      <View className="px-5 pt-4 pb-6">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          {[
            { label: t('common.home'), onPress: () => {} },
            ...(categoryChain ?? []).map(cat => ({
              label: cat.name,
              onPress: () => {},
            })),
          ].map((item, idx, arr) => (
            <View key={idx} className="flex-row items-center">
              <Pressable onPress={item.onPress}>
                <Text className={`text-[10px] font-black uppercase tracking-widest ${idx === arr.length - 1 ? (isDark ? 'text-white' : 'text-zinc-900') : (isDark ? 'text-zinc-600' : 'text-zinc-400')}`}>
                  {item.label}
                </Text>
              </Pressable>
              {idx < arr.length - 1 && (
                <View className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800 mx-3" />
              )}
            </View>
          ))}
        </ScrollView>

        <Text className={`text-2xl font-black leading-tight mb-4 tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {course.title}
        </Text>

        <Pressable className="flex-row items-center gap-3 mb-6" onPress={() => {}}>
          <View className={`w-8 h-8 rounded-xl items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
            <Text className="text-emerald-600 text-xs font-black">
              {(course.instructor?.fullname ?? 'N').charAt(0)}
            </Text>
          </View>
          <Text className={`text-sm font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {course.instructor?.fullname ?? 'N/A'}
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-4 flex-wrap">
          {rating > 0 && (
            <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text className={`text-sm font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {rating.toFixed(1)}
              </Text>
              <Text className={`text-[11px] font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                ({formatCount(course.rating_count)})
              </Text>
            </View>
          )}
          
          <View className="flex-row items-center gap-2">
            <Text className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {formatCount(course.total_enrolls)} {t('course_detail.students')}
            </Text>
          </View>

          <View className={`px-3 py-1.5 rounded-full border ${isDark ? 'border-white/5 bg-zinc-900' : 'border-zinc-100 bg-zinc-50'}`}>
            <Text className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
              {course.level ?? t('course_detail.all_levels')}
            </Text>
          </View>
        </View>
      </View>

      {onPreview && (
        <View className="px-5 pb-8">
          <Pressable onPress={onPreview} className="rounded-[40px] overflow-hidden shadow-2xl shadow-emerald-500/20">
            <View className="relative h-56 bg-zinc-100 dark:bg-zinc-900">
              <Image
                source={course.thumbnail_url ? { uri: course.thumbnail_url } : require('@/assets/images/onboarding_world.png')}
                className="absolute inset-0 w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/20" />
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-16 h-16 rounded-[24px] bg-white/90 items-center justify-center shadow-xl">
                  <Ionicons name="play" size={32} color="#10B981" className="ml-1" />
                </View>
              </View>
              <View className="absolute bottom-5 right-5 bg-white/90 dark:bg-zinc-900/90 px-4 py-2 rounded-2xl">
                <Text className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {t('common.preview')}
                </Text>
              </View>
            </View>
          </Pressable>

          <View className="flex-row items-center gap-6 mt-6 px-2">
            <View className="flex-row items-center gap-2">
              <Ionicons name="refresh-outline" size={14} color="#10B981" />
              <Text className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {t('course_detail.last_updated', { date: formatDate(course.last_updated ?? '') })}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Ionicons name="language-outline" size={14} color="#10B981" />
              <Text className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {course.language || t('common.vietnamese')}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View className={`h-px mx-5 ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`} />
    </View>
  )
}
