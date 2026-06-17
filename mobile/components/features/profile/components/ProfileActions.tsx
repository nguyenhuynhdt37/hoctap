import React from 'react'
import { View, Pressable } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { MotiView } from 'moti'
import {
  User, Shield, Bell, Languages, HelpCircle, Info, ChevronRight,
  BookOpen, Heart, LayoutDashboard, MessageCircle, Settings,
  Wallet, FileText, History, RotateCcw, BadgePercent
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

const SECTIONS = [
  {
    title: 'account',
    items: [
      { Icon: User, key: 'edit_profile', action: 'edit' },
      { Icon: Shield, key: 'sections.settings', action: 'security' },
      { Icon: Settings, key: 'account_settings', action: 'account_settings' },
    ]
  },
  {
    title: 'preferences',
    items: [
      { Icon: Bell, key: 'notifications', action: 'notifications' },
      { Icon: Languages, key: 'language', action: 'language' },
    ]
  },
  {
    title: 'features',
    items: [
      { Icon: BookOpen, key: 'learning', action: 'learning', badge: null },
      { Icon: Heart, key: 'favorites', action: 'favorites', badge: null },
      { Icon: LayoutDashboard, key: 'instructor_dashboard', action: 'instructor', badge: null },
      { Icon: MessageCircle, key: 'messages', action: 'messages', badge: '1' },
      { Icon: Wallet, key: 'my_wallet', action: 'wallet', badge: null },
      { Icon: FileText, key: 'subscription', action: 'subscription', badge: null },
      { Icon: History, key: 'transaction_history', action: 'transactions', badge: null },
      { Icon: RotateCcw, key: 'refund_request', action: 'refund', badge: null },
    ]
  },
  {
    title: 'support',
    items: [
      { Icon: HelpCircle, key: 'help', action: 'help' },
      { Icon: Info, key: 'about_app', action: 'about' },
    ]
  }
]

interface MenuItemProps {
  Icon: any
  label: string
  badge?: string | null
  index: number
  total: number
  isDark: boolean
  onPress: () => void
}

function MenuItem({ Icon, label, badge, isDark, onPress }: MenuItemProps) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <MotiView
          animate={{
            scale: pressed ? 0.98 : 1,
            backgroundColor: pressed
              ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')
              : 'transparent'
          }}
          className="flex-row items-center gap-5 p-6"
        >
          <View className={`w-12 h-12 rounded-full items-center justify-center border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-zinc-100'}`}>
            <Icon size={20} color="#10b981" strokeWidth={2.5} />
          </View>

          <Text className={`flex-1 text-base font-bold tracking-tight ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {label}
          </Text>

          {badge && (
            <View className="w-6 h-6 rounded-full bg-red-500 items-center justify-center">
              <Text className="text-white text-xs font-black">{badge}</Text>
            </View>
          )}

          <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`}>
            <ChevronRight size={14} color={isDark ? '#52525b' : '#a1a1aa'} strokeWidth={3} />
          </View>
        </MotiView>
      )}
    </Pressable>
  )
}

export function ProfileActions({ onEdit }: { onEdit: () => void }) {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const router = useRouter()
  const isDark = colorScheme === 'dark'

  const handlers: Record<string, () => void> = {
    edit: onEdit,
    security: () => router.push('/settings'),
    language: () => router.push('/(app)/language' as any),
    // Coming soon features - show alert
    learning: () => { },
    favorites: () => router.push('/(app)/favorites' as any),
    instructor: () => { },
    messages: () => { },
    account_settings: () => { },
    wallet: () => router.push('/(app)/wallet' as any),
    subscription: () => { },
    transactions: () => router.push('/(app)/wallet' as any),
    refund: () => { },
  }

  return (
    <View className="px-6 mb-[100px]">
      {SECTIONS.map((section, sIdx) => (
        <MotiView
          key={section.title}
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 500 + sIdx * 100, type: 'spring' }}
          className="mb-10"
        >
          <View className="flex-row items-center mb-6 ml-3">
            <View className="w-1 h-3 bg-emerald-500 rounded-full mr-3" />
            <Text className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              {t(`profile_screen.sections.${section.title}`)}
            </Text>
            {section.label && (
              <View className="ml-auto mr-2">
                <View className={`px-3 py-1 rounded-full ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <Text className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                    {t(section.label)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View className={`rounded-[48px] overflow-hidden border ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'}`}>
            {section.items.map((item, iIdx) => {
              const label = item.key.includes('.')
                ? t(`profile_screen.${item.key}`)
                : t(`profile_screen.${item.key}`)

              return (
                <React.Fragment key={item.key}>
                  <MenuItem
                    Icon={item.Icon}
                    label={label}
                    badge={item.badge}
                    index={iIdx}
                    total={section.items.length}
                    isDark={isDark}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                      if (handlers[item.action]) {
                        handlers[item.action]()
                      }
                    }}
                  />

                  {iIdx < section.items.length - 1 && (
                    <View className={`h-[1px] mx-8 ${isDark ? 'bg-white/5' : 'bg-zinc-50'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </View>
        </MotiView>
      ))}
    </View>
  )
}



