import React from 'react'
import { useColorScheme } from 'react-native'
import { QASection } from './QASection'

interface QATabProps {
  lessonId: string
  initialCommentId?: string
}

export function QATab({ lessonId, initialCommentId }: QATabProps) {
  const isDark = useColorScheme() === 'dark'
  
  return (
    <QASection
      lessonId={lessonId}
      isDark={isDark}
      initialCommentId={initialCommentId}
    />
  )
}
