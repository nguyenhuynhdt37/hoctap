/**
 * LearningFeature - F8 Style Learning UI
 * Video Player + Tabs + Content + Sticky Bottom Navigation
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { View, ScrollView, Pressable, useColorScheme, RefreshControl } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui'

// Hooks
import { useLearning } from './hooks/useLearning'
import * as Haptics from 'expo-haptics'

// Components
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { ContentTab } from './components/ContentTab'
import { QATab } from './components/QATab'
import { ResourcesTab } from './components/ResourcesTab'
import { NotesSection } from './components/NotesSection'
import { CourseOverviewTab } from './components/CourseOverviewTab'
import { BottomNav } from './components/BottomNav'
import { VideoLesson, VideoLessonRef } from './components/VideoLesson'
import { Celebration } from './components/Celebration'
import { QuizOverlay } from './components/VideoLesson/QuizOverlay'

// Types
import type { ContentTab as ContentTabType, LearningFeatureProps } from './types'

export function LearningFeature({ courseId, courseTitle, initialCourseInfo, initialLessonId }: LearningFeatureProps) {
  const isDark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()
  const videoRef = useRef<VideoLessonRef>(null)
  const [currentTime, setCurrentTime] = useState(0)

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

  const effectiveCourseInfo = courseInfo || initialCourseInfo

  if (isLoading || !curriculum) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
        <Text className="text-zinc-500">Đang tải nội dung học tập...</Text>
      </View>
    )
  }

  const showVideo = currentLesson?.lesson_type === 'video' && currentLesson.file_id

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

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} insets={insets} />

        <View className="flex-1">
          {currentLesson && activeTab === 'content' && (
            <ContentTab
              lesson={currentLesson}
            />
          )}

          {currentLesson && activeTab === 'qa' && (
            <QATab lessonId={currentLesson.id} />
          )}

          {currentLesson && activeTab === 'resources' && (
            <ResourcesTab resources={currentLesson.resources} />
          )}

          {currentLesson && activeTab === 'notes' && (
            <NotesSection 
              lessonId={currentLesson.id} 
              isDark={isDark}
              currentVideoTime={currentTime}
              onSeekToTime={(time) => videoRef.current?.seekTo(time)}
            />
          )}

          {activeTab === 'course_overview' && (
            <CourseOverviewTab curriculum={curriculum} courseInfo={effectiveCourseInfo} />
          )}
        </View>
      </ScrollView>

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

      {/* Quiz Overlay - Rendered at root for full screen coverage */}
      {showQuizOverlay && currentLesson?.quizzes && currentLesson.quizzes.length > 0 && (
        <QuizOverlay
          quizzes={currentLesson.quizzes}
          onFinish={(score, passed) => {
            setShowQuizOverlay(false)
            if (passed) {
              onMarkCompleted(currentLesson.id)
            }
          }}
          onClose={() => setShowQuizOverlay(false)}
          isDark={isDark}
        />
      )}

      {/* Pháo hoa chúc mừng - Phải nằm ở cuối cùng để nổi nhất */}
      <Celebration
        visible={celebration.visible}
        type={celebration.type}
        onDismiss={dismissCelebration}
      />
    </View>
  )
}

export type { LearningFeatureProps }

