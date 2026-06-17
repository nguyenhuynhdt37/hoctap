import React, { useCallback, memo, useState } from 'react'
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ListRenderItem,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui'
import { cn } from '@/src/lib/utils'
import { categoryService } from '@/src/services/course.service'
import type { CategoryWithChildren, Category } from '@/src/types/course'
import { CategoryCard, CategoryItem } from './components/CategoryCard'

type ViewMode = 'hierarchy' | 'list'

interface CategoriesContentProps {
  isDark?: boolean
}

export const CategoriesContent = memo(function CategoriesContent({ isDark = false }: CategoriesContentProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy')

  const {
    data: categories,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories().then(r => r.data),
  })

  const {
    data: allCategories,
    isLoading: isLoadingAll,
  } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoryService.getAllCategories().then(r => r.data),
  })

  const filteredCategories = React.useMemo(() => {
    if (!categories) return []
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()

    // Filter parent categories
    const parents = categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.parent_reverse?.some(child => child.name.toLowerCase().includes(q))
    )

    return parents
  }, [categories, searchQuery])

  const filteredAll = React.useMemo(() => {
    if (!allCategories) return []
    if (!searchQuery.trim()) return allCategories
    const q = searchQuery.toLowerCase()
    return allCategories.filter(c => c.name.toLowerCase().includes(q))
  }, [allCategories, searchQuery])

  const handleCategoryPress = useCallback((category: CategoryWithChildren | { id: string; name: string; slug: string }) => {
    router.push(`/course/category/${category.slug}` as any)
  }, [router])

  const renderCategoryItem: ListRenderItem<CategoryWithChildren> = useCallback(
    ({ item }) => (
      <CategoryCard
        category={item}
        onPress={() => handleCategoryPress(item)}
        onChildPress={handleCategoryPress}
      />
    ),
    [handleCategoryPress]
  )

  const renderAllItem: ListRenderItem<Category> = useCallback(
    ({ item }) => (
      <CategoryItem
        item={item}
        onPress={() => handleCategoryPress(item)}
        isDark={isDark}
      />
    ),
    [handleCategoryPress, isDark]
  )

  const keyExtractor = useCallback((item: CategoryWithChildren | Category) => item.id, [])

  const ListHeader = useCallback(() => (
    <View className="px-4 pt-4 pb-2">
      <View className="flex-row items-center justify-between mb-4">
        <Text className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
          Danh mục
        </Text>
        <Text className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-gray-500')}>
          {(viewMode === 'hierarchy' ? filteredCategories : filteredAll).length} danh mục
        </Text>
      </View>

      {/* Search */}
      <View
        className={cn(
          'flex-row items-center px-4 py-3 rounded-xl mb-4',
          isDark ? 'bg-zinc-800' : 'bg-gray-100'
        )}
      >
        <Feather name="search" size={18} color={isDark ? '#71717A' : '#9CA3AF'} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Tìm kiếm danh mục..."
          placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
          className={cn('flex-1 ml-3 text-sm', isDark ? 'text-white' : 'text-gray-900')}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Feather name="x" size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
          </Pressable>
        )}
      </View>

      {/* View mode toggle */}
      <View className="flex-row items-center gap-2 mb-4">
        <Pressable
          onPress={() => setViewMode('hierarchy')}
          className={cn(
            'flex-row items-center gap-2 px-4 py-2 rounded-xl',
            viewMode === 'hierarchy'
              ? 'bg-emerald-500'
              : isDark ? 'bg-zinc-800' : 'bg-gray-100'
          )}
        >
          <Feather
            name="list"
            size={16}
            color={viewMode === 'hierarchy' ? '#FFFFFF' : isDark ? '#71717A' : '#6B7280'}
          />
          <Text
            className={cn(
              'text-sm font-medium',
              viewMode === 'hierarchy' ? 'text-white' : isDark ? 'text-zinc-400' : 'text-gray-600'
            )}
          >
            Phân cấp
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setViewMode('list')}
          className={cn(
            'flex-row items-center gap-2 px-4 py-2 rounded-xl',
            viewMode === 'list'
              ? 'bg-emerald-500'
              : isDark ? 'bg-zinc-800' : 'bg-gray-100'
          )}
        >
          <Feather
            name="grid"
            size={16}
            color={viewMode === 'list' ? '#FFFFFF' : isDark ? '#71717A' : '#6B7280'}
          />
          <Text
            className={cn(
              'text-sm font-medium',
              viewMode === 'list' ? 'text-white' : isDark ? 'text-zinc-400' : 'text-gray-600'
            )}
          >
            Tất cả
          </Text>
        </Pressable>
      </View>
    </View>
  ), [isDark, searchQuery, viewMode, filteredCategories.length, filteredAll.length])

  const ListEmpty = useCallback(() => {
    if (isLoading || isLoadingAll) return null

    return (
      <View className="flex-1 items-center justify-center px-8 py-16">
        <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center mb-4">
          <Feather name="folder" size={36} color={isDark ? '#52525B' : '#D1D5DB'} />
        </View>
        <Text className={cn('text-lg font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
          Không tìm thấy danh mục
        </Text>
        <Text className={cn('text-sm text-center', isDark ? 'text-zinc-400' : 'text-gray-500')}>
          Thử thay đổi từ khóa tìm kiếm
        </Text>
      </View>
    )
  }, [isLoading, isLoadingAll, isDark])

  const ListFooter = useCallback(() => (
    <View className="h-32" />
  ), [])

  if (isLoading || isLoadingAll) {
    return (
      <View className="flex-1">
        <View className="px-4 pt-4 pb-2">
          <View className="h-8 w-32 bg-gray-200 dark:bg-zinc-800 rounded-lg mb-4" />
          <View className="h-12 bg-gray-100 dark:bg-zinc-800 rounded-xl mb-4" />
        </View>
        {[1, 2, 3, 4].map(i => (
          <View key={i} className="mx-4 mb-2 h-16 rounded-xl bg-gray-100 dark:bg-zinc-800" />
        ))}
      </View>
    )
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 items-center justify-center mb-4">
          <Feather name="alert-circle" size={32} color="#EF4444" />
        </View>
        <Text className={cn('text-lg font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
          Đã xảy ra lỗi
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="px-6 py-3 rounded-xl bg-emerald-500 mt-4"
        >
          <Text className="text-white text-sm font-semibold">Thử lại</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <FlatList
      data={viewMode === 'hierarchy' ? filteredCategories : filteredAll}
      renderItem={viewMode === 'hierarchy' ? renderCategoryItem : renderAllItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={ListEmpty}
      ListFooterComponent={ListFooter}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={refetch}
          tintColor="#10B981"
          colors={['#10B981']}
        />
      }
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={10}
    />
  )
})
