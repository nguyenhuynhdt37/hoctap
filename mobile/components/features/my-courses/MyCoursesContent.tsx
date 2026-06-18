import React, { useState, useCallback, memo } from 'react'
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ListRenderItem,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui'
import { cn } from '@/src/lib/utils'
import { purchaseService, type GetMyCoursesParams } from '@/src/services/course.service'
import type { MyCourseItem } from '@/src/types/course'
import { MyCourseCard, MyCourseCardSkeleton } from './components/MyCourseCard'

const PAGE_SIZE = 10

const SORT_OPTIONS: { label: string; value: GetMyCoursesParams['sort_by'] }[] = [
  { label: 'Ngày đăng ký', value: 'enrolled_at' },
  { label: 'Mới nhất', value: 'created_at' },
  { label: 'Đánh giá', value: 'rating_avg' },
  { label: 'Tiến độ', value: 'progress' },
]

interface MyCoursesContentProps {
  isDark?: boolean
}

export const MyCoursesContent = memo(function MyCoursesContent({ isDark = false }: MyCoursesContentProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  // Filter state
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<GetMyCoursesParams['sort_by']>('enrolled_at')
  const [order, setOrder] = useState<GetMyCoursesParams['order']>('desc')

  // Query params
  const queryParams: GetMyCoursesParams = {
    page: 1,
    size: PAGE_SIZE,
    keyword: keyword || undefined,
    sort_by: sortBy,
    order,
  }

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['my-courses', queryParams],
    queryFn: () => purchaseService.getMyCourses(queryParams).then(r => r.data),
  })

  const isFetchingNextPage = false

  const courses = data?.courses ?? []
  const total = data?.total ?? 0

  const handleCoursePress = useCallback((course: MyCourseItem) => {
    router.push(`/course/${course.slug}` as any)
  }, [router])

  const handleSortPress = useCallback(() => {
    setOrder(o => (o === 'desc' ? 'asc' : 'desc'))
  }, [])

  const renderItem: ListRenderItem<MyCourseItem> = useCallback(
    ({ item }) => <MyCourseCard course={item} onPress={handleCoursePress} />,
    [handleCoursePress]
  )

  const keyExtractor = useCallback((item: MyCourseItem) => item.id, [])

  const ListHeader = useCallback(() => (
    <View className="px-4 pt-4 pb-2">
      {/* Stats summary */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>
          Khóa học của tôi
        </Text>
        <Text className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-gray-500')}>
          {total} khóa học
        </Text>
      </View>

      {/* Search bar */}
      <View
        className={cn(
          'flex-row items-center px-4 py-3 rounded-xl mb-3',
          isDark ? 'bg-zinc-800' : 'bg-gray-100'
        )}
      >
        <Feather name="search" size={18} color={isDark ? '#71717A' : '#9CA3AF'} />
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder="Tìm kiếm khóa học..."
          placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
          className={cn('flex-1 ml-3 text-sm', isDark ? 'text-white' : 'text-gray-900')}
          returnKeyType="search"
        />
        {keyword.length > 0 && (
          <Pressable onPress={() => setKeyword('')} hitSlop={8}>
            <Feather name="x" size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
          </Pressable>
        )}
      </View>

      {/* Sort options */}
      <View className="flex-row items-center gap-2 pb-3">
        <Text className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-gray-400')}>Sắp xếp:</Text>
        {SORT_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setSortBy(option.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium',
              sortBy === option.value
                ? 'bg-emerald-500'
                : isDark
                  ? 'bg-zinc-800'
                  : 'bg-gray-100'
            )}
          >
            <Text
              className={cn(
                'text-xs font-medium',
                sortBy === option.value
                  ? 'text-white'
                  : isDark
                    ? 'text-zinc-400'
                    : 'text-gray-600'
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={handleSortPress}
          className={cn(
            'px-3 py-1.5 rounded-full',
            isDark ? 'bg-zinc-800' : 'bg-gray-100'
          )}
        >
          <Feather
            name={order === 'desc' ? 'arrow-down' : 'arrow-up'}
            size={14}
            color={isDark ? '#71717A' : '#6B7280'}
          />
        </Pressable>
      </View>
    </View>
  ), [isDark, keyword, sortBy, order, total, setKeyword, setSortBy])

  const ListEmpty = useCallback(() => {
    if (isLoading) return null

    return (
      <View className="flex-1 items-center justify-center px-8 py-16">
        <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center mb-4">
          <Feather name="book-open" size={36} color={isDark ? '#52525B' : '#D1D5DB'} />
        </View>
        <Text className={cn('text-lg font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
          Chưa có khóa học nào
        </Text>
        <Text className={cn('text-sm text-center mb-6', isDark ? 'text-zinc-400' : 'text-gray-500')}>
          Bạn chưa đăng ký khóa học nào.{'\n'}Hãy khám phá và bắt đầu học ngay!
        </Text>
        <Pressable
          onPress={() => router.push('/(app)/explore' as any)}
          className="px-6 py-3 rounded-xl bg-emerald-500"
        >
          <Text className="text-white text-sm font-semibold">Khám phá khóa học</Text>
        </Pressable>
      </View>
    )
  }, [isLoading, isDark, router])

  const ListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null
    return (
      <View className="py-6 items-center">
        <ActivityIndicator color="#10B981" />
      </View>
    )
  }, [isFetchingNextPage])

  if (isLoading) {
    return (
      <View className="flex-1">
        <View className="px-4 pt-4 pb-2">
          <View className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded-lg mb-4" />
          <View className="h-12 bg-gray-100 dark:bg-zinc-800 rounded-xl mb-3" />
        </View>
        {[1, 2, 3].map(i => (
          <MyCourseCardSkeleton key={i} />
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
      data={courses}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={ListEmpty}
      ListFooterComponent={ListFooter}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isFetchingNextPage}
          onRefresh={refetch}
          tintColor="#10B981"
          colors={['#10B981']}
        />
      }
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={10}
      removeClippedSubviews
    />
  )
})
