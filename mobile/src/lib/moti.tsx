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

export function MotiView({ 
  children, 
  animate, 
  style, 
  from, 
  transition, 
  exit, 
  state, 
  className, 
  ...rest 
}: MotiViewProps) {
  const styleObj = typeof animate === 'object' && !Array.isArray(animate) ? animate : {};
  const opacityVal = styleObj.opacity;
  const scaleVal = styleObj.scale;
  const txVal = styleObj.translateX ?? styleObj.x;
  const tyVal = styleObj.translateY ?? styleObj.y;
  const rotateVal = styleObj.rotate;

  const animatedStyle = useAnimatedStyle(() => {
    const last = (value: any, fallback: any) => {
      if (Array.isArray(value)) return value[value.length - 1] ?? fallback;
      return value ?? fallback;
    };

    return {
      opacity: last(opacityVal, 1),
      transform: [
        { scale: last(scaleVal, 1) },
        { translateX: last(txVal, 0) },
        { translateY: last(tyVal, 0) },
        { rotate: last(rotateVal, '0deg') },
      ],
    };
  }, [opacityVal, scaleVal, txVal, tyVal, rotateVal]);

  return (
    <Animated.View className={className} style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
}

export { useAnimatedStyle, withSpring, withTiming, interpolate, Extrapolate }
