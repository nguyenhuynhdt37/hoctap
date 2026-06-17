import React from 'react'
import { View, StyleSheet, Image, Dimensions } from 'react-native'
import { Text } from './Text'
import { Button } from './Button'
import { Feather } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/src/stores/auth.store'
import { MotiView } from 'moti'
import { useColorScheme } from 'nativewind'
import { LinearGradient } from 'expo-linear-gradient'

const { width, height } = Dimensions.get('window')

export function NetworkErrorScreen() {
  const { t } = useTranslation()
  const initialize = useAuthStore(s => s.initialize)
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <View style={styles.container}>
      <Image 
        source={require('@/assets/images/onboarding_world.png')} 
        style={StyleSheet.absoluteFill} 
        resizeMode="cover"
        blurRadius={10}
      />
      <LinearGradient
        colors={[
          isDark ? 'rgba(9,9,11,0.6)' : 'rgba(255,255,255,0.4)',
          isDark ? 'rgba(9,9,11,0.95)' : 'rgba(255,255,255,0.92)',
          isDark ? '#09090b' : '#ffffff'
        ]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(244,63,94,0.1)' : 'rgba(244,63,94,0.05)' }]}
        >
          <Feather name="wifi-off" size={60} color="#F43F5E" />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200 }}
          style={{ alignItems: 'center' }}
        >
          <Text style={{ color: isDark ? '#fff' : '#09090b' }} className="text-4xl font-black tracking-tighter mb-4 text-center">
            {t('errors.NETWORK_ERROR') || 'Connection Lost'}
          </Text>
          <Text style={{ color: isDark ? '#A1A1AA' : '#52525B' }} className="text-lg text-center leading-relaxed px-10 mb-12">
            {t('errors.NETWORK_DESC') || 'We couldn\'t reach the server. Please check your internet connection and try again.'}
          </Text>

          <Button 
            label={t('common.retry') || 'Retry Connection'} 
            onPress={initialize} 
            size="lg"
            fullWidth
            className="shadow-xl shadow-emerald-500/30"
          />
        </MotiView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrapper: { 
    width: 140, 
    height: 140, 
    borderRadius: 70, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.2)'
  }
})
