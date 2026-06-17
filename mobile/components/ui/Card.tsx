import React from 'react'
import { View, type ViewProps } from 'react-native'
import { cn } from '@/src/lib/utils'

export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        "rounded-[32px] bg-white/70 dark:bg-zinc-900/60 border border-white/50 dark:border-zinc-800 shadow-sm shadow-black/5 overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn("p-5 pb-3 gap-1", className)} {...props} />
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn("p-5 pt-0 gap-3", className)} {...props} />
}

export function CardFooter({ className, ...props }: ViewProps) {
  return <View className={cn("p-5 pt-0 flex-row items-center gap-3", className)} {...props} />
}
