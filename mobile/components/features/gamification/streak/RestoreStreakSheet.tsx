import React, { useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Feather } from '@expo/vector-icons'
import { GamificationColors, GamificationRadius } from '../tokens'

const { height: SH } = Dimensions.get('window')
const SHEET_HEIGHT = 380

interface RestoreStreakSheetProps {
  visible: boolean
  onClose: () => void
  streakFreezes: number
  onRestore: () => Promise<void>
  isSubmitting: boolean
  isDark: boolean
}

export function RestoreStreakSheet({
  visible,
  onClose,
  streakFreezes,
  onRestore,
  isSubmitting,
  isDark,
}: RestoreStreakSheetProps) {
  const translateY = useSharedValue(SHEET_HEIGHT)
  const backdropOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 250 })
      translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) })
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) })
      translateY.value = withTiming(SHEET_HEIGHT, {
        duration: 250,
        easing: Easing.in(Easing.ease),
      })
    }
  }, [visible, backdropOpacity, translateY])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  const handleRestore = async () => {
    if (isSubmitting || streakFreezes <= 0) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await onRestore()
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
          disabled={isSubmitting}
        >
          <Animated.View
            style={[
              {
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.52)',
              },
              backdropStyle,
            ]}
          />
        </Pressable>

        {/* Sheet */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: SHEET_HEIGHT,
              borderTopLeftRadius: GamificationRadius['3xl'],
              borderTopRightRadius: GamificationRadius['3xl'],
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.20,
              shadowRadius: 24,
              elevation: 24,
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: Platform.OS === 'ios' ? 40 : 28,
            },
            sheetStyle,
          ]}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? '#3f3f46' : '#e4e4e7',
              }}
            />
          </View>

          {/* Icon Header */}
          <View className="items-center mt-3">
            <View className="w-16 h-16 rounded-full bg-sky-500/15 items-center justify-center mb-4 border border-sky-500/25">
              <Feather name="wind" size={30} color="#0EA5E9" />
            </View>
            <Text className={`font-black text-xl text-center ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Khôi phục chuỗi học tập
            </Text>
            <Text className={`text-center text-sm mt-3 leading-relaxed px-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Chuỗi Streak của bạn đã bị gián đoạn. Bạn có muốn sử dụng 1 lượt đóng băng để phục hồi chuỗi ngày liên tục không?
            </Text>
          </View>

          {/* Freeze Info */}
          <View className="items-center mt-5">
            <View className={`flex-row items-center px-4 py-2 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <Text className={`font-black text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                ❄ Bạn đang có {streakFreezes} lượt Đóng băng
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-6">
            <Pressable
              className="flex-1 py-3.5 rounded-full border border-zinc-200 dark:border-zinc-800 items-center justify-center"
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text className={`font-black text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Bỏ qua
              </Text>
            </Pressable>

            <Pressable
              className={`flex-1 py-3.5 rounded-full items-center justify-center ${
                streakFreezes > 0 
                  ? 'bg-sky-500' 
                  : 'bg-zinc-300 dark:bg-zinc-800'
              }`}
              onPress={handleRestore}
              disabled={isSubmitting || streakFreezes <= 0}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-black text-sm">
                  Khôi phục (1 ❄)
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}
