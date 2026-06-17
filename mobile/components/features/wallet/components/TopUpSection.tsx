import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Pressable, TextInput, ActivityIndicator } from 'react-native'
import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { formatCurrency } from '@/src/utils/format'
import { cn } from '@/src/lib/utils'

interface TopUpSectionProps {
  amount: string
  setAmount: (val: string) => void
  handleQuickAmount: (val: number) => void
  handleDeposit: () => void
  isDepositing: boolean
  isDark: boolean
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000]

export function TopUpSection({
  amount,
  setAmount,
  handleQuickAmount,
  handleDeposit,
  isDepositing,
  isDark
}: TopUpSectionProps) {
  const { t } = useTranslation()
  return (
    <View className="px-6 mt-10">
      <View 
        style={{ borderRadius: 32, padding: 32 }}
        className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5"
      >
        <View className="flex-row items-center justify-between mb-8">
            <Text className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {t('wallet_screen.top_up', 'Nạp tiền')}
            </Text>
            <Feather name="shield" size={18} color="#10b981" />
        </View>
        
        <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-5 ml-1">{t('wallet_screen.quick_top_up', 'Nạp nhanh')}</Text>
        <View className="flex-row flex-wrap gap-3">
          {QUICK_AMOUNTS.map((val) => (
            <Pressable
              key={val}
              onPress={() => handleQuickAmount(val)}
              className={cn(
                "px-6 py-4 rounded-2xl border",
                amount === val.toString()
                  ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20"
                  : isDark ? "bg-white/5 border-white/10" : "bg-white border-zinc-200"
              )}
            >
              <Text className={cn(
                "text-sm font-bold",
                amount === val.toString() ? "text-white" : isDark ? "text-zinc-400" : "text-zinc-600"
              )}>
                {formatCurrency(val)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-10">
          <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-4 ml-1">{t('wallet_screen.amount_label')}</Text>
          <View className={cn(
            "flex-row items-center h-20 rounded-3xl px-6 border",
            isDark ? "bg-black/20 border-white/10" : "bg-white border-zinc-100"
          )}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={t('wallet_screen.min_amount_hint')}
              placeholderTextColor={isDark ? '#333' : '#ccc'}
              keyboardType="numeric"
              className={cn(
                "flex-1 text-2xl font-bold",
                isDark ? "text-white" : "text-zinc-950"
              )}
            />
            <Text className="text-emerald-500 font-bold ml-2">VND</Text>
          </View>
        </View>

        <Pressable
          onPress={handleDeposit}
          disabled={isDepositing}
          className={cn(
            "h-20 rounded-3xl bg-emerald-500 items-center justify-center mt-8 flex-row shadow-lg shadow-emerald-500/30",
            isDepositing && "opacity-60"
          )}
        >
          {isDepositing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <FontAwesome5 name="paypal" size={18} color="white" />
              <Text className="text-white font-bold text-lg ml-3">
                {t('wallet_screen.confirm_top_up', 'Xác nhận nạp tiền')}
              </Text>
            </>
          )}
        </Pressable>
        
        <Text className="text-center text-[10px] text-zinc-500 font-medium mt-5">
            {t('wallet_screen.paypal_info', 'Thanh toán an toàn qua PayPal')}
        </Text>
      </View>
    </View>
  )
}
