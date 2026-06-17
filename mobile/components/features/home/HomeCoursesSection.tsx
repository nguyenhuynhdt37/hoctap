import React, { useEffect, useState, useCallback } from 'react'
import { View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CoursesCarousel } from './CoursesCarousel'
import { courseService } from '@/src/services/course.service'
import type { NewestCourse } from '@/src/types/course'

const INITIAL_LIMIT = 8

export function HomeCoursesSection() {
  const { t } = useTranslation()

  // ── Top Rated ──────────────────────────────────────────────────────────────
  const { data: topRatedData, isLoading: isLoadingTopRated } = useQuery({
    queryKey: ['courses', 'top-rated'],
    queryFn: () => courseService.getTopRated({ limit: 4 }),
    staleTime: 1000 * 60 * 10,
  })

  // ── Trending (Top Views) ───────────────────────────────────────────────────
  const [trendingCourses, setTrendingCourses] = useState<NewestCourse[]>([])
  const [trendingCursor, setTrendingCursor] = useState<string | null>(null)
  const [loadingTrending, setLoadingTrending] = useState(false)

  const { data: trendingData, isLoading: isLoadingTrending } = useQuery({
    queryKey: ['courses', 'trending'],
    queryFn: () => courseService.getTopViews({ limit: INITIAL_LIMIT }),
    staleTime: 1000 * 60 * 10,
  })

  useEffect(() => {
    if (trendingData?.data?.items) {
      setTrendingCourses(trendingData.data.items)
      setTrendingCursor(trendingData.data.next_cursor)
    }
  }, [trendingData])

  const loadMoreTrending = useCallback(async () => {
    if (!trendingCursor || loadingTrending) return
    setLoadingTrending(true)
    try {
      const res = await courseService.getTopViews({ limit: INITIAL_LIMIT, cursor: trendingCursor })
      setTrendingCourses(prev => [...prev, ...res.data.items])
      setTrendingCursor(res.data.next_cursor)
    } catch (err) {
      console.error('Error loading more trending courses:', err)
    } finally {
      setLoadingTrending(false)
    }
  }, [trendingCursor, loadingTrending])

  // ── Newest ─────────────────────────────────────────────────────────────────
  const [newestCourses, setNewestCourses] = useState<NewestCourse[]>([])
  const [newestCursor, setNewestCursor] = useState<string | null>(null)
  const [loadingNewest, setLoadingNewest] = useState(false)

  const { data: newestData, isLoading: isLoadingNewest } = useQuery({
    queryKey: ['courses', 'newest'],
    queryFn: () => courseService.getNewest({ limit: INITIAL_LIMIT }),
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    if (newestData?.data?.items) {
      setNewestCourses(newestData.data.items)
      setNewestCursor(newestData.data.next_cursor)
    }
  }, [newestData])

  const loadMoreNewest = useCallback(async () => {
    if (!newestCursor || loadingNewest) return
    setLoadingNewest(true)
    try {
      const res = await courseService.getNewest({ limit: INITIAL_LIMIT, cursor: newestCursor })
      setNewestCourses(prev => [...prev, ...res.data.items])
      setNewestCursor(res.data.next_cursor)
    } catch (err) {
      console.error('Error loading more newest courses:', err)
    } finally {
      setLoadingNewest(false)
    }
  }, [newestCursor, loadingNewest])

  return (
    <View className="gap-0">
      {/* Khóa học được đánh giá cao */}
      <CoursesCarousel
        title={t('home_screen.sections.top_rated')}
        items={(topRatedData?.data?.items ?? []) as NewestCourse[]}
        section="top"
        hasMore={false}
        isLoading={isLoadingTopRated}
        onLoadMore={() => { }}
      />

      {/* Khóa học thịnh hành */}
      <CoursesCarousel
        title={t('home_screen.sections.popular')}
        items={trendingCourses}
        section="trending"
        hasMore={!!trendingCursor}
        isLoading={isLoadingTrending}
        isFetchingMore={loadingTrending}
        onLoadMore={loadMoreTrending}
      />

      {/* Khóa học mới ra mắt */}
      <CoursesCarousel
        title={t('home_screen.sections.newest')}
        items={newestCourses}
        section="newest"
        hasMore={!!newestCursor}
        isLoading={isLoadingNewest}
        isFetchingMore={loadingNewest}
        onLoadMore={loadMoreNewest}
      />
    </View>
  )
}
