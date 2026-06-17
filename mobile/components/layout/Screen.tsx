import React from 'react'
import { View, type ViewProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScreenBackground } from './ScreenBackground'
import { cn } from '@/src/lib/utils'

interface ScreenProps extends ViewProps {
  safeArea?: boolean
  withTabBar?: boolean
}

export function Screen({ children, safeArea, withTabBar, className, ...props }: ScreenProps) {
  const content = (
    <View 
      className={cn("flex-1", className)} 
      {...props}
    >
      {children}
    </View>
  )

  return (
    <ScreenBackground>
      {safeArea ? (
        <SafeAreaView className="flex-1" edges={['top']}>
          {content}
        </SafeAreaView>
      ) : (
        content
      )}
    </ScreenBackground>
  )
}
