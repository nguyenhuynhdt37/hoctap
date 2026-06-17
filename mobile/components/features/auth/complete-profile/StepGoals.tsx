import React from 'react'
import { View, Pressable } from 'react-native';
import { Text } from '../../../ui/Text';
import { Input } from '../../../ui/Input';
import { Target } from 'lucide-react-native'
import { MotiView } from 'moti'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'

interface StepGoalsProps {
  goals: string
  setGoals: (v: string) => void
  dailyGoal: number
  setDailyGoal: (v: number) => void
  learningStyle: string
  setLearningStyle: (v: string) => void
  errors: Record<string, string>
  validateField: (name: string, value: string) => void
}

export function StepGoals({
  goals, setGoals, dailyGoal, setDailyGoal, learningStyle, setLearningStyle,
  errors, validateField
}: StepGoalsProps) {
  const { t } = useTranslation()

  const LEARNING_STYLES = [
    { id: 'video', label: t('auth.profile.goals.styles.video') },
    { id: 'reading', label: t('auth.profile.goals.styles.reading') },
    { id: 'practice', label: t('auth.profile.goals.styles.practice') },
  ]

  return (
    <View className="space-y-8">
      <Input 
        label={t('auth.profile.goals.goal_label')} 
        placeholder={t('auth.profile.goals.goal_placeholder')} 
        value={goals} 
        onChangeText={setGoals}
        onBlur={() => validateField('goals', goals)}
        error={errors.goals ? t(`errors.${errors.goals}`) : ''}
        multiline
        numberOfLines={3}
        leftSlot={<Target size={20} color="#10B981" />}
        className="rounded-3xl"
      />

      <View>
        <Text className="text-zinc-900 dark:text-zinc-50 font-bold mb-4 ml-1">{t('auth.profile.goals.daily_time')}</Text>
        <View className="flex-row items-center justify-between bg-white/10 dark:bg-zinc-900/50 p-6 rounded-full border border-zinc-200 dark:border-zinc-800 backdrop-blur-md">
        <Pressable 
          onPress={() => { setDailyGoal(Math.max(15, dailyGoal - 15)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
          className="bg-white dark:bg-zinc-800 w-12 h-12 rounded-full items-center justify-center shadow-sm"
        >
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">-</Text>
        </Pressable>
        <View className="items-center">
          <Text className="text-3xl font-extrabold text-emerald-500">{dailyGoal}</Text>
          <Text className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{t('auth.profile.goals.minutes')}</Text>
        </View>
        <Pressable 
          onPress={() => { setDailyGoal(dailyGoal + 15); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
          className="bg-emerald-500 w-12 h-12 rounded-full items-center justify-center"
          style={{
            shadowColor: '#10B981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4
          }}
        >
          <Text className="text-2xl font-bold text-white">+</Text>
        </Pressable>
        </View>
      </View>

      <View>
        <Text className="text-zinc-900 dark:text-zinc-50 font-bold mb-4 ml-1">{t('auth.profile.goals.style')}</Text>
        <View className="flex-row gap-2">
          {LEARNING_STYLES.map(style => (
          <Pressable 
            key={style.id}
            onPress={() => { setLearningStyle(style.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
            className={`flex-1 p-4 rounded-full border items-center ${
              learningStyle === style.id 
                ? 'bg-emerald-500 border-emerald-500' 
                : 'bg-white/10 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 backdrop-blur-md'
            }`}
            style={learningStyle === style.id ? {
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4
            } : undefined}
          >
            <Text className={`font-bold ${learningStyle === style.id ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {style.label}
            </Text>
          </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}
