/**
 * Celebration Component
 * High-fidelity fireworks effect using ConfettiCannon
 */

import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet, Dimensions } from 'react-native'
import { Feather } from '@expo/vector-icons'
import ConfettiCannon from 'react-native-confetti-cannon'
import { Text } from '@/components/ui'
import type { CelebrationType } from '../../types'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface CelebrationProps {
  visible: boolean
  type: CelebrationType
  message?: string
  subMessage?: string
  onDismiss?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// BANNER
// ═══════════════════════════════════════════════════════════════════════════════

interface BannerProps {
  type: CelebrationType
  message: string
  subMessage?: string
}

function CelebrationBanner({ type, message, subMessage }: BannerProps) {
  const scale = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }, [scale, opacity])

  const configs: Record<CelebrationType, { bg: string; icon: string; color: string }> = {
    lesson_complete: { bg: 'bg-emerald-500', icon: 'check-circle', color: '#FFFFFF' },
    quiz_pass: { bg: 'bg-blue-500', icon: 'award', color: '#FFFFFF' },
    quiz_fail: { bg: 'bg-amber-500', icon: 'alert-circle', color: '#FFFFFF' },
    code_pass: { bg: 'bg-purple-500', icon: 'code', color: '#FFFFFF' },
    streak: { bg: 'bg-orange-500', icon: 'zap', color: '#FFFFFF' },
  }

  const config = configs[type]

  return (
    <Animated.View
      style={[
        styles.banner,
        { opacity, transform: [{ scale }] },
      ]}
    >
      <View className={`w-16 h-16 rounded-full ${config.bg} items-center justify-center mb-3 shadow-lg`}>
        <Feather name={config.icon as any} size={32} color={config.color} />
      </View>
      <Text className="text-xl font-extrabold text-white mb-1">{message}</Text>
      {subMessage && (
        <Text className="text-white/80 text-sm text-center px-4">{subMessage}</Text>
      )}
    </Animated.View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CELEBRATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const CONFETTI_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

export function Celebration({ visible, type, message, subMessage }: CelebrationProps) {
  if (!visible) return null

  const Cannon = ConfettiCannon as any;

  const defaultMessages: Record<CelebrationType, { message: string; subMessage: string }> = {
    lesson_complete: { message: 'Hoàn thành!', subMessage: 'Bạn đã hoàn thành bài học này' },
    quiz_pass: { message: 'Xuất sắc!', subMessage: 'Bạn đã vượt qua bài kiểm tra' },
    quiz_fail: { message: 'Cố gắng lên!', subMessage: 'Hãy ôn lại bài và thử lại nhé' },
    code_pass: { message: 'Code chạy thành công!', subMessage: 'Tất cả test cases đều pass' },
    streak: { message: 'Giữ streak!', subMessage: 'Tiếp tục phong độ nhé' },
  }

  const finalMessage = message ?? defaultMessages[type]?.message ?? 'Chúc mừng!'
  const finalSubMessage = subMessage ?? defaultMessages[type]?.subMessage

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Left Cannon */}
      <Cannon
        count={80}
        origin={{ x: -20, y: SCREEN_H * 0.8 }}
        fadeOut
        autoStart={true}
        explosionSpeed={350}
        fallSpeed={3000}
        colors={CONFETTI_COLORS}
        blastDirection={-45}
      />

      {/* Right Cannon */}
      <Cannon
        count={80}
        origin={{ x: SCREEN_W + 20, y: SCREEN_H * 0.8 }}
        fadeOut
        autoStart={true}
        explosionSpeed={350}
        fallSpeed={3000}
        colors={CONFETTI_COLORS}
        blastDirection={-135}
      />

      {/* Center Fireworks Effect */}
      <Cannon
        count={50}
        origin={{ x: SCREEN_W / 2, y: SCREEN_H / 2 }}
        fadeOut
        autoStart={true}
        explosionSpeed={400}
        fallSpeed={2500}
        colors={CONFETTI_COLORS}
      />

      {/* Banner */}
      <View style={StyleSheet.absoluteFill} className="items-center justify-center">
        <CelebrationBanner
          type={type}
          message={finalMessage}
          subMessage={finalSubMessage}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  banner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
})
