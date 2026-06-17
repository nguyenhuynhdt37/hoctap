import React from 'react'
import { View, Pressable } from 'react-native';
import { Button } from '../../../ui'
import { ChevronRight, ChevronLeft } from 'lucide-react-native'
import { MotiView } from 'moti'
import { useTranslation } from 'react-i18next'

interface ProfileNavigationProps {
  step: number
  handleBack: () => void
  handleNext: () => void
  handleSubmit: () => void
  isLoading: boolean
}

export function ProfileNavigation({
  step, handleBack, handleNext, handleSubmit, isLoading
}: ProfileNavigationProps) {
  const { t } = useTranslation()

  return (
    <MotiView
      className="flex-row mt-12 space-x-4"
      from={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 500 }}
    >
      {step > 1 && (
        <Pressable
          onPress={handleBack}
          className="w-16 h-16 rounded-full bg-white/10 dark:bg-zinc-900/50 items-center justify-center border border-zinc-200 dark:border-zinc-800 backdrop-blur-md"
        >
          <ChevronLeft size={24} color="#71717a" />
        </Pressable>
      )}
      <View className="flex-1">
        <Button
          label={step === 2 ? t('auth.profile.nav.finish') : t('auth.profile.nav.next')}
          onPress={step === 2 ? handleSubmit : handleNext}
          loading={isLoading}
          size="lg"
          className="rounded-full shadow-2xl shadow-emerald-500/30"
          iconName={step < 2 ? "chevron-right" : undefined}
          iconFamily="feather"
        />
      </View>
    </MotiView>
  )
}
