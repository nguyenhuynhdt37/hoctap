import React, { useCallback } from 'react'
import { View, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator, Image } from 'react-native'
import { useLocalSearchParams, Stack, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'

import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/layout/Screen'
import { courseService } from '@/src/services/course.service'
import { CourseDetailSidebar } from '@/components/features/course-detail/CourseDetailSidebar'
import { CourseDetailContent } from '@/components/features/course-detail/CourseDetailContent'
import { getFullImageUrl } from '@/src/utils/image'
import { formatDate } from '@/src/utils/format'
import type { CourseDetail, CourseSection } from '@/src/types/course'

export default function CourseDetailPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  const { data, isLoading, error } = useQuery<CourseDetail>({
    queryKey: ['course', slug],
    queryFn: () => courseService.getDetail(slug!).then(r => r.data),
    enabled: !!slug,
  })

  const openPreview = useCallback((courseId: string) => {
    router.push(`/course/preview/${courseId}`)
  }, [router])

  if (isLoading) return <LoadingView />
  if (error || !data || !data.course) return <NotFoundView />
  if (data.status === 'empty') return <BuildingView />

  const { course } = data
  const flatSections = flattenSections(course.sections)

  return (
    <Screen safeArea withTabBar={false}>
      <Stack.Screen options={{ title: course.title, headerShown: false }} />

      <Header 
        course={course} 
        data={data} 
        onPreview={() => openPreview(course.id)} 
        onBack={() => {
          if (router.canGoBack()) {
            router.back()
          } else {
            router.replace('/')
          }
        }} 
        isDark={isDark}
      />

      <ScrollView 
        className="flex-1 bg-white dark:bg-zinc-950" 
        contentContainerStyle={{ paddingBottom: 24 }} 
        showsVerticalScrollIndicator={false}
      >
        <CourseDetailSidebar course={course} router={router} isDark={isDark} />
        <CourseDetailContent
          course={course}
          flatSections={flatSections}
          onPreviewLesson={() => openPreview(course.id)}
          reviews={data.sample_reviews}
          isDark={isDark}
        />
      </ScrollView>
    </Screen>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────
function flattenSections(sections: CourseSection[] | unknown[]): CourseSection[] {
  if (!Array.isArray(sections) || sections.length === 0) return []
  if (Array.isArray(sections[0])) {
    return (sections as unknown as CourseSection[][]).flat()
  }
  return sections as CourseSection[]
}

// ── States ────────────────────────────────────────────────────────────────
function LoadingView() {
  const { t } = useTranslation()
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950">
      <ActivityIndicator size="large" color="#10B981" />
      <Text className="mt-3 text-sm text-gray-500 dark:text-zinc-400">{t('course_detail.loading')}</Text>
    </View>
  )
}

function NotFoundView() {
  const { t } = useTranslation()
  return (
    <View className="flex-1 items-center justify-center px-6 bg-white dark:bg-zinc-950">
      <Text className="text-lg font-bold text-gray-900 dark:text-white">{t('course_detail.not_found')}</Text>
    </View>
  )
}

function BuildingView() {
  const { t } = useTranslation()
  return (
    <View className="flex-1 items-center justify-center px-6 bg-white dark:bg-zinc-950">
      <Text className="text-lg font-bold text-gray-900 dark:text-white">{t('course_detail.building')}</Text>
    </View>
  )
}

// ── Header ──────────────────────────────────────────────────────────────
import { BackButton } from '@/components/ui/BackButton'

function Header({ course, data, onPreview, onBack, isDark }: {
  course: any; data: CourseDetail; onPreview: () => void; onBack: () => void; isDark: boolean
}) {
  const { t } = useTranslation()
  const rating = course.rating ?? 0
  const formatCount = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString()

  return (
    <View className="bg-white dark:bg-zinc-950">
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
        <BackButton onPress={onBack} />
        <Text className="flex-1 text-base font-bold text-gray-900 dark:text-white" numberOfLines={1}>{course.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pt-3 pb-2">
        <Text className="text-[11px] uppercase font-black tracking-widest text-gray-400 dark:text-zinc-500">Studynest</Text>
        {(data.category_chain ?? []).map((cat) => (
          <View key={cat.id} className="flex-row items-center">
            <Text className="text-xs text-gray-300 dark:text-zinc-700 mx-1.5">/</Text>
            <Text className="text-[10px] uppercase font-black tracking-widest text-emerald-600">{cat.name}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="px-4 pb-3">
        <Text className="text-2xl font-black leading-tight tracking-tight text-gray-900 dark:text-white" numberOfLines={3}>{course.title}</Text>
      </View>

      <View className="flex-row items-center gap-2 px-4 pb-4">
        <View className="w-8 h-8 rounded-full items-center justify-center overflow-hidden bg-emerald-100 dark:bg-emerald-900/30">
          {course.instructor?.avatar ? (
            <Image source={{ uri: getFullImageUrl(course.instructor.avatar) ?? '' }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-emerald-600 text-xs font-black">{(course.instructor?.fullname ?? 'N').charAt(0)}</Text>
          )}
        </View>
        <Text className="text-sm font-bold text-gray-600 dark:text-zinc-400">{course.instructor?.fullname ?? 'N/A'}</Text>
      </View>

      <View className="flex-row items-center gap-3 px-4 pb-4 flex-wrap">
        {rating > 0 && (
          <>
             <View className="flex-row items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg">
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text className="text-sm font-black text-amber-600">{rating.toFixed(1)}</Text>
              <Text className="text-[11px] font-bold text-amber-600/50">({formatCount(course.rating_count)})</Text>
            </View>
          </>
        )}
        <View className="flex-row items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded-lg">
          <Ionicons name="people" size={13} color={isDark ? '#71717a' : '#9CA3AF'} />
          <Text className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{formatCount(course.total_enrolls)} {t('course_detail.students')}</Text>
        </View>
        <View className="flex-row items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded-lg">
          <Feather name="bar-chart-2" size={12} color={isDark ? '#71717a' : '#9CA3AF'} />
          <Text className="text-xs font-bold capitalize text-zinc-500 dark:text-zinc-400">{course.level ? t(`course_detail.levels.${course.level}`) : t('course_detail.all_levels')}</Text>
        </View>
      </View>

      <Pressable onPress={onPreview} className="px-4 pb-4">
        <View className="rounded-[24px] overflow-hidden border border-zinc-100 dark:border-white/5 shadow-xl shadow-black/5">
          {course.thumbnail_url ? (
            <Image
              source={{ uri: getFullImageUrl(course.thumbnail_url) }}
              className="w-full h-52"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-52 bg-gray-200 dark:bg-zinc-800" />
          )}
          <View className="absolute inset-0 items-center justify-center bg-black/20">
            <View className="w-16 h-16 rounded-full bg-white/90 items-center justify-center shadow-2xl">
              <Feather name="play" size={32} color="#059669" style={{ marginLeft: 4 }} />
            </View>
          </View>
           <View className="absolute bottom-4 right-4 bg-black/60 px-3 py-1.5 rounded-full border border-white/10">
            <Text className="text-white text-[11px] font-black uppercase tracking-widest">{t('common.preview')}</Text>
          </View>
        </View>
         <View className="flex-row items-center gap-3 mt-3 px-1">
          <Text className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">
            {t('course_detail.last_updated', { date: formatDate(course.last_updated) })}
          </Text>
          <View className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
           <View className="flex-row items-center gap-1">
             <Ionicons name="language" size={11} color={isDark ? '#52525b' : '#a1a1aa'} />
             <Text className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">{course.language || t('common.vietnamese')}</Text>
          </View>
        </View>
      </Pressable>

      <View className="h-px mx-4 bg-gray-100 dark:bg-zinc-900" />
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    gap: 8,
  },
})
