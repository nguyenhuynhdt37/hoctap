/**
 * LearningFeature - F8 Style Learning UI
 * Video Player + Tabs + Content + Sticky Bottom Navigation
 */

import React, { useEffect, useState, useRef } from 'react'
import { Pressable, RefreshControl, ScrollView, useColorScheme, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'

import { useLearning } from './hooks/useLearning'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { ContentTab } from './components/ContentTab'
import { QuizLesson } from './components/QuizLessonView'
import { CodeLesson } from './components/CodeLesson'
import { QATab } from './components/QATab'
import { CodeQABottomSheet } from './components/CodeLesson/CodeQABottomSheet'
import { ResourcesTab } from './components/ResourcesTab'
import { NotesSection } from './components/NotesSection'
import { CourseOverviewTab } from './components/CourseOverviewTab'
import { BottomNav } from './components/BottomNav'
import { VideoLesson, VideoLessonRef } from './components/VideoLesson'
import { Celebration } from './components/Celebration'
import { QuizOverlay } from './components/VideoLesson/QuizOverlay'
import type { LearningFeatureProps } from './types'

export function LearningFeature({ courseId, courseTitle, initialCourseInfo, initialLessonId, initialCommentId }: LearningFeatureProps) {
  const isDark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()
  const videoRef = useRef<VideoLessonRef>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [showQA, setShowQA] = useState(false)

  const {
    currentLesson,
    navData,
    progress,
    curriculum,
    courseInfo,
    sidebarOpen,
    activeTab,
    isLoading,
    setActiveTab,
    selectLesson,
    goBack,
    goToPrev,
    goToNext,
    onMarkCompleted,
    toggleSidebar,
    closeSidebar,
    celebration,
    dismissCelebration,
    refreshing,
    onRefresh,
    showQuizOverlay,
    setShowQuizOverlay,
  } = useLearning(courseId, initialCourseInfo, initialLessonId)

  useEffect(() => {
    if (initialLessonId && initialCommentId) {
      if (currentLesson?.lesson_type === 'code') {
        setActiveTab('content')
        setShowQA(true)
      } else {
        setActiveTab('qa')
      }
    }
  }, [currentLesson?.lesson_type, initialLessonId, initialCommentId, setActiveTab])

  useEffect(() => {
    if (currentLesson?.lesson_type === 'code' && activeTab !== 'content') {
      setActiveTab('content')
    }
  }, [activeTab, currentLesson?.lesson_type, setActiveTab])

  const effectiveCourseInfo = courseInfo || initialCourseInfo

  if (isLoading || !curriculum) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
        <Text className="text-zinc-500">Đang tải nội dung học tập...</Text>
      </View>
    )
  }

  const showVideo = currentLesson?.lesson_type === 'video' && currentLesson.file_id
  const isCodeLesson = currentLesson?.lesson_type === 'code'

  return (
    <View
      className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
            colors={['#10B981']}
            progressBackgroundColor={isDark ? '#18181B' : '#FFFFFF'}
          />
        }
      >
        <Header
          courseTitle={courseTitle}
          progress={progress}
          completedLessons={curriculum.completed_lessons}
          totalLessons={curriculum.total_lessons}
          onBack={goBack}
          onMenuPress={toggleSidebar}
          insets={insets}
        />

        {showVideo && currentLesson && (
          <VideoLesson
            ref={videoRef}
            lesson={currentLesson}
            isDark={isDark}
            onMarkCompleted={onMarkCompleted}
            onNext={goToNext}
            onPrev={goToPrev}
            onOpenQuiz={() => setShowQuizOverlay(true)}
            hasNext={navData?.can_next ?? false}
            hasPrev={navData?.can_prev ?? false}
            isCompleted={currentLesson.is_completed}
            showQuizOverlay={showQuizOverlay}
            onTimeUpdate={setCurrentTime}
          />
        )}

        {!isCodeLesson && (
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} insets={insets} />
        )}

        <View className="flex-1">
          {currentLesson && activeTab === 'content' && (
            currentLesson.lesson_type === 'quiz' ? (
              <QuizLesson lesson={currentLesson} onMarkCompleted={onMarkCompleted} isDark={isDark} />
            ) : currentLesson.lesson_type === 'code' ? (
              <CodeLesson
                lesson={currentLesson}
                isDark={isDark}
                isCompleted={currentLesson.is_completed}
                onMarkCompleted={onMarkCompleted}
              />
            ) : (
              <ContentTab lesson={currentLesson} />
            )
          )}

          {currentLesson && activeTab === 'qa' && !isCodeLesson && (
            <QATab lessonId={currentLesson.id} initialCommentId={initialCommentId} />
          )}

          {currentLesson && activeTab === 'resources' && !isCodeLesson && (
            <ResourcesTab resources={currentLesson.resources} />
          )}

          {currentLesson && activeTab === 'notes' && !isCodeLesson && (
            <NotesSection
              lessonId={currentLesson.id}
              isDark={isDark}
              currentVideoTime={currentTime}
              onSeekToTime={(time) => videoRef.current?.seekTo(time)}
            />
          )}

          {activeTab === 'course_overview' && !isCodeLesson && (
            <CourseOverviewTab curriculum={curriculum} courseInfo={effectiveCourseInfo} />
          )}

        </View>
      </ScrollView>

      {currentLesson && isCodeLesson && (
        <Pressable
          onPress={() => setShowQA(true)}
          className="absolute right-5 z-40 h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"
          style={{ bottom: Math.max(insets.bottom, 12) + 78 }}
        >
          <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      <View
        className={`${isDark ? 'bg-zinc-950' : 'bg-white'}`}
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <BottomNav
          canPrev={navData?.can_prev ?? false}
          canNext={navData?.can_next ?? false}
          isCompleted={currentLesson?.is_completed ?? false}
          onPrev={goToPrev}
          onNext={goToNext}
          onMenu={toggleSidebar}
          shouldShake={celebration.visible}
          insets={insets}
        />
      </View>

      {sidebarOpen && (
        <View className={`absolute inset-0 z-50 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
          <SafeAreaView className="flex-1">
            <Sidebar
              sections={curriculum.sections}
              currentLessonId={currentLesson?.id ?? ''}
              onSelectLesson={selectLesson}
              onClose={closeSidebar}
            />
          </SafeAreaView>
        </View>
      )}

      {showQuizOverlay && currentLesson?.quizzes && currentLesson.quizzes.length > 0 && (
        <QuizOverlay
          quizzes={currentLesson.quizzes}
          onFinish={(score, passed) => {
            setShowQuizOverlay(false)
            if (passed) onMarkCompleted(currentLesson.id)
          }}
          onClose={() => setShowQuizOverlay(false)}
          isDark={isDark}
        />
      )}

      <CodeQABottomSheet
        visible={showQA}
        lessonId={currentLesson?.id}
        lessonTitle={currentLesson?.title ?? courseTitle}
        initialCommentId={initialCommentId}
        isDark={isDark}
        onClose={() => setShowQA(false)}
      />

      <Celebration
        visible={celebration.visible}
        type={celebration.type}
        onDismiss={dismissCelebration}
      />
    </View>
  )
}

export type { LearningFeatureProps }
