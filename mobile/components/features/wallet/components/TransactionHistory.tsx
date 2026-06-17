import React from 'react'
import { View, Pressable, ActivityIndicator } from 'react-native'
import { MotiView } from '@/src/lib/moti'
import { Feather } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { formatCurrency, formatDate } from '@/src/utils/format'
import { cn } from '@/src/lib/utils'

import { useTranslation } from 'react-i18next'

interface TransactionHistoryProps {
  txData: any
  isLoadingTx: boolean
  isDark: boolean
}

export function TransactionHistory({ txData, isLoadingTx, isDark }: TransactionHistoryProps) {
  const { t } = useTranslation()
  return (
    <View className="px-6 mt-12 mb-10">
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t('wallet_screen.history', 'Lịch sử giao dịch')}
        </Text>
        <Pressable>
          <Text className="text-xs font-bold text-emerald-500">{t('wallet_screen.view_all', 'Xem tất cả')}</Text>
        </Pressable>
      </View>

      <View className="gap-4">
        {isLoadingTx ? (
          <ActivityIndicator color="#10b981" className="py-20" />
        ) : txData?.transactions?.length === 0 ? (
          <View className="py-20 items-center">
            <Feather name="inbox" size={32} color="#71717a" />
            <Text className="text-zinc-500 font-medium mt-2">{t('wallet_screen.empty.history', 'Chưa có giao dịch nào')}</Text>
          </View>
        ) : (
          txData?.transactions?.map((tx: any, i: number) => (
            <MotiView
              key={tx.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: i * 50 }}
              style={{ borderRadius: 24, padding: 16 }}
              className="flex-row items-center bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-white/5"
            >
              <View className={cn(
                "w-12 h-12 rounded-xl items-center justify-center",
                tx.type === 'deposit' ? "bg-emerald-500/10" : 
                tx.type === 'purchase' ? "bg-blue-500/10" : "bg-amber-500/10"
              )}>
                <Feather 
                  name={tx.type === 'deposit' ? 'plus' : tx.type === 'purchase' ? 'shopping-cart' : 'repeat'} 
                  size={20} 
                  color={tx.type === 'deposit' ? '#10b981' : tx.type === 'purchase' ? '#3b82f6' : '#f59e0b'} 
                />
              </View>

              <View className="flex-1 ml-4">
                <Text className="font-bold text-zinc-900 dark:text-zinc-50 text-sm" numberOfLines={1}>
                  {tx.description || t(`wallet_screen.types.${tx.type}`)}
                </Text>
                <Text className="text-[10px] text-zinc-500 font-medium mt-0.5">
                    {formatDate(tx.created_at)}
                </Text>
              </View>

              <View className="items-end">
                <Text className={cn(
                  "font-bold text-base tracking-tighter",
                  tx.direction === 'in' || tx.type === 'deposit' ? "text-emerald-500" : "text-zinc-900 dark:text-zinc-50"
                )}>
                  {tx.direction === 'in' || tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount).split(' ')[0]}
                </Text>
                <Text className={cn(
                  "text-[8px] font-bold uppercase",
                  tx.status === 'completed' ? "text-emerald-500/60" : "text-amber-500/60"
                )}>
                  {t(`wallet_screen.status.${tx.status}`)}
                </Text>
              </View>
            </MotiView>
          ))
        )}
      </View>
    </View>
  )
}
