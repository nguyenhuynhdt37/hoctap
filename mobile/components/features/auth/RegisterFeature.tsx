import React, { useState } from 'react'
import { View, KeyboardAvoidingView, Platform, ScrollView, Image, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, Input } from '@/components/ui'
import { Text } from '@/components/ui/Text'
import { BackButton } from '@/components/ui/BackButton'
import { Feather, Ionicons } from '@expo/vector-icons'
import { authService } from '@/src/services/auth.service'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { useColorScheme } from 'nativewind'

export function RegisterFeature() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  
  const [email, setEmail] = useState('')
  const [fullname, setFullname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailTaken, setEmailTaken] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const router = useRouter()

  const handleCheckEmail = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    
    setCheckingEmail(true)
    try {
      const { data } = await authService.checkEmail(email)
      setEmailTaken(!data.available)
      if (!data.available) {
        setError(t('errors.EMAIL_TAKEN'))
      } else if (error === t('errors.EMAIL_TAKEN')) {
        setError('')
      }
    } catch (e) {
      console.error('Check email error:', e)
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleRegister = async () => {
    if (!email || !fullname || !password || !confirmPassword) {
      return setError(t('auth.enter_value'))
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError(t('auth.invalid_email'))
    }

    if (emailTaken) {
      return setError(t('errors.EMAIL_TAKEN'))
    }

    if (password !== confirmPassword) {
      return setError(t('auth.password_mismatch'))
    }

    if (password.length < 6) {
      return setError(t('auth.password_too_short'))
    }

    setError('')
    setLoading(true)
    try {
      await authService.register({
        email,
        full_name: fullname,
        password
      })
      // Chuyển sang màn hình Verify OTP
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email, purpose: 'authenticate' }
      })
    } catch (e: any) {
      const errorCode = e.response?.data?.detail?.error_code
      const errorMsg = errorCode ? t(`errors.${errorCode}`) : (e.response?.data?.detail?.message || e.message || t('common.error'))
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
              paddingTop: 16, 
              paddingBottom: Math.max(insets.bottom + 32, 56),
              flexGrow: 1,
            }} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentInsetAdjustmentBehavior="always"
          >
            {/* Header Section */}
            <Animated.View entering={FadeInUp.duration(800)} className="mb-8">
              <View className="flex-row items-center gap-4 mb-4">
                <Text className={`text-5xl font-extrabold tracking-tighter leading-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {t('auth.register_title')}
                </Text>

                <View className={`w-12 h-12 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/20 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`}>
                  <Ionicons name="person-add" size={28} color="#10B981" />
                </View>
              </View>

              <Text className={`text-lg leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {t('auth.register_msg')}
              </Text>
            </Animated.View>

            {/* Input Section */}
            <Animated.View entering={FadeInDown.delay(200).duration(800)} className="gap-5">
              <Input
                label={t('auth.fullname_label')}
                placeholder={t('auth.fullname_placeholder')}
                value={fullname}
                onChangeText={setFullname}
                leftSlot={<Feather name="user" size={20} color={isDark ? '#52525B' : '#A1A1AA'} />}
              />

              <Input
                label={t('auth.email_label')}
                placeholder={t('auth.email_placeholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(val) => {
                  setEmail(val)
                  if (emailTaken) setEmailTaken(false)
                  if (error === t('errors.EMAIL_TAKEN')) setError('')
                }}
                onBlur={handleCheckEmail}
                leftSlot={
                  checkingEmail ? (
                    <View className="mr-1">
                      <Ionicons name="refresh" size={20} color="#10B981" />
                    </View>
                  ) : (
                    <Feather name="mail" size={20} color={isDark ? '#52525B' : '#A1A1AA'} />
                  )
                }
                error={error && error === t('errors.EMAIL_TAKEN') ? error : ''}
              />

              <Input
                label={t('auth.password_label')}
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                leftSlot={<Feather name="lock" size={20} color={isDark ? '#52525B' : '#A1A1AA'} />}
              />

              <Input
                label={t('auth.confirm_password_label')}
                placeholder="••••••••"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                leftSlot={<Feather name="check-circle" size={20} color={isDark ? '#52525B' : '#A1A1AA'} />}
                error={error && error !== t('errors.EMAIL_TAKEN') ? error : ''}
              />

              <View className="mt-4">
                <Button
                  label={t('auth.register_button')}
                  onPress={handleRegister}
                  loading={loading}
                  disabled={emailTaken || checkingEmail}
                  size="lg"
                  fullWidth
                />
              </View>

              <View className="flex-row justify-center items-center gap-2 mt-4">
                <Text className={`${isDark ? 'text-zinc-500' : 'text-zinc-400'} font-medium`}>
                  {t('auth.already_have_account')}
                </Text>
                <Pressable onPress={() => router.replace('/(auth)/login')}>
                  <Text className="text-emerald-500 font-bold">
                    {t('auth.login_now')}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  )
}
