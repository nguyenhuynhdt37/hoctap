import React from 'react'
import { View, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { MotiView } from 'moti'
import { ChevronLeft } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

// Sub-sections
import { BasicInfoSection } from './edit-form/BasicInfoSection'
import { EducationSection } from './edit-form/EducationSection'
import { SkillsInterestsSection } from './edit-form/SkillsInterestsSection'
import { GoalsSection } from './edit-form/GoalsSection'

interface Props {
  data: {
    fullname: string;
    bio: string;
    avatar: string | null;
    birthday: string | null;
    facebook_url: string | null;
    conscious: string | null;
    district: string | null;
    citizenship_identity: string | null;
    specializations: any[];
    interest_ids: string[];
    daily_goal_minutes: number;
    preferred_learning_style: string;
  }
  onChange: (key: string, value: any) => void
  onSave: () => void
  onCancel: () => void
  loading: boolean
  hasChanges: boolean
}

export function EditProfileForm({ data, onChange, onSave, onCancel, loading, hasChanges }: Props) {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <View
        className={`flex-row items-center justify-between px-6 pb-6 border-b z-10 ${isDark ? 'bg-zinc-950 border-white/5' : 'bg-white border-zinc-100'} ${Platform.OS === 'ios' ? 'pt-[60px]' : 'pt-6'}`}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onCancel()
          }}
          className={`w-11 h-11 rounded-full items-center justify-center border ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}
        >
          <ChevronLeft size={22} color={isDark ? '#fff' : '#09090b'} strokeWidth={2.5} />
        </Pressable>
        <Text className={`text-xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {t('profile_screen.edit_profile')}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onSave()
          }}
          disabled={loading || !hasChanges}
          className={`px-6 py-3 rounded-full ${!hasChanges ? 'opacity-30 bg-zinc-400' : (loading ? 'bg-zinc-200' : 'bg-emerald-500')}`}
        >
          <Text className="text-white font-black text-xs uppercase tracking-[0.2em]">
            {loading ? '...' : t('profile_screen.actions.save')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}
      >
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring' }}
          className="px-6 pt-10 gap-16"
        >
          <BasicInfoSection data={data} onChange={onChange} />

          <EducationSection
            specializations={data.specializations}
            onChange={(val) => onChange('specializations', val)}
          />

          <SkillsInterestsSection
            specializations={data.specializations}
            onChangeSpecializations={(val) => onChange('specializations', val)}
            interestIds={data.interest_ids}
            onChangeInterests={(val) => onChange('interest_ids', val)}
          />

          <GoalsSection
            data={{
              learning_goals: (data as any).learning_goals || '',
              daily_goal_minutes: (data as any).daily_goal_minutes || 30,
              preferred_learning_style: (data as any).preferred_learning_style || 'video',
            }}
            onChange={onChange}
          />

          {/* Bottom Spacing */}
          <View className="h-20" />
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

