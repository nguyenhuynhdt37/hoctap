import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui'
import { Screen } from '@/components/layout/Screen'
import { cn } from '@/src/lib/utils'
import { SEARCH_SECTIONS } from '@/src/search/static-index'
import { useGlobalSearch } from '@/src/search/useGlobalSearch'
import type { GlobalSearchItem } from '@/src/search/types'

type SearchFilter = GlobalSearchItem['type'] | 'all'

const TYPE_LABELS: Record<GlobalSearchItem['type'], string> = {
  screen: 'search.types.screen',
  tab: 'search.types.tab',
  menu: 'search.types.menu',
  feature: 'search.types.feature',
  route: 'search.types.route',
  category: 'search.types.category',
  topic: 'search.types.topic',
  course: 'search.types.course',
  lesson: 'search.types.lesson',
  profile: 'search.types.profile',
  wallet: 'search.types.wallet',
  transaction: 'search.types.transaction',
  notification: 'search.types.notification',
  setting: 'search.types.setting',
  language: 'search.types.language',
}

export default function ExploreScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams<{ category?: string; topic?: string }>()
  const insets = useSafeAreaInsets()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all')

  const {
    results,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGlobalSearch(searchQuery, activeFilter)

  const hasSearchQuery = searchQuery.trim().length > 0

  useEffect(() => {
    if (params.category) {
      setSearchQuery(String(params.category))
      setActiveFilter('category')
    } else if (params.topic) {
      setSearchQuery(String(params.topic))
      setActiveFilter('topic')
    }
  }, [params.category, params.topic])

  const handleResultPress = useCallback((item: GlobalSearchItem) => {
    router.push(item.route as any)
  }, [router])

  const emptyTitle = searchQuery.trim() ? t('search.empty.title') : t('search.idle.title')
  const emptyDescription = searchQuery.trim()
    ? t('search.empty.description')
    : t('search.idle.description')

  const resultCountText = useMemo(() => {
    if (isLoading) return t('search.loading.indexing')
    return t('search.results_count', { count: results.length })
  }, [isLoading, results.length, t])

  const renderFilter = useCallback(({ item }: { item: typeof SEARCH_SECTIONS[number] }) => {
    const isActive = activeFilter === item.key

    return (
      <Pressable
        onPress={() => setActiveFilter(item.key)}
        className={cn(
          'flex-row items-center px-4 py-2 rounded-full mr-2',
          isActive ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-zinc-800'
        )}
      >
        <Text
          className={cn(
            'text-sm font-medium',
            isActive ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'
          )}
        >
          {t(item.label)}
        </Text>
      </Pressable>
    )
  }, [activeFilter])

  const renderResult = useCallback(({ item }: { item: GlobalSearchItem }) => (
    <Pressable
      onPress={() => handleResultPress(item)}
      className="flex-row items-center px-5 py-4 mb-3 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm"
    >
      <View className="w-11 h-11 rounded-full bg-emerald-500/10 items-center justify-center mr-4">
        <Feather name={item.icon as any} size={20} color="#10b981" />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-base font-semibold text-gray-900 dark:text-white flex-1">
            {item.title}
          </Text>
          <Text className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
            {t(TYPE_LABELS[item.type])}
          </Text>
        </View>
        <Text
          className="text-sm text-zinc-500 dark:text-zinc-400"
          numberOfLines={2}
        >
          {item.description}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color="#9CA3AF" />
    </Pressable>
  ), [handleResultPress])

  return (
    <Screen safeArea withTabBar>
      <View className="px-6 pt-2 pb-4">
        <View className="flex-row items-center justify-between mb-5">
          <View>
            <Text className="text-sm font-medium text-zinc-500 mb-0.5">{t('search.eyebrow')}</Text>
            <Text className="text-2xl font-bold text-zinc-900 dark:text-white">{t('search.title')}</Text>
          </View>
          <View className="w-11 h-11 rounded-full items-center justify-center bg-emerald-500/10">
            {isFetching ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <Feather name="search" size={22} color="#10b981" />
            )}
          </View>
        </View>

        <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800 mb-4">
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-base text-gray-900 dark:text-white"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Feather name="x-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          data={SEARCH_SECTIONS}
          renderItem={renderFilter}
          keyExtractor={item => item.key}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {!hasSearchQuery ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center mb-4">
            <Feather name="search" size={36} color="#D1D5DB" />
          </View>
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('search.idle.title')}</Text>
          <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center">
            {t('search.idle.description')}
          </Text>
        </View>
      ) : isLoading ? (
        <View className="flex-1 px-4">
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} className="h-20 mb-3 rounded-2xl bg-gray-100 dark:bg-zinc-800" />
          ))}
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 items-center justify-center mb-4">
            <Feather name="wifi-off" size={28} color="#EF4444" />
          </View>
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('search.error.title')}</Text>
          <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center mb-4">
            {t('search.error.description')}
          </Text>
          <Pressable onPress={() => refetch()} className="px-6 py-2.5 rounded-xl bg-emerald-500 mt-2">
            <Text className="text-white text-sm font-semibold">{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center mb-4">
            <Feather name="search" size={36} color="#D1D5DB" />
          </View>
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">{emptyTitle}</Text>
          <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center">
            {emptyDescription}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="pb-3 flex-row items-center justify-between">
              <Text className="text-sm text-zinc-500">{resultCountText}</Text>
              {isFetching && <ActivityIndicator size="small" color="#10b981" />}
            </View>
          }
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={10}
        />
      )}
    </Screen>
  )
}
