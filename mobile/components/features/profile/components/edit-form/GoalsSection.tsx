import React from 'react'
import { View, Pressable } from 'react-native'
import { Text } from '@/components/ui/Text'
import { Input } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import * as Haptics from 'expo-haptics'
import { Target, Flag, Clock, Zap, PlayCircle, Book, Code, Plus, Minus } from 'lucide-react-native'

interface GoalsSectionProps {
  data: {
    learning_goals: string
    daily_goal_minutes: number
    preferred_learning_style: string
  }
  onChange: (key: string, value: any) => void
}

export function GoalsSection({ data, onChange }: GoalsSectionProps) {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  const LEARNING_STYLES = [
    { id: 'video', label: t('auth.profile.goals.styles.video'), Icon: PlayCircle },
    { id: 'reading', label: t('auth.profile.goals.styles.reading'), Icon: Book },
    { id: 'practice', label: t('auth.profile.goals.styles.practice'), Icon: Code },
  ]

  return (
    <View className="gap-12">
      {/* Learning Goals */}
      <View>
        <View className="flex-row items-center mb-6 px-1">
          <View className="w-6 h-6 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
            <Target size={12} color="#10b981" strokeWidth={3} />
          </View>
          <Text className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
            {t('profile_screen.fields.goals_section_title')}
          </Text>
        </View>
        <Input
          label={t('profile_screen.fields.learning_goals')}
          labelStyle={{ fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, color: '#10b981', marginBottom: 8 }}
          value={data.learning_goals}
          onChangeText={v => onChange('learning_goals', v)}
          placeholder={t('profile_screen.fields.goals_placeholder')}
          multiline
          numberOfLines={3}
          className="rounded-[32px] h-32 px-6 pt-5 border-zinc-100 dark:border-white/5"
          leftSlot={
            <View className="pt-1">
              <Flag size={18} color={isDark ? '#3f3f46' : '#d4d4d8'} strokeWidth={2.5} />
            </View>
          }
        />
      </View>

      {/* Daily Goal */}
      <View>
        <View className="flex-row items-center mb-6 px-1">
          <View className="w-6 h-6 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
            <Clock size={12} color="#10b981" strokeWidth={3} />
          </View>
          <Text className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
            {t('auth.profile.goals.daily_time')}
          </Text>
        </View>
        <View className={`flex-row items-center justify-between p-8 rounded-[48px] border ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'}`}>
          <Pressable 
            onPress={() => { 
              onChange('daily_goal_minutes', Math.max(15, data.daily_goal_minutes - 15))
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) 
            }}
            className={`w-12 h-12 rounded-full items-center justify-center border ${isDark ? 'bg-zinc-800 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}
          >
            <Minus size={20} color={isDark ? 'white' : 'black'} strokeWidth={3} />
          </Pressable>
          
          <View className="items-center">
            <Text className="text-5xl font-black text-emerald-500 tracking-tighter">{data.daily_goal_minutes}</Text>
            <Text className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">{t('auth.profile.goals.minutes')}</Text>
          </View>
          
          <Pressable 
            onPress={() => { 
              onChange('daily_goal_minutes', data.daily_goal_minutes + 15)
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) 
            }}
            className="bg-emerald-500 w-12 h-12 rounded-full items-center justify-center"
          >
            <Plus size={20} color="white" strokeWidth={3} />
          </Pressable>
        </View>
      </View>

      {/* Learning Style */}
      <View>
        <View className="flex-row items-center mb-6 px-1">
          <View className="w-6 h-6 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
            <Zap size={12} color="#10b981" strokeWidth={3} />
          </View>
          <Text className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
            {t('auth.profile.goals.style')}
          </Text>
        </View>
        <View className="flex-row gap-4">
          {LEARNING_STYLES.map(({ id, label, Icon }) => (
            <Pressable 
              key={id}
              onPress={() => { 
                onChange('preferred_learning_style', id)
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) 
              }}
              className={`flex-1 p-6 rounded-[32px] border items-center gap-3 ${
                data.preferred_learning_style === id 
                  ? 'bg-emerald-500 border-emerald-500' 
                  : `bg-zinc-50 dark:bg-zinc-900/30 border-zinc-100 dark:border-white/5`
              }`}
            >
              <Icon 
                size={20} 
                color={data.preferred_learning_style === id ? '#fff' : (isDark ? '#3f3f46' : '#d4d4d8')} 
                strokeWidth={2.5}
              />
              <Text className={`text-[10px] font-black uppercase tracking-tight ${data.preferred_learning_style === id ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}

