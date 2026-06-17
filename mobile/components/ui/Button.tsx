import React, { useRef } from 'react'
import { Pressable, View, Text, ActivityIndicator, Animated, StyleSheet, Platform, useColorScheme } from 'react-native'
import { cn } from '@/src/lib/utils'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'
type IconFamily = 'feather' | 'ionicons'

interface ButtonProps {
  label: string
  onPress?: () => void
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  iconName?: string
  iconFamily?: IconFamily
  iconColor?: string
  className?: string
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, fullWidth = false, 
  iconName, iconFamily = 'feather', iconColor, className
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const isDisabled = disabled || loading
  const isDark = useColorScheme() === 'dark'

  const handlePressIn = () => {
    if (isDisabled) return
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12
    }).start()
  }

  const handlePress = () => {
    if (isDisabled) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress?.()
  }

  const getPadding = () => {
    switch (size) {
      case 'sm': return { py: 10, px: 20, text: 'text-sm' }
      case 'lg': return { py: 18, px: 40, text: 'text-xl' }
      default: return { py: 16, px: 32, text: 'text-lg' }
    }
  }

  const p = getPadding()

  const renderIcon = () => {
    if (!iconName) return null
    const iconSize = size === 'sm' ? 20 : 26
    
    // Quy tắc NeuralEarn 2026: Không dùng icon có màu sắc gốc (Google, Github). 
    // Mặc định dùng Trắng/Đen tùy theo Theme hoặc màu Emerald dự án.
    let defaultColor = isDark ? '#FFFFFF' : '#09090B'
    if (variant === 'primary' || variant === 'danger') defaultColor = '#FFFFFF'
    if (variant === 'outline' || variant === 'ghost') defaultColor = isDark ? '#34D399' : '#059669'
    
    const finalColor = iconColor || defaultColor
    
    if (iconFamily === 'ionicons') {
      return <Ionicons name={iconName as any} size={iconSize} color={finalColor} />
    }
    return <Feather name={iconName as any} size={iconSize} color={finalColor} />
  }

  const renderContent = () => (
    <View
      style={{ 
        paddingVertical: p.py, 
        paddingHorizontal: p.px,
        borderRadius: 9999,
      }}
      className={cn(
        "flex-row items-center justify-center gap-3.5",
        variant === 'secondary' && "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
        variant === 'outline' && "bg-primary/5 border-2 border-primary/40",
        variant === 'ghost' && "bg-transparent",
        variant === 'danger' && "bg-rose-500",
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#10B981' : '#ffffff'} />
      ) : (
        <>
          {renderIcon()}
          <Text
            style={{ includeFontPadding: false, textAlignVertical: 'center' }}
            className={cn(
              p.text, 'font-extrabold tracking-tight',
              variant === 'primary' && 'text-white',
              variant === 'secondary' && 'text-zinc-900 dark:text-zinc-50',
              (variant === 'outline' || variant === 'ghost') && 'text-primary',
              variant === 'danger' && 'text-white'
            )}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  )

  return (
    <Animated.View 
      style={{ 
        width: fullWidth ? '100%' : 'auto',
        transform: [{ scale: scaleAnim }],
        ...(variant === 'primary' && styles.primaryShadow)
      }}
      className={className}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={{ borderRadius: 9999, overflow: 'hidden' }}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 9999 }}
          >
            {renderContent()}
          </LinearGradient>
        ) : (
          renderContent()
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  primaryShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
})
