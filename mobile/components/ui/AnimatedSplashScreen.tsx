import React, { useEffect, useState } from 'react'
import { View, StyleSheet, Dimensions, Image } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'

const { width: SCREEN_W } = Dimensions.get('window')

interface AnimatedSplashScreenProps {
  isDark: boolean
  isAppReady: boolean
  onAnimationComplete: () => void
}

export function AnimatedSplashScreen({
  isDark,
  isAppReady,
  onAnimationComplete,
}: AnimatedSplashScreenProps) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  const logoScale = useSharedValue(0.7)
  const logoOpacity = useSharedValue(0)
  const splashOpacity = useSharedValue(1)

  // Entrance Animation on mount
  useEffect(() => {
    logoScale.value = withSpring(1.0, {
      damping: 12,
      stiffness: 100,
    })
    logoOpacity.value = withTiming(1, { duration: 600 })

    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, 1200) // 1.2s minimum duration to showcase custom splash branding

    return () => clearTimeout(timer)
  }, [])

  // Exit Animation when app is ready and min time has elapsed
  useEffect(() => {
    if (isAppReady && minTimeElapsed) {
      // Premium "Bung" transition: Zoom logo out of screen and fade out the container
      logoScale.value = withTiming(2.2, { duration: 500 })
      logoOpacity.value = withTiming(0, { duration: 400 })
      splashOpacity.value = withTiming(0, { duration: 500 }, (isFinished) => {
        if (isFinished) {
          runOnJS(onAnimationComplete)()
        }
      })
    }
  }, [isAppReady, minTimeElapsed, onAnimationComplete])

  const containerStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }))

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }))

  // Set theme properties
  const bgColors: [string, string] = isDark ? ['#0A0A0F', '#050508'] : ['#FAFAFF', '#F0FAFB']
  const glowColor = isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)'

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.container, containerStyle]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.centerContainer}>
          {/* Soft Glow behind the logo */}
          <View
            style={[
              styles.glow,
              {
                backgroundColor: glowColor,
              },
            ]}
          />

          {/* Logo */}
          <Animated.View style={[styles.logoWrapper, logoStyle]}>
            <Image
              source={require('../../assets/images/splash-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  logoWrapper: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
})
