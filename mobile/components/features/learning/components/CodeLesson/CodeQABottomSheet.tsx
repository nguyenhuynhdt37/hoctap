import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui'
import { QATab } from '../QATab'

interface CodeQABottomSheetProps {
  visible: boolean
  lessonId?: string
  lessonTitle?: string
  initialCommentId?: string
  isDark: boolean
  onClose: () => void
}

export function CodeQABottomSheet({
  visible,
  lessonId,
  lessonTitle,
  initialCommentId,
  isDark,
  onClose,
}: CodeQABottomSheetProps) {
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const translateY = useRef(new Animated.Value(height)).current

  const sheetHeight = useMemo(() => {
    const availableHeight = height - insets.top - 12
    return Math.min(height * 0.88, availableHeight)
  }, [height, insets.top])

  const closeWithAnimation = useCallback(() => {
    Animated.timing(translateY, {
      toValue: sheetHeight + insets.bottom + 32,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose()
    })
  }, [insets.bottom, onClose, sheetHeight, translateY])

  useEffect(() => {
    if (visible) {
      translateY.setValue(sheetHeight + insets.bottom + 32)
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
      }).start()
    }
  }, [insets.bottom, sheetHeight, translateY, visible])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy > 0) {
        translateY.setValue(gesture.dy)
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 90 || gesture.vy > 0.8) {
        closeWithAnimation()
        return
      }
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 220,
      }).start()
    },
  }), [closeWithAnimation, translateY])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeWithAnimation}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={closeWithAnimation}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <Animated.View
            style={{
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY }],
            }}
            className={`overflow-hidden rounded-t-[28px] border-t ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <View
              {...panResponder.panHandlers}
              className={`border-b px-4 pb-3 pt-3 ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'}`}
            >
              <View className="items-center pb-2">
                <View className={`h-1.5 w-12 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
              </View>

              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1 pr-2">
                  <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    Hỏi & Đáp
                  </Text>
                  <Text numberOfLines={1} className={`mt-0.5 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {lessonTitle ?? 'Lesson Code'}
                  </Text>
                </View>

                <Pressable
                  onPress={closeWithAnimation}
                  hitSlop={12}
                  className={`z-20 h-11 w-11 items-center justify-center rounded-full ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}
                >
                  <Ionicons name="close" size={22} color={isDark ? '#FFFFFF' : '#18181B'} />
                </Pressable>
              </View>
            </View>

            <View className="flex-1">
              {lessonId ? (
                <QATab
                  lessonId={lessonId}
                  initialCommentId={initialCommentId}
                  hideHeader
                />
              ) : null}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
