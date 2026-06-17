import React, { useCallback, useState } from 'react'
import { View, FlatList, TextInput, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui'
import { Screen } from '@/components/layout/Screen'
import { cn } from '@/src/lib/utils'
import { categoryService } from '@/src/services/course.service'
import type { CategoryWithChildren, Category } from '@/src/types/course'

type ViewMode = 'hierarchy' | 'list'

export default function ExploreScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { data: categories, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories().then(r => r.data),
  })

  const { data: allCategories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoryService.getAllCategories().then(r => r.data),
  })

  const filteredCategories = React.useMemo(() => {
    if (!categories) return []
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()
    return categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.parent_reverse?.some(child => child.name.toLowerCase().includes(q))
    )
  }, [categories, searchQuery])

  const filteredAll = React.useMemo(() => {
    if (!allCategories) return []
    if (!searchQuery.trim()) return allCategories
    const q = searchQuery.toLowerCase()
    return allCategories.filter(c => c.name.toLowerCase().includes(q))
  }, [allCategories, searchQuery])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleCategoryPress = useCallback((slug: string) => {
    router.push(`/course/category/${slug}` as any)
  }, [router])

  const renderHierarchyItem = useCallback(({ item }: { item: CategoryWithChildren }) => {
    const children = item.parent_reverse ?? []
    const isExpanded = expandedIds.has(item.id)

    return (
      <View className="mb-3">
        <Pressable
          onPress={() => children.length > 0 ? toggleExpanded(item.id) : handleCategoryPress(item.slug)}
          className="flex-row items-center justify-between px-5 py-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm"
        >
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">{item.name}</Text>
            {children.length > 0 && (
              <Text className="text-xs text-zinc-400 mt-0.5">{children.length} danh mục con</Text>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            {children.length > 0 && (
              <View className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center">
                <Feather
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#6B7280"
                />
              </View>
            )}
            {children.length === 0 && (
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            )}
          </View>
        </Pressable>

        {isExpanded && children.length > 0 && (
          <View className="mt-2 ml-4 space-y-2">
            {children.map(child => (
              <Pressable
                key={child.id}
                onPress={() => handleCategoryPress(child.slug)}
                className="flex-row items-center justify-between px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800"
              >
                <Text className="text-sm font-medium text-gray-700 dark:text-zinc-300 flex-1">
                  {child.name}
                </Text>
                <Feather name="chevron-right" size={16} color="#9CA3AF" />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    )
  }, [expandedIds, toggleExpanded, handleCategoryPress])

  const renderListItem = useCallback(({ item }: { item: Category }) => (
    <Pressable
      onPress={() => handleCategoryPress(item.slug)}
      className="flex-row items-center justify-between px-5 py-4 mb-2 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm"
    >
      <Text className="text-base font-medium text-gray-900 dark:text-white flex-1">
        {item.name}
      </Text>
      <Feather name="chevron-right" size={20} color="#9CA3AF" />
    </Pressable>
  ), [handleCategoryPress])

  const count = viewMode === 'hierarchy' ? filteredCategories.length : filteredAll.length

  return (
    <Screen safeArea withTabBar>
      {/* Header */}
      <View className="px-6 pt-2 pb-4">
        <View className="flex-row items-center justify-between mb-5">
          <View>
            <Text className="text-sm font-medium text-zinc-500 mb-0.5">Khám phá</Text>
            <Text className="text-2xl font-bold text-zinc-900 dark:text-white">Danh mục</Text>
          </View>
          <View className="w-11 h-11 rounded-full items-center justify-center bg-emerald-500/10">
            <Feather name="grid" size={22} color="#10b981" />
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800 mb-4">
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm kiếm danh mục..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-base text-gray-900 dark:text-white"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Feather name="x-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* View toggle */}
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setViewMode('hierarchy')}
            className={cn(
              'flex-row items-center gap-2 px-4 py-2 rounded-full',
              viewMode === 'hierarchy' ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-zinc-800'
            )}
          >
            <Feather
              name="align-left"
              size={16}
              color={viewMode === 'hierarchy' ? '#FFFFFF' : '#6B7280'}
            />
            <Text
              className={cn(
                'text-sm font-medium',
                viewMode === 'hierarchy' ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'
              )}
            >
              Phân cấp
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('list')}
            className={cn(
              'flex-row items-center gap-2 px-4 py-2 rounded-full',
              viewMode === 'list' ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-zinc-800'
            )}
          >
            <Feather
              name="list"
              size={16}
              color={viewMode === 'list' ? '#FFFFFF' : '#6B7280'}
            />
            <Text
              className={cn(
                'text-sm font-medium',
                viewMode === 'list' ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'
              )}
            >
              Tất cả
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 px-4">
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} className="h-16 mb-3 rounded-2xl bg-gray-100 dark:bg-zinc-800" />
          ))}
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 items-center justify-center mb-4">
            <Feather name="wifi-off" size={28} color="#EF4444" />
          </View>
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">Kết nối thất bại</Text>
          <Pressable onPress={() => refetch()} className="px-6 py-2.5 rounded-xl bg-emerald-500 mt-2">
            <Text className="text-white text-sm font-semibold">Thử lại</Text>
          </Pressable>
        </View>
      ) : count === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center mb-4">
            <Feather name="folder" size={36} color="#D1D5DB" />
          </View>
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">Không tìm thấy</Text>
          <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center">
            Thử thay đổi từ khóa tìm kiếm
          </Text>
        </View>
      ) : (
        <FlatList
          data={viewMode === 'hierarchy' ? filteredCategories : filteredAll}
          renderItem={viewMode === 'hierarchy' ? renderHierarchyItem : renderListItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="pb-3">
              <Text className="text-sm text-zinc-500">{count} danh mục</Text>
            </View>
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}
    </Screen>
  )
}
