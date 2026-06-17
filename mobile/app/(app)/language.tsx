import React from 'react'
import { View, Pressable, ScrollView, StyleSheet, Platform } from 'react-native'
import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/layout/Screen'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { MotiView } from 'moti'
import { authService } from '@/src/services/auth.service'
import { useAuthStore } from '@/src/stores/auth.store'
import { useThemeStore } from '@/src/stores/theme.store'
import { BackButton } from '@/components/ui/BackButton'

const LANGUAGES = [
  { 
    code: 'vi', 
    label: 'Tiếng Việt', 
    native: 'Vietnamese', 
    flag: '🇻🇳', 
    desc: 'Bản dịch hoàn thiện nhất'
  },
  { 
    code: 'en', 
    label: 'English', 
    native: 'English', 
    flag: '🇺🇸', 
    desc: 'Native learning experience'
  },
]

const THEMES = [
  { id: 'light', label: 'Sáng', icon: 'sunny-outline' },
  { id: 'dark', label: 'Tối', icon: 'moon-outline' },
]

const LANGUAGE_KEY = 'user-language'

export default function LanguageScreen() {
  const router = useRouter()
  const { i18n, t } = useTranslation()
  const { colorScheme, setColorScheme } = useColorScheme()
  const setPreference = useThemeStore(s => s.setPreference)
  const isDark = colorScheme === 'dark'
  const { user, setUser } = useAuthStore()

  const currentLang = i18n.language

  const handleSelectLang = async (code: string) => {
    if (code === currentLang) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await i18n.changeLanguage(code)
      await AsyncStorage.setItem(LANGUAGE_KEY, code)
      if (user) {
        const { data } = await authService.updateProfile({
          fullname: user.fullname || '',
          bio: user.bio || '',
        })
        setUser(data)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleToggleTheme = async (theme: 'light' | 'dark') => {
    if (theme === colorScheme) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setColorScheme(theme)
    setPreference(theme)
  }

  return (
    <Screen safeArea={false} withTabBar={false}>
      <View style={[styles.header, { backgroundColor: isDark ? '#09090b' : '#fff' }]}>
        <BackButton />
        <Text style={{ color: isDark ? '#fff' : '#09090b' }} className="text-lg font-bold">
          {t('profile_screen.language')} & UI
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pt-6">
          
          {/* Language Section */}
          <View className="mb-8">
            <Text className="text-emerald-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-5 ml-1">
              Chọn ngôn ngữ
            </Text>

            <View className="gap-3">
              {LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code
                return (
                  <Pressable 
                    key={lang.code}
                    onPress={() => handleSelectLang(lang.code)}
                  >
                    <View
                      style={[
                        styles.langCard, 
                        { 
                          backgroundColor: isDark ? '#18181b' : '#fff',
                          borderColor: isSelected ? '#10b981' : (isDark ? '#27272a' : '#f4f4f5')
                        }
                      ]}
                    >
                      <View style={[styles.flagBox, { backgroundColor: isDark ? '#27272a' : '#f8f9fa' }]}>
                        <Text style={{ fontSize: 20 }}>{lang.flag}</Text>
                      </View>

                      <View className="flex-1 ml-4">
                        <Text style={{ color: isDark ? '#fff' : '#09090b' }} className="text-[15px] font-bold">
                          {lang.label}
                        </Text>
                        <Text className="text-zinc-500 text-[12px] mt-0.5">{lang.desc}</Text>
                      </View>

                      {isSelected && (
                        <View className="bg-emerald-500 w-5 h-5 rounded-full items-center justify-center">
                          <Feather name="check" size={12} color="#fff" />
                        </View>
                      )}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* Theme Section */}
          <View className="mb-8">
            <Text className="text-emerald-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-5 ml-1">
              Giao diện
            </Text>

            <View className="flex-row gap-3">
              {THEMES.map((theme) => {
                const isSelected = colorScheme === theme.id
                return (
                  <Pressable 
                    key={theme.id} 
                    className="flex-1"
                    onPress={() => handleToggleTheme(theme.id as any)}
                  >
                    <View
                      style={[
                        styles.themeCard,
                        { 
                          backgroundColor: isDark ? '#18181b' : '#fff',
                          borderColor: isSelected ? '#10b981' : (isDark ? '#27272a' : '#f4f4f5')
                        }
                      ]}
                    >
                      <View style={[styles.themeIconBox, { backgroundColor: isSelected ? 'rgba(16,185,129,0.1)' : (isDark ? '#27272a' : '#f8f9fa') }]}>
                        <Ionicons 
                          name={theme.icon as any} 
                          size={20} 
                          color={isSelected ? '#10b981' : (isDark ? '#a1a1aa' : '#71717a')} 
                        />
                      </View>
                      <Text style={{ color: isSelected ? '#10b981' : (isDark ? '#fff' : '#09090b') }} className="text-sm font-bold mt-2">
                        {theme.label}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.03)' }]}>
            <View className="flex-row items-center gap-2 mb-1.5">
              <Ionicons name="cloud-done-outline" size={16} color="#10b981" />
              <Text className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px] tracking-[0.15em]">Đồng bộ tùy chỉnh</Text>
            </View>
            <Text className="text-zinc-500 dark:text-zinc-400 text-[12px] leading-5">
              Chúng tôi luôn ghi nhớ lựa chọn của bạn. Các tùy chỉnh giao diện được lưu cục bộ và đồng bộ hóa với tài khoản của bạn.
            </Text>
          </View>

        </MotiView>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  scroll: { paddingBottom: 40 },
  langCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 20, 
    borderWidth: 1,
  },
  flagBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  themeCard: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  themeIconBox: {
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  infoBox: {
    padding: 20,
    borderRadius: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.1)'
  }
})
