import React, { useState, useEffect } from 'react'
import { View, KeyboardAvoidingView, Platform, ScrollView, Image, Dimensions, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, OTPInput } from '@/components/ui'
import { Text } from '@/components/ui/Text'
import { BackButton } from '@/components/ui/BackButton'
import { Feather, Ionicons } from '@expo/vector-icons'
import { authService } from '@/src/services/auth.service'
import { useAuthStore } from '@/src/stores/auth.store'
import { showLocalNotification } from '@/src/utils/notifications'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { useColorScheme } from 'nativewind'

const { height } = Dimensions.get('window')

interface Props {
  identifier: string
  purpose: 'authenticate' | 'reset_password'
  initialResendCooldown?: number
  initialOtpExpiry?: number
  initialNoticeKey?: string
}

export function VerifyOTPFeature({ 
  identifier, 
  purpose, 
  initialResendCooldown = 60,
  initialOtpExpiry = 300,
  initialNoticeKey,
}: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(initialResendCooldown)
  const [otpExpiry, setOtpExpiry] = useState(initialOtpExpiry)
  const [confirmCooldown, setConfirmCooldown] = useState(0)
  const [noticeKey, setNoticeKey] = useState(initialNoticeKey || '')
  const router = useRouter()
  const { saveTokens } = useAuthStore()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  // Cooldown Timer
  useEffect(() => {
    const timer = countdown > 0 ? setInterval(() => setCountdown(c => c - 1), 1000) : null
    return () => { if (timer) clearInterval(timer) }
  }, [countdown])

  // OTP Expiry Timer
  useEffect(() => {
    const timer = otpExpiry > 0 ? setInterval(() => setOtpExpiry(c => c - 1), 1000) : null
    return () => { if (timer) clearInterval(timer) }
  }, [otpExpiry])

  // Confirm Cooldown Timer
  useEffect(() => {
    const timer = confirmCooldown > 0 ? setInterval(() => setConfirmCooldown(c => c - 1), 1000) : null
    return () => { if (timer) clearInterval(timer) }
  }, [confirmCooldown])

  const handleVerify = async () => {
    if (otp.length < 6) return
    setError('')
    setNoticeKey('')
    setLoading(true)
    try {
      let data: any
      
      // Nếu là email và đang trong luồng xác thực (sau đăng ký)
      if (identifier.includes('@') && purpose === 'authenticate') {
        const response = await authService.verifyEmail({ email: identifier, code: otp })
        data = response.data
      } else {
        const response = await authService.verifyOtp(identifier, otp, purpose)
        data = response.data
      }

      if (purpose === 'authenticate') {
        // Hiển thị thông báo thành công
        showLocalNotification(
          t('auth.verify_success', { defaultValue: 'Xác thực thành công!' }),
          t('auth.verify_welcome', { defaultValue: 'Chào mừng bạn đến với StudyNest.' })
        )
        
        await saveTokens(data)
        router.replace('/')
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail
      const errorCode = detail?.error_code || detail?.code
      const errorMsg = errorCode ? t(`errors.${errorCode}`) : (detail?.message || e.message || t('auth.otp_invalid'))
      setError(errorMsg)
      setConfirmCooldown(10)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setError('')
    setNoticeKey('')
    try {
      const { data } = await authService.sendOtp(identifier, purpose)
      setCountdown(data.resend_available_in || 60)
      setOtpExpiry(data.otp_expires_in || 300)
      setOtp('')
    } catch (e: any) {
      const detail = e.response?.data?.detail
      const errorCode = detail?.error_code || detail?.code
      setError(errorCode ? t(`errors.${errorCode}`) : (detail?.message || e.message || t('common.error')))
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <View className="flex-1 bg-black">
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
            <Animated.View entering={FadeInUp.duration(800)} className="mb-10">
              <View className="flex-row items-center gap-4 mb-4">
                <Text className={`text-5xl font-extrabold tracking-tighter leading-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {t('auth.verify_title')}
                </Text>

                <View className={`w-12 h-12 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/20 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`}>
                  <Ionicons name="shield-checkmark" size={28} color="#10B981" />
                </View>
              </View>

              <Text className={`text-lg leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {t('auth.verify_msg')} {'\n'}
                <Text className="font-bold text-emerald-500">{identifier}</Text>
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(800)} className="gap-8">
              <View className="items-center">
                <OTPInput value={otp} onChange={setOtp} error={error} className="justify-center" />
                
                <View className="mt-6 items-center">
                  {error ? (
                    <Text className="text-rose-500 text-sm font-bold">{error}</Text>
                  ) : noticeKey ? (
                    <Text className="text-amber-500 text-sm font-bold text-center">
                      {t(`errors.${noticeKey}`)}
                    </Text>
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <Feather name="clock" size={14} color={isDark ? '#A1A1AA' : '#71717A'} />
                      <Text className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {t('auth.otp_expires_in')}: {formatTime(otpExpiry)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Button
                label={confirmCooldown > 0 ? `${t('common.confirm')} (${confirmCooldown}s)` : t('common.confirm')}
                onPress={handleVerify}
                loading={loading}
                disabled={otp.length < 6 || otpExpiry === 0 || confirmCooldown > 0}
                fullWidth
                size="lg"
              />

              <View className="flex-row items-center justify-center mt-4">
                <Text className={`text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {t('auth.not_received')}{' '}
                </Text>
                <Pressable onPress={handleResend} disabled={countdown > 0}>
                  <Text 
                    style={{ color: countdown > 0 ? (isDark ? '#52525B' : '#A1A1AA') : '#10B981' }} 
                    className="text-base font-bold underline"
                  >
                    {countdown > 0 ? `${t('auth.resend_after')} ${countdown}s` : t('auth.resend_now')}
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
