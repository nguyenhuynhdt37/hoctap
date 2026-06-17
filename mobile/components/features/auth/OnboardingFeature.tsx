import React, { useState, useEffect } from 'react'
import { View, Dimensions, BackHandler, Pressable, StyleSheet } from 'react-native'
import { useRouter, useRootNavigationState } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import { MotiView } from 'moti'
import { Audio } from 'expo-av'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image' // Use expo-image for better GIF performance
import { ThemeToggle, LanguageToggle } from '@/components/ui'
import { Text } from '@/components/ui/Text'
import { useAuthStore } from '@/src/stores/auth.store'
import { useColorScheme } from 'nativewind'

const { width, height } = Dimensions.get('window')
const START_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'

export function OnboardingFeature() {
  const router = useRouter()
  const rootNavigationState = useRootNavigationState()
  const insets = useSafeAreaInsets()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [sound, setSound] = useState<Audio.Sound | null>(null)

  const isNavReady = Boolean(rootNavigationState?.key)

  useEffect(() => {
    const backAction = () => {
      if (!isAuthenticated) {
        BackHandler.exitApp()
        return true
      }
      return false
    }
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)
    return () => backHandler.remove()
  }, [isAuthenticated])

  useEffect(() => {
    return sound ? () => { sound.unloadAsync() } : undefined
  }, [sound])

  const handleStart = async () => {
    if (!isNavReady) return
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    try {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: START_SOUND })
      setSound(newSound)
      await newSound.playAsync()
    } catch {}
    router.push('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      {/* 1. Background Image */}
      <Image 
        source={require('../../../assets/images/onboarding_world.png')} 
        style={StyleSheet.absoluteFill}
        contentFit="cover" 
      />

      {/* 2. Full-screen Gradient Overlay */}
      <LinearGradient
        colors={[
          'transparent', 
          isDark ? 'rgba(9,9,11,0.2)' : 'rgba(255,255,255,0.2)', 
          isDark ? 'rgba(9,9,11,0.85)' : 'rgba(255,255,255,0.85)',
          isDark ? '#09090b' : '#ffffff'
        ]}
        style={StyleSheet.absoluteFill}
      />



      {/* 4. Content Layer */}
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
        
        {/* Top bar - Language & Theme */}
        <View style={styles.topBar}>
          <LanguageToggle />
          <ThemeToggle minimal />
        </View>

        {/* Bottom Area */}
        <View style={styles.bottomSection}>
          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15, delay: 1000 }}
          >
            <View style={styles.badge}>
              <Text className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] tracking-[4px] uppercase">
                {t('auth.onboarding.badge')}
              </Text>
            </View>

            <Text className="text-5xl font-black text-zinc-900 dark:text-zinc-50 mb-4 tracking-tighter leading-[1.1]">
              {t('auth.onboarding.title')}
            </Text>

            <Text className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed font-bold mb-10">
              {t('auth.onboarding.description')}
            </Text>

            <Pressable onPress={handleStart}>
              {({ pressed }) => (
                <View style={[styles.button, pressed && styles.buttonPressed]}>
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.buttonText}>
                      {t('auth.onboarding.start')}
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </Pressable>

            <Text style={styles.version}>
              Phiên bản 2.0.26 • NeuralEarn AI
            </Text>
          </MotiView>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    zIndex: 100,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 24,
  },
  button: {
    height: 68,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#10b981',
    borderBottomWidth: 4,
    borderBottomColor: '#064e3b',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
  },
  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'BeVietnamPro-Black',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  version: {
    textAlign: 'center',
    marginTop: 24,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  }
})
