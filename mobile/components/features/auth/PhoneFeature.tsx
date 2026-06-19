import React, { useState } from 'react'
import { View, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions, useColorScheme, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, Input } from '@/components/ui'
import { Text } from '@/components/ui/Text'
import { BackButton } from '@/components/ui/BackButton'
import { Feather, Ionicons } from '@expo/vector-icons'
import { authService } from '@/src/services/auth.service'
import { useAuthStore } from '@/src/stores/auth.store'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { SocialAuthFeature } from './SocialAuthFeature'
import { useTranslation } from 'react-i18next'

const { width, height } = Dimensions.get('window')

export function PhoneFeature() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<'phone' | 'email'>('phone')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { bypassLogin, login } = useAuthStore()
  const isDark = useColorScheme() === 'dark'

  const handleContinue = async () => {
    if (!value) return setError(t('auth.enter_value'))
    
    if (mode === 'phone' && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(value)) {
      return setError(t('auth.invalid_phone'))
    }
    if (mode === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return setError(t('auth.invalid_email'))
    }

    setError('')
    setLoading(true)
    try {
      let identifier = value
      if (mode === 'phone') {
        identifier = value.startsWith('0') ? `+84${value.slice(1)}` : value
      }
      
      const { data } = await authService.sendOtp(identifier, 'authenticate')
      
      router.push({ 
        pathname: '/(auth)/verify-otp', 
        params: { 
          [mode]: identifier, 
          purpose: 'authenticate',
          resend_available_in: data.resend_available_in,
          otp_expires_in: data.otp_expires_in
        } 
      })
    } catch (e: any) {
      const errorCode = e.response?.data?.detail?.code
      const errorMsg = errorCode ? t(`errors.${errorCode}`) : (e.response?.data?.detail?.message || e.message || t('common.error'))
      setError(errorMsg)
    } finally { setLoading(false) }
  }

  return (
    <View className="flex-1 bg-black">
      {/* Immersive World Background (Original) */}
      <View className="absolute inset-0">
        <Image
          source={require('@/assets/images/onboarding_world.png')}
          className="absolute inset-0 w-full h-full"
          resizeMode="cover"
          blurRadius={Platform.OS === 'ios' ? 12 : 6}
        />
        <LinearGradient
          colors={[
            isDark ? 'rgba(9,9,11,0.6)' : 'rgba(255,255,255,0.4)',
            isDark ? 'rgba(9,9,11,0.95)' : 'rgba(255,255,255,0.92)',
            isDark ? '#09090b' : '#ffffff'
          ]}
          className="absolute inset-0"
        />
      </View>

      <View style={{ paddingTop: insets.top }} className="flex-1">
        <View className="px-6 py-3 z-[100]">
          <BackButton
            size={26}
            className={`w-[52px] h-[52px] border ${isDark ? 'bg-white/15 border-white/10' : 'bg-black/5 border-black/10'}`}
          />
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={{ 
              paddingHorizontal: 24, 
              paddingTop: 32, 
              minHeight: height * 0.7,
              paddingBottom: Math.max(insets.bottom, 40) 
            }} 
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View className="mb-10">
              <View className="flex-row items-center gap-4 mb-4">
                <Text className={`text-5xl font-extrabold tracking-tighter leading-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {mode === 'phone' ? t('auth.welcome') : t('auth.email_login')}
                </Text>

                <View className={`w-12 h-12 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/20 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`}>
                  <Ionicons name={mode === 'phone' ? 'library' : 'mail'} size={28} color="#10B981" />
                </View>
              </View>

              <Text className={`text-lg leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {mode === 'phone' ? t('auth.phone_msg') : t('auth.email_msg')}
              </Text>
            </View>

            {/* Input & Action Section */}
            <View className="gap-6">
              <Input
                label={mode === 'phone' ? t('auth.phone_placeholder') : t('auth.email_label')}
                placeholder={mode === 'phone' ? '0912 345 678' : t('auth.email_placeholder')}
                keyboardType={mode === 'phone' ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
                value={value}
                onChangeText={setValue}
                error={error}
                leftSlot={<Feather name={mode === 'phone' ? 'phone' : 'mail'} size={24} color={isDark ? '#A1A1AA' : '#71717A'} />}
              />

              <Button label={t('auth.continue')} onPress={handleContinue} loading={loading} fullWidth size="lg" />

              <View className="flex-row justify-between items-center px-1">
                <Pressable
                  onPress={() => { setMode(mode === 'phone' ? 'email' : 'phone'); setValue(''); setError('') }}
                  className="py-1"
                >
                  <Text style={{ color: isDark ? '#34D399' : '#059669' }} className="font-bold underline text-base">
                    {mode === 'phone' ? t('auth.use_email') : t('auth.use_phone')}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(auth)/login')}
                  className="py-1"
                >
                  <Text style={{ color: isDark ? '#34D399' : '#059669' }} className="font-bold underline text-base">
                    {t('auth.use_password')}
                  </Text>
                </Pressable>
              </View>

              <SocialAuthFeature />

              <Button
                label={t('auth.onboarding.try_dev')}
                onPress={async () => { setLoading(true); await bypassLogin(); router.replace('/') }}
                variant="ghost"
                fullWidth
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  )
}
