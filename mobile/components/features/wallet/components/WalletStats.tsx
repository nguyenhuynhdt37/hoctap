import React from 'react'
import { View } from 'react-native'
import { MotiView } from '@/src/lib/moti'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { formatCurrency } from '@/src/utils/format'

import { useTranslation } from 'react-i18next'

interface WalletStatsProps {
  summary: any
}

export function WalletStats({ summary }: WalletStatsProps) {
  const { t } = useTranslation()
  return (
    <MotiView 
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      style={{ borderRadius: 32, padding: 16 }}
      className="mx-6 mt-8 flex-row items-center bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5"
    >
      <View className="flex-1 flex-row items-center px-4 py-3">
         <View className="w-10 h-10 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
            <Feather name="arrow-down-left" size={18} color="#10b981" />
         </View>
         <View>
            <Text className="text-zinc-500 text-[10px] font-bold uppercase">{t('wallet_screen.total_in', 'Tổng nạp')}</Text>
            <Text className="text-base font-bold text-emerald-500">{formatCurrency(summary?.total_in || 0)}</Text>
         </View>
      </View>
      <View className="w-[1px] h-10 bg-black/5 dark:bg-white/5" />
      <View className="flex-1 flex-row items-center px-4 py-3">
         <View className="w-10 h-10 rounded-full bg-rose-500/10 items-center justify-center mr-3">
            <Feather name="arrow-up-right" size={18} color="#f43f5e" />
         </View>
         <View>
            <Text className="text-zinc-500 text-[10px] font-bold uppercase">{t('wallet_screen.total_out', 'Tổng chi')}</Text>
            <Text className="text-base font-bold text-rose-500">{formatCurrency(summary?.total_out || 0)}</Text>
         </View>
      </View>
    </MotiView>
  )
}
