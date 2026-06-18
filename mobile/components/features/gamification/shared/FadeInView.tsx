import React from 'react'
import { ViewProps } from 'react-native'
import { MotiView } from 'moti'
import { GamificationMotion } from '../tokens'

interface FadeInViewProps extends ViewProps {
  children: React.ReactNode
  delay?: number
}

export function FadeInView({ children, delay = 0, style, ...props }: FadeInViewProps) {
  return (
    <MotiView
      from={GamificationMotion.fadeUp.from}
      animate={GamificationMotion.fadeUp.animate}
      transition={{
        ...GamificationMotion.fadeUp.transition,
        delay,
      }}
      style={style}
      {...props}
    >
      {children}
    </MotiView>
  )
}
