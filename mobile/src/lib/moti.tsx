/**
 * Shim for moti → react-native-reanimated
 * moti@0.30.0 vẫn dùng framer-motion@6 không tương thích RN 0.81 / Expo 54.
 * Thay thế bằng reanimated + Animated từ react-native là hoàn toàn tương thích.
 */
import React from 'react'
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated'
import {
  type ViewStyle,
  type StyleProp,
} from 'react-native'

interface MotiViewProps {
  children?: React.ReactNode
  from?: Record<string, any>
  animate?: Record<string, any>
  exit?: Record<string, any>
  transition?: Record<string, unknown>
  style?: StyleProp<ViewStyle>
  className?: string
  [key: string]: any
}

interface AnimatePresenceProps {
  children?: React.ReactNode
  exitBeforeEnter?: boolean
}

export function AnimatePresence({ children }: AnimatePresenceProps) {
  return <>{children}</>
}

export function MotiView({ children, animate, style, from, transition, className, ...rest }: MotiViewProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (!animate) return {}
    const styleObj = typeof animate === 'object' && !Array.isArray(animate) ? animate : {}
    const last = (value: any, fallback: any) => {
      if (Array.isArray(value)) return value[value.length - 1] ?? fallback
      return value ?? fallback
    }

    return {
      opacity: last(styleObj.opacity, 1),
      transform: [
        { scale: last(styleObj.scale, 1) },
        { translateX: last(styleObj.translateX ?? styleObj.x, 0) },
        { translateY: last(styleObj.translateY ?? styleObj.y, 0) },
        { rotate: last(styleObj.rotate, '0deg') },
      ],
    }
  }, [animate])

  return (
    <Animated.View className={className} style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  )
}

export { useAnimatedStyle, withSpring, withTiming, interpolate, Extrapolate }
