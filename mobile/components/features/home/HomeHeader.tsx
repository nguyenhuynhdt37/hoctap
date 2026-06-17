import React, { useRef } from 'react'
import { View, Pressable, Animated, Image } from 'react-native'
import { Text } from '@/components/ui'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { cn } from '@/src/lib/utils'
import { useAuthStore } from '@/src/stores/auth.store'
import { getFullImageUrl } from '@/src/utils/image'
import { useNotificationStore } from '@/src/stores/notification.store'
import { useRouter } from 'expo-router'

export function HomeHeader() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const fullName = user?.fullname || 'Bạn'
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const router = useRouter()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return t('common.greetings.morning')
    if (hour >= 12 && hour < 18) return t('common.greetings.afternoon')
    return t('common.greetings.evening')
  }

  return (
    <View className="flex-row items-center justify-between px-6 pt-5 pb-2.5">
      <View className="flex-row items-center flex-1">
        <View className="relative w-[60px] h-[60px] items-center justify-center">
          {/* Decorative Background Ring */}
          <View className="absolute w-[58px] h-[58px] rounded-full border-[1.5px] border-emerald-500 opacity-15" />

          <View className="w-[50px] h-[50px] rounded-full bg-emerald-50 dark:bg-zinc-800 overflow-hidden border-2 border-white dark:border-zinc-700">
            {user?.avatar ? (
              <Image
                source={{ uri: getFullImageUrl(user.avatar) as string }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Feather name="smile" size={26} color="#10b981" />
              </View>
            )}
          </View>

          {/* Status Badge */}
          <View className="absolute bottom-0.5 right-0.5 w-[18px] h-[18px] rounded-full bg-white dark:bg-zinc-900 items-center justify-center shadow-sm shadow-black elevation-sm">
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </View>
        </View>

        <View className="ml-3.5 justify-center flex-1">
          <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 -mb-0.5">{getGreeting()} 👋</Text>
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight" numberOfLines={1}>
            {fullName}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2.5">
        <HeaderButton icon="search" />
        <HeaderButton 
          icon="bell" 
          hasDot={unreadCount > 0} 
          count={unreadCount}
          onPress={() => router.push('/notifications')}
        />
      </View>
    </View>
  )
}

 function HeaderButton({ 
  icon, 
  hasDot, 
  count,
  onPress 
}: { 
  icon: keyof typeof Feather.glyphMap; 
  hasDot?: boolean; 
  count?: number;
  onPress?: () => void 
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 40,
      bounciness: 10,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 10,
    }).start()
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress?.()
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        className="w-12 h-12 rounded-full items-center justify-center border border-emerald-500/10 bg-emerald-500/[0.08] active:bg-emerald-500/15"
      >
        <Feather name={icon} size={22} color="#10b981" />
        {hasDot && (
          <View className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 border-2 border-white dark:border-zinc-950 items-center justify-center">
            <Text className="text-white text-[10px] font-bold">
              {count && count > 99 ? '99+' : count}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  )
}
