import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { learningService } from '../services/learning.service'
import type { Lesson, ContentTab, PrevNextLesson, CourseCurriculum } from '../types'

export function useLearning(courseId: string, initialData?: any) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // State
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ContentTab>('content')
  const [showQuizOverlay, setShowQuizOverlay] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch Curriculum
  const { 
    data: curriculum, 
    isLoading: isCurriculumLoading,
    error: curriculumError 
  } = useQuery({
    queryKey: ['learning', 'curriculum', courseId],
    queryFn: () => learningService.getCurriculum(courseId),
    enabled: !!courseId,
  })

  // Fetch Course Detail
  const { data: courseInfo } = useQuery({
    queryKey: ['course', 'detail', courseId],
    queryFn: () => courseService.getDetailById(courseId).then(r => r.data),
    enabled: !!courseId && !initialData,
    initialData: initialData,
  })

  // Fetch Active Lesson (from backend)
  const { 
    data: activeLessonData,
    isLoading: isActiveLessonLoading 
  } = useQuery({
    queryKey: ['learning', 'active', courseId],
    queryFn: () => learningService.getActiveLesson(courseId),
    enabled: !!courseId,
  })

  // Fetch Prev/Next info for current lesson
  const { data: navData } = useQuery({
    queryKey: ['learning', 'nav', activeLessonId],
    queryFn: () => learningService.getPrevNextLesson(activeLessonId!),
    enabled: !!activeLessonId,
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const [celebration, setCelebration] = useState<{
    visible: boolean
    type: 'lesson_complete' | 'quiz_pass' | 'quiz_fail' | 'code_pass' | 'streak'
  }>({ visible: false, type: 'lesson_complete' })

  // ─────────────────────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const setActiveLessonMutation = useMutation({
    mutationFn: (lessonId: string) => learningService.setActiveLesson(courseId, lessonId),
    onSuccess: () => {
      // Invalidate both active lesson details and nav info
      queryClient.invalidateQueries({ queryKey: ['learning', 'active', courseId] })
      queryClient.invalidateQueries({ queryKey: ['learning', 'curriculum', courseId] })
    },
  })

  const playSuccessSound = async () => {
    try {
      const { Audio } = require('expo-av')
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3' }
      )
      await sound.playAsync()
    } catch (e) {
      // Ignored
    }
  }

  const triggerSuccess = useCallback(() => {
    setCelebration({ visible: true, type: 'lesson_complete' })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    playSuccessSound()
    
    setTimeout(() => {
      setCelebration(prev => ({ ...prev, visible: false }))
    }, 5000)
  }, [])

  const markLessonCompletedMutation = useMutation({
    mutationFn: (lessonId: string) => learningService.markLessonCompleted(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'curriculum', courseId] })
      queryClient.invalidateQueries({ queryKey: ['learning', 'active', courseId] })
      if (activeLessonId) {
        queryClient.invalidateQueries({ queryKey: ['learning', 'nav', activeLessonId] })
      }
    },
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────────

  // Current lesson details - prioritize activeLessonData from backend
  const currentLesson = useMemo(() => {
    if (activeLessonData) return activeLessonData
    
    if (!curriculum || !activeLessonId) return null
    for (const section of curriculum.sections) {
      const lesson = section.lessons.find(l => l.id === activeLessonId)
      if (lesson) return lesson
    }
    return null
  }, [curriculum, activeLessonId, activeLessonData])

  // Progress
  const progress = curriculum?.progress_percent ?? 0

  // ─────────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────────

  // Set active lesson ID when data is loaded
  useEffect(() => {
    if (activeLessonData?.id) {
      setActiveLessonId(activeLessonData.id)
    } else if (curriculum && !activeLessonId) {
      const first = curriculum.sections
        .flatMap(s => s.lessons)
        .find(l => !l.is_locked)
      if (first) setActiveLessonId(first.id)
    }
  }, [curriculum, activeLessonData, activeLessonId])

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const selectLesson = useCallback((lesson: Lesson) => {
    // Cho phép qua bài nếu là bài tiếp theo và bài hiện tại đã xong (để UI mượt hơn khi test)
    const isNextLesson = navData?.next_lesson_id === lesson.id
    const canUnlockNext = isNextLesson && currentLesson?.is_completed

    if (lesson.is_locked && !canUnlockNext) return
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setActiveLessonId(lesson.id)
    setActiveLessonMutation.mutate(lesson.id)
    setSidebarOpen(false)
  }, [courseId, setActiveLessonMutation, navData?.next_lesson_id, currentLesson?.is_completed])

  const goBack = useCallback(() => {
    router.back()
  }, [router])

  const goToPrev = useCallback(() => {
    if (navData?.prev_lesson_id) {
      const lesson = curriculum?.sections
        .flatMap(s => s.lessons)
        .find(l => l.id === navData.prev_lesson_id)
      if (lesson) selectLesson(lesson)
    }
  }, [navData, curriculum, selectLesson])

  const goToNext = useCallback(() => {
    if (navData?.next_lesson_id) {
      const lesson = curriculum?.sections
        .flatMap(s => s.lessons)
        .find(l => l.id === navData.next_lesson_id)
      if (lesson) selectLesson(lesson)
    }
  }, [navData, curriculum, selectLesson])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const dismissCelebration = useCallback(() => {
    setCelebration(prev => ({ ...prev, visible: false }))
  }, [])

  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    
    // Đợi 2 giây như yêu cầu của user
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['learning', 'curriculum', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['learning', 'active', courseId] }),
        activeLessonId ? queryClient.invalidateQueries({ queryKey: ['learning', 'nav', activeLessonId] }) : Promise.resolve(),
        activeLessonId ? queryClient.invalidateQueries({ queryKey: ['learning', 'comments', activeLessonId] }) : Promise.resolve(),
      ])
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } finally {
      setRefreshing(false)
    }
  }, [courseId, activeLessonId, queryClient])

  return {
    // State
    activeLessonId,
    sidebarOpen,
    activeTab,
    celebration,
    refreshing,
    showQuizOverlay,
    setShowQuizOverlay,
    isLoading: isCurriculumLoading || isActiveLessonLoading,
    error: curriculumError,

    // Data
    curriculum,
    courseInfo,
    currentLesson,
    navData: {
      ...navData,
      can_next: (navData?.can_next || (!!navData?.next_lesson_id && currentLesson?.is_completed)) ?? false,
      can_prev: navData?.can_prev ?? false,
    },
    progress,

    // Tab setters
    setActiveTab,

    // Actions
    selectLesson,
    goBack,
    goToPrev,
    goToNext,
    toggleSidebar,
    closeSidebar,
    dismissCelebration,
    onMarkCompleted: (lessonId: string) => {
      triggerSuccess()
      markLessonCompletedMutation.mutate(lessonId)
    },
    onRefresh: handleRefresh,
  }
}
