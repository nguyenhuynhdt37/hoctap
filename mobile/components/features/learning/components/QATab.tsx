import React from 'react'
import { useColorScheme } from 'react-native'
import { QASection } from './QASection'

interface QATabProps {
  lessonId: string
  initialCommentId?: string
  hideHeader?: boolean
}

export function QATab({ lessonId, initialCommentId, hideHeader }: QATabProps) {
  const isDark = useColorScheme() === 'dark'
  
  return (
    <QASection
      lessonId={lessonId}
      isDark={isDark}
      initialCommentId={initialCommentId}
      hideHeader={hideHeader}
    />
  )
}
