import React from 'react'
import { useLocalSearchParams, Stack } from 'expo-router'
import { CoursePreviewFeature } from '@/components/features/course-preview/CoursePreviewFeature'

export default function CoursePreviewPage() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>()

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CoursePreviewFeature courseId={courseId ?? ''} />
    </>
  )
}
