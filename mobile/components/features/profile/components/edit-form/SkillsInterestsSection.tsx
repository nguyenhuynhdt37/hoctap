import React from 'react'
import { View, Pressable, ActivityIndicator } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useQuery } from '@tanstack/react-query'
import { metaService } from '@/src/services/meta.service'
import * as Haptics from 'expo-haptics'
import { MotiView } from 'moti'
import { Cpu, Heart, Check } from 'lucide-react-native'

interface UserSpecialization {
  specialization_id: string
  level: string
  skill_ids: string[]
}

interface SkillsInterestsSectionProps {
  specializations: UserSpecialization[]
  onChangeSpecializations: (value: UserSpecialization[]) => void
  interestIds: string[]
  onChangeInterests: (value: string[]) => void
}

export function SkillsInterestsSection({ 
  specializations, 
  onChangeSpecializations, 
  interestIds, 
  onChangeInterests 
}: SkillsInterestsSectionProps) {
  const { t, i18n } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const currentLang = i18n.language?.startsWith('vi') ? 'vi' : 'en'

  const { data: remoteSpecs, isLoading: specsLoading } = useQuery({
    queryKey: ['specializations'],
    queryFn: metaService.getSpecializations
  })

  const { data: remoteInterests, isLoading: interestsLoading } = useQuery({
    queryKey: ['interests'],
    queryFn: metaService.getInterests
  })

  const toggleSkill = (specId: string, skillId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onChangeSpecializations(specializations.map(s => {
      if (s.specialization_id === specId) {
        const skillIds = s.skill_ids || []
        return {
          ...s,
          skill_ids: skillIds.includes(skillId) 
            ? skillIds.filter(i => i !== skillId) 
            : [...skillIds, skillId]
        }
      }
      return s
    }))
  }

  const toggleInterest = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const currentList = interestIds || []
    if (currentList.includes(id)) {
      onChangeInterests(currentList.filter(i => i !== id))
    } else {
      onChangeInterests([...currentList, id])
    }
  }

  if (specsLoading || interestsLoading) {
    return (
      <View className="h-40 items-center justify-center">
        <ActivityIndicator color="#10b981" />
      </View>
    )
  }

  return (
    <View className="gap-12">
      {/* Skills per Specialization */}
      {specializations.length > 0 && (
        <View>
          <View className="flex-row items-center mb-6 px-1">
            <View className="w-6 h-6 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
              <Cpu size={12} color="#10b981" strokeWidth={3} />
            </View>
            <Text className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
              {t('auth.profile.skills.skills_label')}
            </Text>
          </View>

          <View className="gap-10">
            {specializations.map((spec) => {
              const remoteSpec = remoteSpecs?.find(rs => rs.id === spec.specialization_id)
              const specName = currentLang === 'vi' ? remoteSpec?.name_vi : remoteSpec?.name_en
              const availableSkills = remoteSpec?.skills || []

              return (
                <View key={spec.specialization_id}>
                  <View className="flex-row items-center gap-3 mb-5 px-1">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <Text className={`font-black text-sm tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {specName} <Text className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest ml-2">[{t(`auth.profile.education.levels.${spec.level}`)}]</Text>
                    </Text>
                  </View>
                  
                  <View className="flex-row flex-wrap gap-2.5">
                    {availableSkills.map(skill => {
                      const skillName = currentLang === 'vi' ? skill.name_vi : skill.name_en
                      const isSelected = (spec.skill_ids || []).includes(skill.id)
                      return (
                        <Pressable 
                          key={skill.id}
                          onPress={() => toggleSkill(spec.specialization_id, skill.id)}
                          className={`px-5 py-3 rounded-full border ${
                            isSelected 
                              ? 'bg-emerald-500 border-emerald-500' 
                              : `bg-zinc-50 dark:bg-zinc-900/30 border-zinc-100 dark:border-white/5`
                          }`}
                        >
                          <View className="flex-row items-center gap-2">
                            <Text className={`text-xs font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                              {skillName}
                            </Text>
                            {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                          </View>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* General Interests */}
      <View>
        <View className="flex-row items-center mb-6 px-1">
          <View className="w-6 h-6 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
            <Heart size={12} color="#10b981" strokeWidth={3} />
          </View>
          <Text className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
            {t('auth.profile.skills.interests_label')}
          </Text>
        </View>
        
        <View className="flex-row flex-wrap gap-2.5">
          {remoteInterests?.map(interest => {
            const interestName = currentLang === 'vi' ? interest.name_vi : interest.name_en
            const isSelected = interestIds.includes(interest.id)
            return (
              <Pressable 
                key={interest.id}
                onPress={() => toggleInterest(interest.id)}
                className={`px-6 py-3.5 rounded-full border ${
                  isSelected 
                    ? 'bg-emerald-500 border-emerald-500' 
                    : `bg-zinc-50 dark:bg-zinc-900/30 border-zinc-100 dark:border-white/5`
                }`}
              >
                <Text className={`text-xs font-black uppercase tracking-widest ${isSelected ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {interestName}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

