import React from 'react'
import { View, Text } from 'react-native'
import { cn } from '@/src/lib/utils'
import { Feather } from '@expo/vector-icons'

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'default'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  iconName?: keyof typeof Feather.glyphMap
  className?: string
}

const variants = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  success: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  danger:  { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground' },
}

export function Badge({ label, variant = 'default', iconName, className }: BadgeProps) {
  const v = variants[variant]

  return (
    <View className={cn("flex-row items-center gap-1 px-3 py-1 rounded-full", v.bg, className)}>
      {iconName && <Feather name={iconName} size={12} className={v.text} />}
      <Text className={cn("text-[11px] font-bold", v.text)}>
        {label}
      </Text>
    </View>
  )
}
