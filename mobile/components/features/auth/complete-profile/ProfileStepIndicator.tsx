import React from 'react'
import { View } from 'react-native'
import { Text } from '../../../ui'
import { useTranslation } from 'react-i18next'

interface ProfileStepIndicatorProps {
  step: number
  leftSlot?: React.ReactNode
  rightSlot?: React.ReactNode
}

export function ProfileStepIndicator({ step, leftSlot, rightSlot }: ProfileStepIndicatorProps) {
  const { t } = useTranslation()

  return (
    <View className="mb-10">
      <View className="flex-row items-center justify-between mb-4">
        <View className="w-1/4 items-start">
          {leftSlot}
        </View>

        <View className="flex-row items-center space-x-6">
          {[1, 2].map((i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${step === i
                  ? 'w-10 bg-emerald-500'
                  : step > i
                    ? 'w-5 bg-emerald-500'
                    : 'w-5 bg-zinc-200 dark:bg-zinc-800'
                }`}
              style={step === i ? {
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4
              } : undefined}
            />
          ))}
        </View>

        <View className="w-1/4 items-end">
          {rightSlot}
        </View>
      </View>

      <Text className="text-center text-zinc-500 dark:text-zinc-500 font-bold text-xs tracking-[2px] uppercase">
        {t('auth.profile.step_indicator', { current: step, total: 2 })}
      </Text>
    </View>
  )
}
