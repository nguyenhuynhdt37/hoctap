import React from 'react'
import { View, ScrollView, Switch, Pressable, Image, Alert } from 'react-native'
import { Screen } from '@/components/layout/Screen'
import { Text } from '@/components/ui/Text'
import { router } from 'expo-router'
import { BackButton } from '@/components/ui/BackButton'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from 'nativewind'
import { MotiView } from 'moti'
import { useAuthStore } from '@/src/stores/auth.store'
import { authService } from '@/src/services/auth.service'
import { getFullImageUrl } from '@/src/utils/image'
import {
  ShieldCheck,
  Key,
  Bell,
  Globe,
  Moon,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Shield,
  Zap,
  Smartphone
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { LoggedDevicesModal } from './LoggedDevicesModal'

export function SettingsFeature() {
  const insets = useSafeAreaInsets()
  const { colorScheme, setColorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const { user, logout } = useAuthStore()
  const { t } = useTranslation()
  const [sessionsVisible, setSessionsVisible] = React.useState(false)

  const SettingItem = ({ Icon, label, subLabel, onPress, rightElement }: any) => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress?.()
      }}
      className="flex-row items-center p-6 active:bg-zinc-50 dark:active:bg-white/5"
    >
      <View className={`w-12 h-12 rounded-full items-center justify-center border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
        <Icon size={20} color="#10b981" strokeWidth={2.5} />
      </View>
      <View className="flex-1 ml-5">
        <Text className={`text-base font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{label}</Text>
        {subLabel && <Text className="text-xs font-medium text-zinc-500 mt-0.5">{subLabel}</Text>}
      </View>
      {rightElement || (
        <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`}>
          <ChevronRight size={14} color={isDark ? '#52525b' : '#a1a1aa'} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  )

  const Section = ({ title, children, delay = 0 }: any) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay, type: 'spring' }}
      className="mb-10"
    >
      <View className="flex-row items-center mb-6 ml-3">
        <View className="w-1 h-3 bg-emerald-500 rounded-full mr-3" />
        <Text className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{title}</Text>
      </View>
      <View className={`rounded-[48px] border overflow-hidden ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'}`}>
        {children}
      </View>
    </MotiView>
  )

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      t('auth.profile.logout_confirm.title', 'Đăng xuất'),
      t('auth.profile.logout_confirm.description', 'Bạn có chắc chắn muốn đăng xuất?'),
      [
        { text: t('common.cancel', 'Hủy'), style: 'cancel' },
        {
          text: t('auth.profile.logout_confirm.confirm', 'Đăng xuất'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    )
  }

  const handleLogoutOtherDevices = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSessionsVisible(true)
  }

  return (
    <Screen safeArea={false}>
      {/* Header - Flat Minimalist */}
      <View style={{ height: 120 + insets.top }} className="w-full relative overflow-hidden">
        <LinearGradient
          colors={isDark ? ['rgba(16,185,129,0.2)', 'transparent'] : ['rgba(16,185,129,0.1)', 'transparent']}
          className="absolute inset-0"
        />

        <View style={{ top: insets.top + 10 }} className="absolute left-6 right-6 flex-row items-center">
          <BackButton />
          <Text className={`text-3xl font-black ml-5 tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {t('profile_screen.sections.settings', 'Cài đặt')}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Center Card - Flat Embossed */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 200, type: 'spring' }}
          className={`p-8 rounded-[48px] mb-10 border ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'}`}
        >
          <View className="flex-row items-center mb-4">
            <View className={`w-10 h-10 rounded-full items-center justify-center bg-emerald-500`}>
              <ShieldCheck size={20} color="white" fill="white" />
            </View>
            <Text className="text-sm font-bold text-emerald-500 uppercase tracking-widest ml-4">Account Center</Text>
          </View>

          <Text className={`text-sm font-medium leading-6 mb-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Quản lý trải nghiệm kết nối và cài đặt bảo mật trên NeuralEarn.
          </Text>

          <Pressable
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            className={`flex-row items-center p-5 rounded-[32px] border ${isDark ? 'bg-zinc-800/50 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}
          >
            <View className="w-14 h-14 rounded-full overflow-hidden mr-4 border-2 border-white dark:border-zinc-900">
              {user?.avatar ? (
                <Image source={{ uri: getFullImageUrl(user.avatar) as string }} className="w-full h-full" />
              ) : (
                <View className="w-full h-full bg-zinc-200 dark:bg-zinc-800 items-center justify-center">
                  <Text className="text-xl font-black text-zinc-400">{(user?.fullname?.[0] || 'U').toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{user?.fullname || 'Neural Student'}</Text>
              <Text className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-1">Thông tin cá nhân & Bảo mật</Text>
            </View>
            <ChevronRight size={18} color="#a1a1aa" />
          </Pressable>
        </MotiView>

        {/* Security Section */}
        <Section title="Bảo mật" delay={400}>
          <SettingItem
            Icon={Key}
            label="Mật khẩu"
            subLabel="Thay đổi mật khẩu, xác thực 2 lớp"
            onPress={() => { }}
          />
          <View className={`h-[1px] mx-8 ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`} />
          <SettingItem
            Icon={Shield}
            label="Kiểm tra bảo mật"
            subLabel="Trạng thái tài khoản: An toàn"
            onPress={() => { }}
          />
          <View className={`h-[1px] mx-8 ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`} />
          <SettingItem
            Icon={Smartphone}
            label="Thiết bị đăng nhập"
            subLabel="Xem và đăng xuất các thiết bị khác"
            onPress={handleLogoutOtherDevices}
          />
        </Section>

        {/* Preferences Section */}
        <Section title="Tùy chọn" delay={600}>
          <SettingItem
            Icon={Bell}
            label="Thông báo"
            onPress={() => { }}
          />
          <View className={`h-[1px] mx-8 ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`} />
          <SettingItem
            Icon={Globe}
            label="Ngôn ngữ"
            onPress={() => router.push('/language')}
          />
          <View className={`h-[1px] mx-8 ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`} />
          <SettingItem
            Icon={Moon}
            label="Chế độ tối"
            rightElement={
              <Switch
                value={isDark}
                onValueChange={v => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  setColorScheme(v ? 'dark' : 'light')
                }}
                trackColor={{ false: '#e4e4e7', true: '#10b981' }}
                thumbColor="#fff"
              />
            }
          />
        </Section>

        {/* Info Section */}
        <Section title="Hỗ trợ" delay={800}>
          <SettingItem
            Icon={HelpCircle}
            label="Trợ giúp"
            onPress={() => { }}
          />
          <View className={`h-[1px] mx-8 ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`} />
          <SettingItem
            Icon={FileText}
            label="Điều khoản"
            onPress={() => { }}
          />
        </Section>

        {/* Danger Zone */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1000, type: 'spring' }}
          className="mt-4"
        >
          <Pressable
            onPress={handleLogout}
            className={`flex-row items-center justify-center p-6 rounded-full border ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-100'} active:opacity-70`}
          >
            <LogOut size={18} color="#ef4444" strokeWidth={2.5} />
            <Text className="ml-3 text-sm font-bold uppercase tracking-wide text-red-500">
              Đăng xuất
            </Text>
          </Pressable>
        </MotiView>

        <View className="mt-12 items-center">
          <View className="flex-row items-center mb-2">
            <Zap size={10} color="#10b981" fill="#10b981" />
            <Text className="text-xs font-bold text-emerald-500 uppercase tracking-widest ml-2">NeuralEarn</Text>
          </View>
          <Text className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Version 2.0.26 Premium</Text>
        </View>
      </ScrollView>

      <LoggedDevicesModal
        visible={sessionsVisible}
        onClose={() => setSessionsVisible(false)}
      />
    </Screen>
  )
}
