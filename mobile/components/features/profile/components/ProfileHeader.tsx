import React from 'react'
import { View, Pressable, ActivityIndicator, Image, Dimensions } from 'react-native'
import { getFullImageUrl } from '@/src/utils/image'
import { Text } from '@/components/ui/Text'
import { useRouter } from 'expo-router'
import { User } from '@/src/types/auth'
import { useColorScheme } from 'nativewind'
import { LinearGradient } from 'expo-linear-gradient'
import { MotiView } from 'moti'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Settings, Bell, Camera, ShieldCheck, Star, Zap } from 'lucide-react-native'

const { width } = Dimensions.get('window')

interface Props {
  user: User | null
  onPickImage: () => void
  onPickCover: () => void
  uploading: boolean
}

export function ProfileHeader({ user, onPickImage, onPickCover, uploading }: Props) {
  const { colorScheme } = useColorScheme()
  const insets = useSafeAreaInsets()
  const isDark = colorScheme === 'dark'
  const router = useRouter()
  const initials = (user?.fullname?.[0] || 'U').toUpperCase()

  return (
    <View className="mb-8">
      {/* Banner Background / Cover Image */}
      <View style={{ height: 220 + insets.top }} className="w-full relative overflow-hidden">
        {user?.avatar ? (
          <Image
            source={{ uri: getFullImageUrl(user.avatar) as string }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Image
            source={require('../../../../assets/images/default_cover.png')}
            className="w-full h-full"
            resizeMode="cover"
          />
        )}

        {/* Flat Minimalist Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent', isDark ? 'rgba(9,9,11,1)' : 'rgba(255,255,255,1)']}
          className="absolute inset-0"
        />

        {/* Edit Cover Button - Flat Pill */}
        <Pressable
          onPress={onPickCover}
          className="absolute bottom-10 right-6 px-4 py-2 rounded-full bg-black/40 flex-row items-center border border-white/20"
        >
          <Camera size={14} color="white" />
          <Text className="text-white text-xs font-bold uppercase tracking-widest ml-2">Edit Cover</Text>
        </Pressable>

        {/* Floating Controls - Flat Pill */}
        <View style={{ top: insets.top + 10 }} className="absolute left-6 right-6 flex-row justify-between items-center">
          <Pressable
            onPress={() => router.push('/settings')}
            className={`w-11 h-11 rounded-full items-center justify-center border ${isDark ? 'bg-black/30 border-white/10' : 'bg-white/40 border-white/20'}`}
          >
            <Settings size={18} color="white" />
          </Pressable>
          <View className={`w-11 h-11 rounded-full items-center justify-center border ${isDark ? 'bg-black/30 border-white/10' : 'bg-white/40 border-white/20'}`}>
            <Bell size={18} color="white" />
          </View>
        </View>
      </View>

      <View className="items-center -mt-[70px]">
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' }}
          className="w-[150px] h-[150px] items-center justify-center"
        >
          {/* Flat Ring */}
          <View
            style={{ borderColor: '#10b981' }}
            className="absolute w-[146px] h-[146px] rounded-full border border-dashed opacity-30"
          />

          <Pressable
            onPress={onPickImage}
            className={`w-[130px] h-[130px] rounded-full p-1 border-2 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}
          >
            <View className="w-full h-full rounded-full overflow-hidden">
              {user?.avatar ? (
                <Image source={{ uri: getFullImageUrl(user.avatar) as string }} className="w-full h-full" />
              ) : (
                <View className={`w-full h-full items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <Text className="text-5xl font-black text-zinc-300 dark:text-zinc-700">{initials}</Text>
                </View>
              )}
            </View>

            {uploading && (
              <View className="absolute inset-0 rounded-full bg-black/40 items-center justify-center">
                <ActivityIndicator color="white" />
              </View>
            )}

            <View className="absolute bottom-1 right-1 w-[38px] h-[38px] rounded-full bg-emerald-500 items-center justify-center border-4 border-white dark:border-zinc-900">
              <Camera size={16} color="white" fill="white" />
            </View>
          </Pressable>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200, type: 'spring' }}
          className="items-center mt-5"
        >
          <View className="flex-row items-center">
            <Text className={`text-4xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {user?.fullname || 'Neural Student'}
            </Text>
            <View className="ml-2 mt-2">
              <ShieldCheck size={20} color="#10b981" fill="#10b981" />
            </View>
          </View>

          <View className="flex-row items-center gap-2.5 mt-1.5">
            <Text className="text-zinc-400 dark:text-zinc-500 font-bold text-lg">{user?.email}</Text>
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <Text className="text-emerald-500 font-bold text-xs uppercase tracking-widest">Online</Text>
          </View>

          <View className="flex-row gap-3 mt-5">
            <View className={`flex-row items-center px-4 py-2 rounded-full border ${isDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'}`}>
              <Zap size={12} color="#10b981" fill="#10b981" />
              <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest ml-2">Pro Member</Text>
            </View>
            <View className={`flex-row items-center px-4 py-2 rounded-full border ${isDark ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50 border-amber-100'}`}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest ml-2">Top Learner</Text>
            </View>
          </View>
        </MotiView>
      </View>
    </View>
  )
}


