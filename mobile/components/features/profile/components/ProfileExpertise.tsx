import React from 'react'
import { View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useTranslation } from 'react-i18next'
import { User, UserSpecialization } from '@/src/types/auth'
import { useColorScheme } from 'nativewind'
import { MotiView } from 'moti'
import { GraduationCap, Award, BadgeCheck } from 'lucide-react-native'

export function ProfileExpertise({ user }: { user: User | null }) {
  const { t, i18n } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const isVI = i18n.language === 'vi'

  if (!user?.specializations?.length) return null

  return (
    <View className="px-6 mb-8">
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 200, type: 'spring' }}
      >
        <View className="flex-row items-center mb-6 ml-3">
          <View className="w-1 h-3 bg-emerald-500 rounded-full mr-3" />
          <Text className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
            {t('profile_screen.sections.expertise')}
          </Text>
        </View>
      </MotiView>

      {user.specializations.map((spec: UserSpecialization, i: number) => (
        <MotiView 
          key={i} 
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 300 + i * 100, type: 'spring' }}
          className={`p-7 rounded-[48px] border ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'} ${i > 0 ? 'mt-6' : ''}`}
        >
          <View className="flex-row items-center">
            <View className={`w-14 h-14 rounded-full items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <GraduationCap size={24} color="#10b981" strokeWidth={2} />
            </View>
            <View className="flex-1 ml-5">
              <Text className={`text-xl font-black tracking-tight leading-7 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {isVI ? spec.name_vi : spec.name_en}
              </Text>
              <View className="flex-row items-center mt-2">
                <BadgeCheck size={14} color="#10b981" />
                <Text className="text-emerald-500 font-black text-[11px] uppercase tracking-wider ml-2">
                  {t(`auth.profile.education.levels.${spec.level}`)}
                </Text>
              </View>
            </View>
          </View>

          {spec.skills && spec.skills.length > 0 && (
            <View className="flex-row flex-wrap gap-2.5 mt-7">
              {spec.skills.map((sk: any, j: number) => (
                <MotiView 
                  key={j} 
                  from={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 400 + j * 50, type: 'spring' }}
                  className={`px-5 py-2.5 rounded-full border ${isDark ? 'bg-zinc-800/50 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}
                >
                  <Text className={`font-bold text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {isVI ? sk.name_vi : sk.name_en}
                  </Text>
                </MotiView>
              ))}
            </View>
          )}
        </MotiView>
      ))}
    </View>
  )
}


