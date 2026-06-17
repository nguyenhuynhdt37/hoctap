import React from 'react'
import { View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { MotiView } from 'moti'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Zap, Flame, BookOpen, Star } from 'lucide-react-native'

const STATS = [
  { key: 'points', value: '1,240', Icon: Zap },
  { key: 'streak', value: '12', Icon: Flame },
  { key: 'courses', value: '5', Icon: BookOpen },
]

export function ProfileStats() {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <View className="px-6 mb-8">
      {/* Level Progress Section - Minimalist Glass (No Shadow) */}
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 200, type: 'spring' }}
        className={`rounded-[48px] overflow-hidden border ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'} mb-6`}
      >
        <BlurView intensity={isDark ? 20 : 0} tint={isDark ? 'dark' : 'default'} className="p-7">
          <View className="flex-row justify-between items-center mb-5">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-emerald-500 items-center justify-center">
                <Star size={18} color="white" fill="white" />
              </View>
              <View className="ml-4">
                <Text className={`font-black text-lg tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  Neural Pioneer
                </Text>
                <Text className="text-emerald-500 font-bold text-xs uppercase tracking-widest">
                  Level 12
                </Text>
              </View>
            </View>
            <Text className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {t('profile_screen.stats.next_level', { xp: 450 })}
            </Text>
          </View>
          
          <View className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`}>
            <LinearGradient
              colors={['#10b981', '#34d399']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: '65%' }}
              className="h-full rounded-full"
            />
          </View>
        </BlurView>
      </MotiView>

      {/* Main Stats Row - Minimalist Flat */}
      <View className="flex-row gap-4">
        {STATS.map((s, i) => (
          <MotiView
            key={s.key}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 300 + i * 100, type: 'spring' }}
            className={`flex-1 p-5 items-center rounded-[40px] border ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'}`}
          >
            <View className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <s.Icon size={22} color="#10b981" strokeWidth={2.5} />
            </View>
            <Text className={`text-xl font-black tracking-tighter mt-3 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {s.value}
            </Text>
            <Text className="text-zinc-500 dark:text-zinc-500 text-[9px] font-black uppercase tracking-widest text-center mt-0.5">
              {t(`profile_screen.stats.${s.key}`)}
            </Text>
          </MotiView>
        ))}
      </View>
    </View>
  )
}


