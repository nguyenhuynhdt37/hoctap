import React, { useEffect } from 'react'
import { View, Text, useColorScheme } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui'
import { authService } from '@/src/services/auth.service'
import { useAuthStore } from '@/src/stores/auth.store'

WebBrowser.maybeCompleteAuthSession()

export function SocialAuthFeature() {
  const router = useRouter()
  const { t } = useTranslation()
  const { saveTokens } = useAuthStore()
  const isDark = useColorScheme() === 'dark'

  // Ép cứng link chuẩn Expo Proxy theo yêu cầu của bạn
  const redirectUri = 'https://auth.expo.io/@nguyenhuynhdt37/neuralearn'

  // Google Auth Request
  const [request, response, promptAsync] =
    Google.useIdTokenAuthRequest({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
      redirectUri,
    })

  // Handle Google Response
  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token
      if (idToken) {
        handleGoogleLogin(idToken)
      }
    }
  }, [response])

  // Login Backend
  const handleGoogleLogin = async (idToken: string) => {
    try {
      const { data } = await authService.loginWithGoogle(idToken)
      await saveTokens(data)
      router.replace('/(app)')
    } catch (error) {
      console.error('Google Login Error:', error)
    }
  }

  return (
    <View className="w-full gap-4 mt-2">
      {/* Divider */}
      <View className="flex-row items-center gap-5">
        <View className={`flex-1 h-[1px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

        <Text className={`font-bold text-[10px] uppercase tracking-[3px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {t('auth.or')}
        </Text>

        <View className={`flex-1 h-[1px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
      </View>

      {/* Social Buttons */}
      <View className="gap-4">
        <Button
          label={t('auth.google_login')}
          variant="secondary"
          fullWidth
          onPress={() => promptAsync()}
          loading={!request}
          iconName="logo-google"
          iconFamily="ionicons"
        />

        <Button
          label={t('auth.github_login')}
          variant="secondary"
          fullWidth
          iconName="logo-github"
          iconFamily="ionicons"
        />
      </View>
    </View>
  )
}