/**
 * PeakAnimation – Coin bay lên + Peak counter tăng.
 * Trigger khi claim thành công.
 *
 * Hai phần:
 *  1. FlyingCoins  – 5 coin từ nút bay lên, fade out
 *  2. PeakCounter  – số tăng từ before → after với spring
 */

import React, { useEffect, useCallback } from 'react'
import { View, Text as RNText, StyleSheet, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { GamificationColors } from '../../tokens'

const { width: SW } = Dimensions.get('window')

// ─────────────────────────────────────────────────────────────
// Flying Coin particle
// ─────────────────────────────────────────────────────────────

function FlyingCoin({ index, onDone }: { index: number; onDone?: () => void }) {
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const opacity = useSharedValue(1)
  const scale = useSharedValue(0.4)

  useEffect(() => {
    const xSpread = (Math.random() - 0.5) * 80
    const delay = index * 90

    tx.value = withDelay(delay, withSpring(xSpread, { damping: 14, stiffness: 120 }))
    ty.value = withDelay(
      delay,
      withSequence(
        withSpring(-90 - Math.random() * 60, { damping: 12, stiffness: 100 }),
        withTiming(-140, { duration: 200 }),
      ),
    )
    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.2, { damping: 10, stiffness: 220 }),
        withSpring(0.8, { damping: 14 }),
      ),
    )
    opacity.value = withDelay(
      delay + 300,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }, (done) => {
        if (done && onDone) runOnJS(onDone)()
      }),
    )
  }, [index, onDone, opacity, scale, tx, ty])

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[styles.coin, animStyle]}>
      <RNText style={{ fontSize: 20 }}>⭐</RNText>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────
// PeakCounter – number rolling animation
// ─────────────────────────────────────────────────────────────

interface PeakCounterProps {
  value: number
  isDark: boolean
  size?: 'sm' | 'lg'
}

export function PeakCounter({ value, isDark, size = 'lg' }: PeakCounterProps) {
  const displayVal = useSharedValue(value)
  const scale = useSharedValue(1)

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 }] }))

  const fontSize = size === 'lg' ? 28 : 18
  const labelSize = size === 'lg' ? 12 : 10

  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }, scaleStyle]}>
      <RNText style={{ fontSize: size === 'lg' ? 22 : 16 }}>⭐</RNText>
      <RNText
        style={{
          fontSize,
          fontWeight: '900',
          color: GamificationColors.peak.DEFAULT,
          letterSpacing: -0.8,
        }}
      >
        {value.toLocaleString('vi-VN')}
      </RNText>
      <RNText
        style={{
          fontSize: labelSize,
          fontWeight: '700',
          color: isDark ? '#a1a1aa' : '#71717a',
          paddingBottom: 3,
          letterSpacing: 0.4,
        }}
      >
        PEAK
      </RNText>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────
// PeakAnimation – orchestrates coins + counter pop
// ─────────────────────────────────────────────────────────────

interface PeakAnimationProps {
  /** Trigger when true */
  trigger: boolean
  peakEarned: number
  isDark: boolean
}

export function PeakAnimation({ trigger, peakEarned, isDark }: PeakAnimationProps) {
  const [coins, setCoins] = React.useState<number[]>([])
  const popScale = useSharedValue(1)
  const popOpacity = useSharedValue(0)

  useEffect(() => {
    if (!trigger) return

    // Spawn coins
    setCoins([0, 1, 2, 3, 4])

    // Pop label
    popOpacity.value = withTiming(1, { duration: 150 })
    popScale.value = withSequence(
      withSpring(1.4, { damping: 8, stiffness: 300 }),
      withDelay(1000, withTiming(0, { duration: 300 })),
    )
    const t = setTimeout(() => {
      popOpacity.value = withTiming(0, { duration: 300 })
      setCoins([])
    }, 1600)
    return () => clearTimeout(t)
  }, [trigger, popOpacity, popScale])

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
    opacity: popOpacity.value,
  }))

  if (!trigger && coins.length === 0) return null

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Coins */}
      {coins.map((_, i) => (
        <FlyingCoin key={i} index={i} />
      ))}

      {/* +N PEAK pop label */}
      <Animated.View style={[styles.popLabel, popStyle]}>
        <RNText
          style={{
            fontSize: 22,
            fontWeight: '900',
            color: GamificationColors.peak.DEFAULT,
            letterSpacing: -0.5,
          }}
        >
          +{peakEarned} Peak
        </RNText>
      </Animated.View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    pointerEvents: 'none',
  },
  coin: {
    position: 'absolute',
  },
  popLabel: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
  },
})
