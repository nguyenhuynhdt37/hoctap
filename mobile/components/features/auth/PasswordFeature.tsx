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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'

const { height } = Dimensions.get('window')

export function PasswordFeature() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuthStore()
  const isDark = useColorScheme() === 'dark'

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      return setError(t('auth.enter_value'))
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return setError(t('auth.invalid_email'))
    }

    setError('')
    setLoading(true)
    try {
      const { data } = await authService.loginWithEmail(normalizedEmail, password)
      await login(data.access_token, data.refresh_token, data.session_id)
      router.replace('/(app)')
    } catch (e: any) {
      const detail = e.response?.data?.detail
      const errorCode = detail?.error_code || detail?.code

      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        const params: Record<string, string> = {
          email: normalizedEmail,
          purpose: 'authenticate',
          notice: 'EMAIL_NOT_VERIFIED',
        }

        try {
          const { data } = await authService.sendOtp(normalizedEmail, 'authenticate')
          if (data.resend_available_in != null) params.resend_available_in = String(data.resend_available_in)
          if (data.otp_expires_in != null) params.otp_expires_in = String(data.otp_expires_in)
        } catch {
          // The verify screen still allows manual resend if the automatic resend is rate-limited.
        }

        setError(t('errors.EMAIL_NOT_VERIFIED'))
        router.push({
          pathname: '/(auth)/verify-otp',
          params,
        })
        return
      }

      const errorMsg = errorCode ? t(`errors.${errorCode}`) : (detail?.message || e.message || t('common.error'))
      setError(errorMsg)
    } finally { setLoading(false) }
  }

  return (
    <View className="flex-1 bg-black">
      {/* Immersive Background */}
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
            <Animated.View entering={FadeInUp.duration(800)} className="mb-10">
              <View className="flex-row items-center gap-4 mb-4">
                <Text className={`text-5xl font-extrabold tracking-tighter leading-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {t('auth.password_login')}
                </Text>

                <View className={`w-12 h-12 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/20 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`}>
                  <Ionicons name="lock-closed" size={28} color="#10B981" />
                </View>
              </View>

              <Text className={`text-lg leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {t('auth.password_msg')}
              </Text>
            </Animated.View>

            {/* Input & Action Section */}
            <Animated.View entering={FadeInDown.delay(200).duration(800)} className="gap-6">
              <Input
                label={t('auth.email_label')}
                placeholder={t('auth.email_placeholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                error={error && !password ? error : ''}
                leftSlot={<Feather name="mail" size={24} color={isDark ? '#A1A1AA' : '#71717A'} />}
              />

              <Input
                label={t('auth.password_label')}
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                error={error && password ? error : ''}
                leftSlot={<Feather name="lock" size={24} color={isDark ? '#A1A1AA' : '#71717A'} />}
              />

              <View className="flex-row justify-end mb-2">
                <Pressable onPress={() => {/* Handle forgot password */}}>
                  <Text style={{ color: '#10B981' }} className="font-bold text-base">
                    {t('auth.forgot_password')}?
                  </Text>
                </Pressable>
              </View>

              <Button label={t('auth.login')} onPress={handleLogin} loading={loading} fullWidth size="lg" />

              <View className="flex-row justify-center items-center gap-2 mt-4">
                <Text className={`${isDark ? 'text-zinc-500' : 'text-zinc-400'} font-medium`}>
                  {t('auth.dont_have_account')}
                </Text>
                <Pressable onPress={() => router.push('/(auth)/register')}>
                  <Text className="text-emerald-500 font-bold">
                    {t('auth.register_now')}
                  </Text>
                </Pressable>
              </View>

              <SocialAuthFeature />
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  )
}
