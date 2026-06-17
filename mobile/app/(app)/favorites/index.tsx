import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  ScrollView,
  Animated,
  TextInput,
  Pressable,
  Dimensions,
  RefreshControl,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import { router } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { Text } from '@/components/ui'
import { Screen } from '@/components/layout/Screen'
import { cn } from '@/src/lib/utils'
import { favoriteService } from '@/src/services/favorite.service'
import { categoryService } from '@/src/services/category.service'
import { CourseCard, CourseCardSkeleton } from '@/components/features/home/CourseCard'
import { BackButton } from '@/components/ui/BackButton'

const { width: SCREEN_W } = Dimensions.get('window')

export default function FavoritesScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const isDark = useColorScheme() === 'dark'
  
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const SORT_OPTIONS = [
    { label: t('favorites_screen.sort.newest'), value: 'created_at' },
    { label: t('favorites_screen.sort.rating'), value: 'rating_avg' },
    { label: t('favorites_screen.sort.views'), value: 'views' },
  ]

  // Fetch Categories for filter
  const { data: categories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoryService.getAllCategories().then(r => r.data),
  })

  // Fetch Favorites
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['favorites', { keyword, category_id: selectedCategoryId, sort_by: sortBy, order }],
    queryFn: () => 
      favoriteService.getFavorites({
        page: 1,
        size: 50,
        keyword: keyword || undefined,
        category_id: selectedCategoryId || undefined,
        sort_by: sortBy,
        order,
      }).then(res => {
        // Map backend 'favourites' to 'items' and normalize fields for CourseCard
        const mappedItems = (res.data.favourites || []).map((item: any) => ({
          ...item,
          thumbnail: item.thumbnail_url,
          rating: item.rating_avg || item.avg_rating || 0,
          enrolls: item.total_enrolls || 0,
          base_price: item.base_price || 0,
          views: item.views || 0,
          instructor: item.instructor_name ? {
            name: item.instructor_name,
            avatar: item.instructor_avatar
          } : null
        }))
        return { ...res.data, items: mappedItems }
      }),
  })

  const courses = data?.items ?? []

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    refetch()
    setTimeout(() => setRefreshing(false), 500)
  }, [refetch])

  return (
    <Screen safeArea withTabBar={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
      >
        {/* Header - Identical to My Learn with Back Button */}
        <View className="px-5 pt-3 pb-2">
          <View className="flex-row items-center gap-4 mb-4">
            <BackButton />
            <View>
              <Text className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-0.5">
                {t('favorites_screen.personal')}
              </Text>
              <Text className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                {t('favorites_screen.title')}
              </Text>
            </View>
            <View className="w-14 h-14 rounded-2xl bg-emerald-500 items-center justify-center shadow-lg shadow-emerald-500/30 ml-auto">
              <Ionicons name="heart" size={28} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Search Bar - Identical to My Learn */}
        <View className="px-5 mb-4 mt-4">
          <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800">
            <Feather name="search" size={20} color="#9CA3AF" />
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder={t('favorites_screen.search_placeholder')}
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-3 text-base text-gray-900 dark:text-white"
              returnKeyType="search"
            />
            {keyword.length > 0 && (
              <Pressable onPress={() => setKeyword('')} hitSlop={8}>
                <Feather name="x-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Categories Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="mb-4"
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <Pressable
            onPress={() => setSelectedCategoryId(null)}
            className={cn(
              'px-4 py-2 rounded-full mr-2',
              !selectedCategoryId ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-zinc-800'
            )}
          >
            <Text className={cn('text-sm font-medium', !selectedCategoryId ? 'text-white' : 'text-gray-600 dark:text-zinc-400')}>
              {t('favorites_screen.all_categories')}
            </Text>
          </Pressable>
          {categories?.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategoryId(cat.id)}
              className={cn(
                'px-4 py-2 rounded-full mr-2',
                selectedCategoryId === cat.id ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-zinc-800'
              )}
            >
              <Text className={cn('text-sm font-medium', selectedCategoryId === cat.id ? 'text-white' : 'text-gray-600 dark:text-zinc-400')}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Sort & Order - Identical to My Learn */}
        <View className="flex-row items-center gap-2 px-5 mb-6">
          {SORT_OPTIONS.map(option => (
            <Pressable
              key={option.value}
              onPress={() => setSortBy(option.value)}
              className={cn(
                'px-4 py-2 rounded-full',
                sortBy === option.value
                  ? 'bg-emerald-500'
                  : 'bg-gray-100 dark:bg-zinc-800'
              )}
            >
              <Text
                className={cn(
                  'text-sm font-medium',
                  sortBy === option.value
                    ? 'text-white'
                    : 'text-gray-600 dark:text-zinc-400'
                )}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center ml-auto"
          >
            <Feather
              name={order === 'desc' ? 'arrow-down' : 'arrow-up'}
              size={16}
              color="#10B981"
            />
          </Pressable>
        </View>

        {/* Stats Summary - Similar to My Learn */}
        {!isLoading && !isError && courses.length > 0 && (
          <View className="px-5 mb-6">
            <View className="flex-row items-center gap-3">
              <StatBadge icon="heart" value={courses.length} label={t('favorites_screen.stats.saved')} color="#10B981" />
              <StatBadge icon="star" value={courses.filter(c => c.rating > 4.5).length} label={t('favorites_screen.stats.top_rated')} color="#F59E0B" />
              <StatBadge icon="eye" value={courses.reduce((acc, c) => acc + (c.views || 0), 0)} label={t('favorites_screen.stats.views')} color="#3B82F6" />
            </View>
          </View>
        )}

        {/* Content */}
        <View className="px-5">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <View key={i} className="mb-6">
                <CourseCardSkeleton />
              </View>
            ))
          ) : isError ? (
            <View className="items-center justify-center py-16">
              <Feather name="wifi-off" size={48} color="#EF4444" />
              <Text className="text-lg font-bold mt-4 text-zinc-900 dark:text-zinc-50">{t('common.error')}</Text>
              <Pressable onPress={() => refetch()} className="mt-4 px-6 py-2 bg-emerald-500 rounded-full">
                <Text className="text-white font-bold">{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : courses.length === 0 ? (
            <View className="items-center justify-center py-20 px-10">
              <View className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-900/20 items-center justify-center mb-6">
                <Ionicons name="heart-dislike-outline" size={48} color="#10B981" />
              </View>
              <Text className="text-xl font-bold text-center text-zinc-900 dark:text-zinc-50 mb-2">{t('favorites_screen.empty.title')}</Text>
              <Text className="text-sm text-center text-zinc-500 mb-8">{t('favorites_screen.empty.description')}</Text>
              <Pressable 
                onPress={() => router.push('/explore')}
                className="px-8 py-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30"
              >
                <Text className="text-white font-bold">{t('favorites_screen.empty.explore_now')}</Text>
              </Pressable>
            </View>
          ) : (
            courses.map((course: any) => (
              <View key={course.id} className="mb-6">
                <CourseCard course={course} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

function StatBadge({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Feather.glyphMap | keyof typeof Ionicons.glyphMap
  value: number | string
  label: string
  color: string
}) {
  return (
    <View className="flex-1 py-3 px-3 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-gray-100 dark:border-zinc-800 items-center">
      {icon === 'heart' ? (
         <Ionicons name="heart" size={18} color={color} />
      ) : (
         <Feather name={icon as any} size={18} color={color} />
      )}
      <Text className="text-lg font-black text-gray-900 dark:text-white mt-1">{value}</Text>
      <Text className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">{label}</Text>
    </View>
  )
}

