import React, { memo, useState } from 'react'
import { View, Pressable, ActivityIndicator } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useQuery } from '@tanstack/react-query'
import { metaService } from '@/src/services/meta.service'
import Animated, { FadeInDown, Layout } from 'react-native-reanimated'
import { BookOpen, Check, CheckCircle } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

const EDUCATION_LEVELS = [
  'freshman_sophomore', 'junior_senior', 'graduated', 'working'
]

interface UserSpecialization {
  specialization_id: string
  level: string
  skill_ids: string[]
}

interface EducationSectionProps {
  specializations: UserSpecialization[]
  onChange: (value: UserSpecialization[]) => void
}

const SelectionItem = memo(({ 
  label, 
  selected, 
  onToggle,
  level,
  onSelectLevel,
  isExpanded,
  onToggleExpand
}: { 
  label: string, 
  selected: boolean, 
  onToggle: () => void,
  level?: string,
  onSelectLevel?: (l: string) => void,
  isExpanded?: boolean,
  onToggleExpand: () => void
}) => {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <View 
      className={`border-b last:border-b-0 ${isDark ? 'border-white/5' : 'border-zinc-100'}`}
    >
      <View className="flex-row items-center justify-between px-6 py-6">
        <Pressable 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onToggleExpand()
          }} 
          className="flex-1 flex-row items-center gap-4"
        >
          <View className={`w-8 h-8 rounded-full items-center justify-center ${selected ? 'bg-emerald-500' : (isDark ? 'bg-zinc-800' : 'bg-zinc-100')}`}>
            {selected ? <Check size={14} color="white" strokeWidth={3} /> : <View className="w-1 h-1 rounded-full bg-zinc-400" />}
          </View>
          <Text className={`text-base font-bold ${selected ? 'text-emerald-500' : (isDark ? 'text-zinc-200' : 'text-zinc-800')}`}>
            {label}
          </Text>
          {selected && !isExpanded && (
            <View className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <Text className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">
                {level ? t(`auth.profile.education.levels.${level}`) : t('common.select_level')}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {selected && isExpanded && (
        <Animated.View entering={FadeInDown} className="px-6 pb-8 gap-3">
          <View className="flex-row items-center mb-2 px-2">
            <View className="w-1 h-2 bg-emerald-500 rounded-full mr-2" />
            <Text className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Chọn trình độ</Text>
          </View>
          {EDUCATION_LEVELS.map((l) => (
            <Pressable 
              key={l} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                onSelectLevel?.(l)
              }}
              className={`flex-row items-center justify-between p-5 rounded-[24px] border ${level === l ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-100 dark:border-white/5'}`}
            >
              <Text className={`text-sm font-bold ${level === l ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                {t(`auth.profile.education.levels.${l}`)}
              </Text>
              {level === l && <CheckCircle size={18} color="#10b981" fill="#10b981" />}
            </Pressable>
          ))}
        </Animated.View>
      )}
    </View>
  )
})

export function EducationSection({ specializations, onChange }: EducationSectionProps) {
  const { t, i18n } = useTranslation()
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const currentLang = i18n.language?.startsWith('vi') ? 'vi' : 'en'

  const { data: remoteSpecs, isLoading } = useQuery({
    queryKey: ['specializations'],
    queryFn: metaService.getSpecializations
  })

  const [expandedId, setExpandedId] = useState<string | null>(
    specializations.length > 0 ? specializations[0].specialization_id : null
  )

  const toggleSpecialization = (id: string) => {
    const exists = specializations.find(s => s.specialization_id === id)
    if (exists) {
      onChange(specializations.filter(s => s.specialization_id !== id))
      if (expandedId === id) setExpandedId(null)
    } else {
      onChange([...specializations, { specialization_id: id, level: 'freshman_sophomore', skill_ids: [] }])
      setExpandedId(id)
    }
  }

  const updateLevel = (id: string, level: string) => {
    onChange(specializations.map(s => 
      s.specialization_id === id ? { ...s, level } : s
    ))
  }

  if (isLoading) {
    return (
      <View className="h-40 items-center justify-center">
        <ActivityIndicator color="#10b981" />
      </View>
    )
  }

  return (
    <View>
      <View className="flex-row items-center mb-6 px-1">
        <View className="w-6 h-6 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
          <BookOpen size={12} color="#10b981" strokeWidth={3} />
        </View>
        <Text className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
          {t('auth.profile.education.specialization')}
        </Text>
      </View>

      <Animated.View 
        layout={Layout.springify()} 
        className={`rounded-[48px] border overflow-hidden ${isDark ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-100'}`}
      >
        {remoteSpecs?.map((spec) => {
          const displayName = currentLang === 'vi' ? spec.name_vi : spec.name_en
          const specData = specializations.find(item => item.specialization_id === spec.id)
          const isSelected = !!specData
          
          return (
            <SelectionItem 
              key={spec.id}
              label={displayName}
              selected={isSelected}
              level={specData?.level}
              isExpanded={expandedId === spec.id && isSelected}
              onToggle={() => toggleSpecialization(spec.id)}
              onToggleExpand={() => {
                if (isSelected) {
                  setExpandedId(expandedId === spec.id ? null : spec.id)
                } else {
                  toggleSpecialization(spec.id)
                }
              }}
              onSelectLevel={(l) => updateLevel(spec.id, l)}
            />
          )
        })}
      </Animated.View>
    </View>
  )
}

